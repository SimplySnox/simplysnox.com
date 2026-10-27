import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { defaultStore, Store, validateStore } from './model';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
export const cloudConfigured = Boolean(url && anonKey && /^https?:\/\//.test(url));
let client: SupabaseClient | null = null;

export function getPayTrackClient(): SupabaseClient {
  if (!cloudConfigured) throw new Error('Private sync needs the Supabase project URL and public publishable key.');
  if (!client) client = createClient(url!, anonKey!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'paytrack.auth' },
  });
  return client;
}

export interface AccountSnapshot { data: Store; revision: number }

function snapshot(row: { data: unknown; revision: unknown }): AccountSnapshot {
  const revision = Number(row.revision);
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('This account has an invalid sync revision.');
  return { data: validateStore(row.data), revision };
}

/** Initial insert is deliberately insert-only: it cannot replace another device's data. */
export async function readAccount(userId: string): Promise<AccountSnapshot> {
  const db = getPayTrackClient();
  let response = await db.from('paytrack_accounts').select('data,revision').eq('user_id', userId).maybeSingle();
  if (response.error) throw response.error;
  if (response.data) return snapshot(response.data);
  const created = await db.from('paytrack_accounts').insert({ user_id: userId, data: defaultStore() }).select('data,revision').single();
  if (!created.error && created.data) return snapshot(created.data);
  // Both devices can open a brand new account at once. The second insert must only read.
  if (created.error?.code !== '23505') throw created.error || new Error('Unable to create your PayTrack account.');
  response = await db.from('paytrack_accounts').select('data,revision').eq('user_id', userId).maybeSingle();
  if (response.error) throw response.error;
  if (!response.data) throw new Error('Unable to load your PayTrack account.');
  return snapshot(response.data);
}

export async function writeAccount(expectedRevision: number, data: Store, userId: string): Promise<AccountSnapshot> {
  const response = await getPayTrackClient().rpc('save_paytrack', { expected_revision: expectedRevision, payload: validateStore(data), expected_user: userId });
  if (response.error) throw response.error;
  const row = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!row) throw new Error('The server did not confirm this save. Please reload your records.');
  return snapshot(row);
}

const BUCKET = 'paytrack-stubs';
const MIME_EXTENSIONS: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
};

/** Store originals privately under a generated path; filenames never become object paths. */
export async function uploadStub(file: File, userId: string): Promise<{ attachmentId: string; attachmentName: string }> {
  if (!file || file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error('Choose a nonempty paystub up to 10 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  // iOS document providers sometimes omit File.type. Infer only when absent;
  // an explicitly mismatched MIME type must still be rejected.
  const contentType = file.type || Object.keys(MIME_EXTENSIONS).find(type => MIME_EXTENSIONS[type].includes(extension));
  if (!contentType || !MIME_EXTENSIONS[contentType]?.includes(extension)) throw new Error('Paystubs must be a PDF, JPG, PNG, or WebP file.');
  const db = getPayTrackClient();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError || auth.user?.id !== userId) throw new Error('Sign in again before uploading this paystub.');
  const attachmentId = `${userId}/${crypto.randomUUID()}.${extension === 'jpeg' ? 'jpg' : extension}`;
  const { error } = await db.storage.from(BUCKET).upload(attachmentId, file, { contentType, upsert: false });
  if (error) throw error;
  return { attachmentId, attachmentName: file.name.slice(0, 255) };
}

function requirePrivatePath(id: string): void {
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/i.test(id)) throw new Error('This paystub has an invalid file reference.');
}

export async function deleteStub(id: string): Promise<void> {
  requirePrivatePath(id);
  const { error } = await getPayTrackClient().storage.from(BUCKET).remove([id]);
  if (error) throw error;
}

export async function downloadStub(id: string, name: string): Promise<void> {
  requirePrivatePath(id);
  const db = getPayTrackClient();
  const { data, error } = await db.storage.from(BUCKET).download(id);
  if (error) throw error;
  if (!data) throw new Error('This paystub is unavailable.');
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError || auth.user?.id !== id.split('/')[0]) throw new Error('Your account changed before this download finished.');
  const objectUrl = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = name.replace(/[\/\\\u0000-\u001f]/g, '_') || 'paystub';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Keep the URL alive long enough for Safari's download to start.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
