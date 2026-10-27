import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { cloudConfigured, getPayTrackClient, readAccount, writeAccount } from './cloud';
import { Store, validateStore } from './model';

function message(error: unknown): string {
  const value = error as { message?: string; code?: string };
  if (value?.code === '42P01' || value?.code === 'PGRST202') return 'The PayTrack database is not set up yet. Apply the supplied Supabase migration.';
  return value?.message || 'Unable to reach private sync. Check your connection and try again.';
}

export function usePayTrack() {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<Store | null>(null);
  const [loading, setLoading] = useState(cloudConfigured);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const identity = useRef<User | null | undefined>(undefined);
  const generation = useRef(0);
  const revision = useRef<number | null>(null);
  const savingRef = useRef(false);
  const loadingRef = useRef(false);
  const needsReload = useRef(false);
  const lastReload = useRef(0);
  const mounted = useRef(false);

  const reload = useCallback(async () => {
    const current = identity.current;
    if (!current || savingRef.current || loadingRef.current) return;
    const token = generation.current;
    loadingRef.current = true;
    try {
      const fresh = await readAccount(current.id);
      if (!mounted.current || token !== generation.current) return;
      revision.current = fresh.revision;
      setState(fresh.data);
      setError(null);
      setConflict(false);
      needsReload.current = false;
      lastReload.current = Date.now();
    } catch (reason) {
      if (mounted.current && token === generation.current) setError(message(reason));
      throw new Error(message(reason));
    } finally {
      if (token === generation.current) {
        loadingRef.current = false;
        if (mounted.current) setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!cloudConfigured) return () => { mounted.current = false; };
    const db = getPayTrackClient();
    let disposed = false;
    let authEventSeen = false;
    const applyUser = (next: User | null) => {
      if (disposed || !mounted.current) return;
      const unchanged = identity.current !== undefined && identity.current?.id === next?.id;
      if (unchanged) { setUser(next); return; }
      generation.current += 1;
      identity.current = next;
      revision.current = null;
      loadingRef.current = false;
      savingRef.current = false;
      needsReload.current = false;
      setSaving(false);
      setUser(next);
      setState(null);
      setError(null);
      setConflict(false);
      setLoading(Boolean(next));
      if (next) void reload().catch(() => {});
    };
    // Defer outside the auth callback so Supabase can release its session lock.
    const { data: listener } = db.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      queueMicrotask(() => applyUser(session?.user || null));
    });
    db.auth.getSession().then(({ data, error: authError }) => {
      if (disposed || !mounted.current || authEventSeen) return;
      if (authError) { setError(message(authError)); setLoading(false); }
      else applyUser(data.session?.user || null);
    }).catch(reason => {
      if (!disposed && mounted.current && !authEventSeen) { setError(message(reason)); setLoading(false); }
    });
    const refresh = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastReload.current > 2000) void reload().catch(() => {});
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      disposed = true;
      mounted.current = false;
      generation.current += 1;
      identity.current = undefined;
      loadingRef.current = false;
      listener.subscription.unsubscribe();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [reload]);

  // Capture the revision associated with the rendered records. In particular, an
  // upload that started before a focus-refresh must not use the newer revision
  // to save an older snapshot after the upload finishes.
  const renderedRevision = revision.current;
  const renderedUserId = user?.id;
  const renderedGeneration = generation.current;
  const save = useCallback(async (next: Store) => {
    if (!identity.current || revision.current === null) throw new Error('Sign in and load your records before saving.');
    if (!renderedUserId || identity.current.id !== renderedUserId || renderedGeneration !== generation.current) throw new Error('Your account changed while this edit was open. Reopen the form before saving.');
    if (needsReload.current) throw new Error('Reload your records to confirm the previous save before making another change.');
    if (savingRef.current) throw new Error('Your previous change is still saving. Please wait.');
    if (loadingRef.current) throw new Error('Your records are refreshing. Please try the change again.');
    const verified = validateStore(next);
    const token = generation.current;
    const expectedRevision = renderedRevision;
    if (expectedRevision === null || expectedRevision !== revision.current) {
      const detail = 'Your records changed while this edit was open. Reload before trying this change again.';
      setError(detail);
      setConflict(true);
      needsReload.current = true;
      throw new Error(detail);
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const saved = await writeAccount(expectedRevision, verified, renderedUserId);
      if (!mounted.current || token !== generation.current) throw new Error('Your account changed before the save finished.');
      revision.current = saved.revision;
      setState(saved.data);
      setError(null);
      setConflict(false);
      lastReload.current = Date.now();
    } catch (reason) {
      const isConflict = /paytrack_conflict/.test(message(reason));
      // A lost response may follow a successful commit. Require a fresh read
      // before retrying so uploads and records are not duplicated or removed.
      const detail = isConflict ? 'Another device changed these records. Reload before trying this change again.' : `${message(reason)} Reload your records to confirm whether this change was saved before trying again.`;
      if (mounted.current && token === generation.current) { setError(detail); setConflict(true); needsReload.current = true; }
      throw new Error(detail);
    } finally {
      if (token === generation.current) {
        savingRef.current = false;
        if (mounted.current) setSaving(false);
      }
    }
  }, [state, renderedRevision, renderedUserId, renderedGeneration]);

  const signIn = useCallback(async (email: string) => {
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Enter your email address.');
    const { error: authError } = await getPayTrackClient().auth.signInWithOtp({ email: clean, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/paytrack` } });
    if (authError) throw new Error(message(authError));
  }, []);

  const verifyCode = useCallback(async (email: string, token: string) => {
    if (!/^\d{6,8}$/.test(token.trim())) throw new Error('Enter the code from your sign-in email.');
    const { error: authError } = await getPayTrackClient().auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' });
    if (authError) throw new Error(message(authError));
  }, []);

  const signOut = useCallback(async () => {
    const { error: authError } = await getPayTrackClient().auth.signOut({ scope: 'local' });
    if (authError) throw new Error(message(authError));
    // The auth event also clears this; doing it here protects the screen immediately.
    generation.current += 1;
    identity.current = null;
    revision.current = null;
    savingRef.current = false;
    loadingRef.current = false;
    needsReload.current = false;
    setUser(null);
    setState(null);
    setLoading(false);
    setSaving(false);
    setError(null);
    setConflict(false);
  }, []);

  return { configured: cloudConfigured, user, loading, state, saving, error, conflict, signIn, verifyCode, signOut, save, reload };
}
