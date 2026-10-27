import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Cloud, FileText, LayoutDashboard, LockKeyhole, LogOut, Pause, Pencil, Play, Plus, Settings2, ShieldCheck, Square, Trash2, TrendingUp, Upload, Wallet, X } from 'lucide-react';
import { usePayTrack } from '../lib/paytrack/usePayTrack';
import { deleteStub, downloadStub, uploadStub } from '../lib/paytrack/cloud';
import { localDate, parseDate, validateStore, type Paycheck, type Shift, type Store } from '../lib/paytrack/model';
import { addDays, calculatePeriod, estimateNet, getPeriodStart, shiftHours } from '../lib/paytrack/calculate';
import PaycheckForm from '../components/paytrack/PaycheckForm';
import SettingsForm from '../components/paytrack/SettingsForm';
import Forecast from '../components/paytrack/Forecast';

const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const hours = (amount: number) => amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
const dateLabel = (value: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => parseDate(value).toLocaleDateString('en-US', options);
const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
const toInput = (date: Date) => `${localDate(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
type View = 'overview' | 'shifts' | 'paychecks' | 'forecast' | 'settings' | 'backups';
const views = [
  { id: 'overview', title: 'Overview', icon: LayoutDashboard },
  { id: 'shifts', title: 'Hours & shifts', icon: Clock3 },
  { id: 'paychecks', title: 'Pay history', icon: Wallet },
  { id: 'forecast', title: 'Pay calculator', icon: TrendingUp },
  { id: 'settings', title: 'Preferences', icon: Settings2 },
  { id: 'backups', title: 'Backups', icon: ArrowDownToLine },
] as const;

function Modal({ title, children, onClose, busy }: { title: string; children: ReactNode; onClose: () => void; busy: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) onClose();
      if (event.key !== 'Tab') return;
      const focusable = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]') ?? []);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, []); // Keep focus inside this dialog until it closes.
  return <div className="pt-modal-backdrop"><div ref={ref} className="pt-modal" role="dialog" aria-modal="true" aria-labelledby="pt-dialog-title" tabIndex={-1}>
    <div className="pt-modal-heading"><h2 id="pt-dialog-title">{title}</h2><button className="pt-icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20} /></button></div>
    {children}
  </div></div>;
}

function ShiftForm({ existing, onSave, onCancel }: { existing?: Shift; onSave: (shift: Shift) => Promise<void>; onCancel: () => void }) {
  const [start, setStart] = useState(existing ? toInput(new Date(existing.start)) : toInput(new Date()));
  const [end, setEnd] = useState(existing ? toInput(new Date(existing.end)) : '');
  const [breakMinutes, setBreakMinutes] = useState(String(existing?.manualBreakMinutes ?? 0));
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    try {
      // Keep the clock's exact seconds when only a note/break field was edited.
      const a = new Date(existing && start === toInput(new Date(existing.start)) ? existing.start : start);
      const b = new Date(existing && end === toInput(new Date(existing.end)) ? existing.end : end);
      const unpaid = Number(breakMinutes);
      if (!start || !end || !Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime()) || b <= a) throw new Error('Enter a clock-out time after the clock-in time.');
      if (!breakMinutes.trim() || !Number.isFinite(unpaid) || unpaid < 0) throw new Error('Enter unpaid break minutes, or 0 for none.');
      submitting.current = true; setSaving(true);
      await onSave({ id: existing?.id ?? crypto.randomUUID(), start: a.toISOString(), end: b.toISOString(), breaks: existing?.breaks ?? [], manualBreakMinutes: unpaid, note: note.trim() });
    } catch (error) { setError(message(error)); }
    finally { submitting.current = false; setSaving(false); }
  }
  return <form onSubmit={submit}>
    {error && <p className="pt-error" role="alert">{error}</p>}
    <fieldset disabled={saving} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <div className="pt-form-grid">
        <label className="pt-field">Clock in<input className="pt-input" type="datetime-local" value={start} required onChange={e => setStart(e.target.value)} /></label>
        <label className="pt-field">Clock out<input className="pt-input" type="datetime-local" value={end} required onChange={e => setEnd(e.target.value)} /></label>
        <label className="pt-field">Additional unpaid break (minutes)<input className="pt-input" type="number" min="0" max="2880" step="1" value={breakMinutes} required onChange={e => setBreakMinutes(e.target.value)} /></label>
        <label className="pt-field">Note (optional)<input className="pt-input" maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="Opening shift, inventory…" /></label>
      </div>
      <p className="pt-muted pt-small">Times use this device’s timezone. For overnight shifts, select the next day for clock out. Untimed breaks are spread across the shift when it crosses a workweek boundary.</p>
      {Boolean(existing?.breaks.length) && <p className="pt-notice">Your {existing.breaks.length} timed break(s) are preserved. The break field adds to those; it does not replace them.</p>}
      <div className="pt-form-actions"><button type="button" className="pt-button pt-button-quiet" onClick={onCancel}>Cancel</button><button className="pt-button pt-button-primary">{saving ? 'Saving…' : 'Save shift'}</button></div>
    </fieldset>
  </form>;
}

function Login({ cloud }: { cloud: ReturnType<typeof usePayTrack> }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { if (sent) await cloud.verifyCode(email.trim(), token.trim()); else { await cloud.signIn(email.trim()); setSent(true); } }
    catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }
  return <div className="pt-login"><div className="pt-login-grid">
    <section className="pt-login-visual"><Brand /><div><span className="pt-eyebrow">YOUR HOURS. YOUR NEXT PAYDAY.</span><h1>A little clarity<br />for every paycheck.</h1><p>Track your AutoZone shifts, keep your paystubs in one place, and get a clearer picture of what’s coming.</p></div><p className="pt-small"><ShieldCheck size={18} /> Your records belong to your account.</p></section>
    <section className="pt-login-card"><span className="pt-pill"><LockKeyhole size={13} /> PRIVATE WORKSPACE</span><h2>Welcome to PayTrack</h2><p className="pt-muted">One place for your hours, paychecks, and the details in between.</p>
      {!cloud.configured ? <div className="pt-notice"><h3>Your private workspace is being connected.</h3><p>Sign-in and device sync will be available once the database and email sign-in are configured. No financial records are stored on this public page.</p></div> : cloud.loading ? <p className="pt-loading">Checking your session…</p> : <form onSubmit={submit}>
        <label className="pt-field">Email address<input type="email" autoComplete="email" className="pt-input" value={email} required disabled={busy || sent} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        {sent && <><p className="pt-notice">Check your inbox for your sign-in code or link. Only an invited account can sign in.</p><label className="pt-field">Email code<input className="pt-input" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6,8}" value={token} required onChange={e => setToken(e.target.value)} /></label></>}
        {(error || cloud.error) && <p className="pt-error" role="alert">{error || cloud.error}</p>}
        <button disabled={busy} className="pt-button pt-button-primary">{busy ? 'Please wait…' : sent ? 'Sign in securely' : 'Send sign-in email'}<ArrowRight size={16} /></button>
        {sent && <button type="button" disabled={busy} className="pt-button pt-button-quiet" onClick={() => { setSent(false); setToken(''); }}>Use another email / resend</button>}
        <p className="pt-muted pt-small">Invite-only access. Your paystubs are kept in private account storage.</p>
      </form>}
      <Link className="pt-button pt-button-quiet" href="/"><ArrowLeft size={15} />Back to SimplySnox</Link>
    </section>
  </div></div>;
}

function Brand() { return <div className="pt-brand"><span className="pt-brand-mark"><TrendingUp size={24} strokeWidth={2.5} /></span><div>Pay<span>Track</span><small>PERSONAL PAY WORKSPACE</small></div></div>; }

export default function PayTrack() {
  const cloud = usePayTrack();
  const { state, user, saving } = cloud;
  const [view, setView] = useState<View>('overview');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [modal, setModal] = useState<'shift' | 'paycheck' | null>(null);
  const [editShift, setEditShift] = useState<Shift | undefined>();
  const [editPaycheck, setEditPaycheck] = useState<Paycheck | undefined>();
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [pendingBackup, setPendingBackup] = useState<Store | null>(null);
  const [working, setWorking] = useState(false);
  const operation = useRef(false);
  const modalBase = useRef<Store | null>(null);
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { setModal(null); setPendingBackup(null); setNotice(null); }, [user?.id]);
  const busy = saving || working;
  async function run(action: () => Promise<void>, success?: string) {
    if (operation.current) return;
    operation.current = true; setWorking(true); setNotice(null);
    try { await action(); if (success) setNotice({ text: success, error: false }); }
    catch (error) { setNotice({ text: message(error), error: true }); }
    finally { operation.current = false; setWorking(false); }
  }
  async function save(next: Store) { await cloud.save(validateStore(next)); }
  function openShift(shift?: Shift) { modalBase.current = state; setEditShift(shift); setModal('shift'); }
  function openPaycheck(paycheck?: Paycheck) { modalBase.current = state; setEditPaycheck(paycheck); setModal('paycheck'); }
  function closeModal() { setModal(null); }
  const meta = <Head><title>PayTrack · SimplySnox</title><meta name="description" content="Your private AutoZone hours and paycheck workspace." /><meta name="robots" content="noindex, nofollow" /></Head>;
  if (!user) return <div className="paytrack">{meta}<Login cloud={cloud} /></div>;
  if (!state) return <div className="paytrack">{meta}<div className="pt-login"><section className="pt-login-card"><Brand /><h1>{cloud.loading ? 'Opening your workspace…' : 'We couldn’t load your records.'}</h1>{cloud.error && <p role="alert" className="pt-error">{cloud.error}</p>}<button className="pt-button" disabled={cloud.loading} onClick={() => run(cloud.reload)}>Try again</button><button className="pt-button pt-button-quiet" onClick={() => run(cloud.signOut)}>Sign out</button></section></div></div>;
  const current = now ?? new Date();
  const periodStart = addDays(getPeriodStart(localDate(current), state.settings.periodAnchor), periodOffset * 14);
  const periodEnd = addDays(periodStart, 13);
  const summary = calculatePeriod(state.shifts, periodStart, state.settings);
  const estimate = estimateNet(summary.gross, state.paychecks, state.settings);
  const sortedChecks = state.paychecks.slice().sort((a, b) => b.payDate.localeCompare(a.payDate));
  const periodShifts = state.shifts.filter(shift => Date.parse(shift.start) < parseDate(addDays(periodStart, 14)).getTime() && Date.parse(shift.end) > parseDate(periodStart).getTime()).sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  const active = state.activeShift;
  const activeEnd = active?.breakStartedAt ? Date.parse(active.breakStartedAt) : current.getTime();
  const elapsed = active ? Math.max(0, activeEnd - Date.parse(active.start) - active.breaks.reduce((sum, pause) => sum + Date.parse(pause.end) - Date.parse(pause.start), 0)) : 0;
  const timerLabel = `${String(Math.floor(elapsed / 3600000)).padStart(2, '0')}:${String(Math.floor(elapsed / 60000) % 60).padStart(2, '0')}:${String(Math.floor(elapsed / 1000) % 60).padStart(2, '0')}`;
  const estimateDescription = estimate.source === 'history' ? `${estimate.percent!.toFixed(1)}% take-home · ${estimate.samples} confirmed paycheck${estimate.samples === 1 ? '' : 's'}` : estimate.source === 'manual' ? `${estimate.percent!.toFixed(1)}% custom take-home rate` : 'Add a paycheck or set a custom take-home percentage';

  async function savePaycheck(paycheck: Paycheck, file: File | null) {
    if (operation.current) throw new Error('Another change is saving. Please try again.');
    if (modalBase.current !== state) throw new Error('Your records changed while this form was open. Close it and reopen from the latest records before saving.');
    operation.current = true; setWorking(true);
    let uploaded: { attachmentId: string; attachmentName: string } | undefined;
    try {
      if (state.paychecks.some(item => item.id !== paycheck.id && item.payDate === paycheck.payDate && item.periodStart === paycheck.periodStart && item.periodEnd === paycheck.periodEnd)) throw new Error('A paycheck for that pay date and period already exists. Edit that record instead.');
      if (file) uploaded = await uploadStub(file, user.id);
      const record = { ...paycheck, ...uploaded };
      const next = { ...state, paychecks: [...state.paychecks.filter(item => item.id !== record.id), record] };
      await save(next);
      setModal(null); setNotice({ text: 'Paycheck saved. Your historical estimate is up to date.', error: false });
      if (uploaded && editPaycheck?.attachmentId && editPaycheck.attachmentId !== uploaded.attachmentId) {
        try { await deleteStub(editPaycheck.attachmentId); } catch { setNotice({ text: 'Paycheck saved. The old file could not be removed from storage; your new attachment is ready.', error: true }); }
      }
    } catch (error) {
      // A failed response may follow a successful server commit. Retain the file
      // rather than deleting an original that a committed paycheck could reference.
      if (uploaded) throw new Error(`${message(error)} Your file was uploaded; reload Pay history to check whether the record saved before retrying.`);
      throw error;
    } finally { operation.current = false; setWorking(false); }
  }

  async function clockAction(action: 'in' | 'break' | 'out') {
    const stamp = new Date().toISOString();
    if (action === 'in') return save({ ...state, activeShift: { start: stamp, breaks: [], breakStartedAt: null } });
    if (!active) return;
    if (action === 'break') return save({ ...state, activeShift: { ...active, breaks: active.breakStartedAt ? [...active.breaks, { start: active.breakStartedAt, end: stamp }] : active.breaks, breakStartedAt: active.breakStartedAt ? null : stamp } });
    const shift: Shift = { id: crypto.randomUUID(), start: active.start, end: stamp, breaks: active.breakStartedAt ? [...active.breaks, { start: active.breakStartedAt, end: stamp }] : active.breaks, manualBreakMinutes: 0, note: '' };
    await save({ ...state, activeShift: null, shifts: [...state.shifts, shift] });
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `paytrack-${localDate()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const shiftList = (limit?: number) => periodShifts.length ? <div className="pt-shift-list">{periodShifts.slice(0, limit).map(shift => {
    const start = new Date(shift.start), end = new Date(shift.end);
    return <div className="pt-shift-row" key={shift.id}><div className="pt-date-tile"><small>{start.toLocaleDateString('en-US', { month: 'short' })}</small><strong>{start.getDate()}</strong></div><div className="pt-row-main"><strong>{start.toLocaleDateString('en-US', { weekday: 'long' })}</strong><span>{start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}{localDate(start) !== localDate(end) ? ` (${dateLabel(localDate(end))})` : ''}</span>{shift.note && <small>{shift.note}</small>}</div><div className="pt-row-value"><strong>{hours(shiftHours(shift))} h</strong><small>{hours(shift.manualBreakMinutes + shift.breaks.reduce((sum, pause) => sum + (Date.parse(pause.end) - Date.parse(pause.start)) / 60000, 0))} min break</small></div><div className="pt-row-actions"><button className="pt-icon-button" aria-label={`Edit shift on ${dateLabel(localDate(start))}`} disabled={busy} onClick={() => openShift(shift)}><Pencil size={15} /></button><button className="pt-icon-button" aria-label={`Delete shift on ${dateLabel(localDate(start))}`} disabled={busy} onClick={() => { if (window.confirm('Delete this shift? This removes its hours from your estimates.')) run(() => save({ ...state, shifts: state.shifts.filter(item => item.id !== shift.id) }), 'Shift deleted.'); }}><Trash2 size={15} /></button></div></div>;
  })}</div> : <div className="pt-empty"><Clock3 size={30} /><h3>Your next shift starts here.</h3><p>Clock in when you start, or add a past shift to see your earnings.</p><button className="pt-button pt-button-quiet" onClick={() => openShift()}><Plus size={16} />Add a shift</button></div>;

  const periodToolbar = <div className="pt-period-toolbar"><div className="pt-period"><CalendarDays size={17} /><span>{dateLabel(periodStart)} – {dateLabel(periodEnd)}, {parseDate(periodEnd).getFullYear()}</span><span className="pt-pill">{periodOffset === 0 ? 'CURRENT PERIOD' : 'PAY PERIOD'}</span></div><div className="pt-topbar-actions"><button className="pt-icon-button" aria-label="Previous pay period" onClick={() => setPeriodOffset(offset => offset - 1)}><ChevronLeft size={18} /></button><button className="pt-button pt-button-quiet" onClick={() => setPeriodOffset(0)}>Today</button><button className="pt-icon-button" aria-label="Next pay period" onClick={() => setPeriodOffset(offset => offset + 1)}><ChevronRight size={18} /></button></div></div>;

  return <div className="paytrack">{meta}
    <aside className="pt-sidebar"><Brand /><nav className="pt-nav" aria-label="PayTrack">{views.map(item => <button key={item.id} className={view === item.id ? 'is-active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => { setView(item.id); setNotice(null); }}><item.icon size={18} />{item.title}</button>)}</nav><div className="pt-sidebar-footer"><span className="pt-pill pt-pill-green"><ShieldCheck size={13} />PRIVATE & SYNCED</span><p className="pt-small">A clearer picture of<br />your hard-earned money.</p><Link href="/">SimplySnox <ArrowUpRight size={14} /></Link></div></aside>
    <main className="pt-main"><header className="pt-topbar"><div><span className="pt-eyebrow">AUTOZONE · PERSONAL WORKSPACE</span><h1>{views.find(item => item.id === view)?.title}</h1></div><div className="pt-topbar-actions"><span className="pt-muted pt-small"><Cloud size={15} />{busy ? 'Saving…' : 'Cloud connected'}</span><button className="pt-icon-button" title={`Sign out ${user.email ?? ''}`} aria-label="Sign out" disabled={busy} onClick={() => run(cloud.signOut)}><LogOut size={18} /></button></div></header>
      <div className="pt-content">
        {(notice || cloud.error) && <div role={notice?.error || cloud.error ? 'alert' : 'status'} className={notice?.error || cloud.error ? 'pt-error' : 'pt-success'}>{notice?.text || cloud.error}{cloud.conflict && <button className="pt-button pt-button-quiet" onClick={() => run(async () => { await cloud.reload(); setModal(null); }, 'Latest records loaded. Please reapply your change.')} disabled={busy}>Load latest records</button>}</div>}
        {(view === 'overview' || view === 'shifts') && periodToolbar}
        {view === 'overview' && <>
          <div className="pt-overview-grid"><section className="pt-hero"><div className="pt-hero-label"><Wallet size={18} />Estimated take-home<span className="pt-pill">BIWEEKLY</span></div><div className="pt-hero-value">{estimate.net === null ? <span>—</span> : money(estimate.net)}</div><p>{estimateDescription}</p><div className="pt-hero-footer"><span>{money(summary.gross)} <small>gross earned</small></span><span>{hours(summary.totalHours)} <small>paid hours</small></span></div></section>
          <section className="pt-clock-card"><div className="pt-panel-heading"><h2><Clock3 size={17} />Shift timer</h2><span className={`pt-pill ${active ? 'pt-pill-green' : ''}`}>{active ? active.breakStartedAt ? 'ON BREAK' : 'CLOCKED IN' : 'OFF THE CLOCK'}</span></div><div className="pt-clock-time">{timerLabel}</div><p className="pt-muted pt-small">{active ? `Started ${new Date(active.start).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. Clock out to include these hours.` : 'Ready when you are. Unpaid breaks are tracked separately.'}</p><div className="pt-form-actions">{!active ? <button className="pt-button pt-button-primary" disabled={busy} onClick={() => run(() => clockAction('in'), 'Clocked in.')}><Play size={16} />Clock in</button> : <><button className="pt-button pt-button-quiet" disabled={busy} onClick={() => run(() => clockAction('break'))}>{active.breakStartedAt ? <Play size={15} /> : <Pause size={15} />}{active.breakStartedAt ? 'Resume' : 'Unpaid break'}</button><button className="pt-button pt-button-primary" disabled={busy} onClick={() => run(() => clockAction('out'), 'Shift saved to your hours.')}><Square size={14} />Clock out</button></>}</div>{active && <button className="pt-button pt-button-quiet pt-small" disabled={busy} onClick={() => { if (window.confirm('Discard this running timer? You can add a corrected shift manually.')) run(() => save({ ...state, activeShift: null }), 'Timer discarded. Add a manual shift if needed.'); }}>Discard timer</button>}</section></div>
          <div className="pt-metrics">{[{ label: 'Regular hours', value: `${hours(summary.regularHours)} h`, detail: `${money(state.settings.regularRate)} / hour`, icon: Clock3 }, { label: 'Overtime hours', value: `${hours(summary.overtimeHours)} h`, detail: `${money(state.settings.overtimeRate)} / hour`, icon: TrendingUp }, { label: 'Gross earnings', value: money(summary.gross), detail: 'Before deductions', icon: Wallet }].map(item => <section className="pt-metric" key={item.label}><div className="pt-metric-label">{item.label}<item.icon size={17} /></div><strong className="pt-metric-value">{item.value}</strong><small>{item.detail}</small></section>)}</div>
          <div className="pt-two-col"><section className="pt-panel"><div className="pt-panel-heading"><h2>Paycheck trends</h2><button className="pt-button pt-button-quiet" onClick={() => setView('paychecks')}>View history<ArrowRight size={14} /></button></div>{sortedChecks.length ? <><div className="pt-legend"><span><i className="pt-bar-gross" />Gross</span><span><i className="pt-bar-net" />Take-home</span></div><div className="pt-chart" aria-label="Recent gross and take-home paychecks">{sortedChecks.slice(0, 6).reverse().map(check => { const max = Math.max(...sortedChecks.slice(0, 6).map(item => item.gross), 1); return <div className="pt-chart-col" key={check.id}><div className="pt-chart-label">{money(check.net)}</div><div className="pt-chart-bars"><div className="pt-bar-gross" style={{ height: `${Math.max(2, check.gross / max * 100)}%` }} title={`Gross ${money(check.gross)}`} /><div className="pt-bar-net" style={{ height: `${Math.max(2, check.net / max * 100)}%` }} title={`Take-home ${money(check.net)}`} /></div><span className="pt-chart-date">{dateLabel(check.payDate)}</span></div>; })}</div></> : <div className="pt-empty"><FileText size={30} /><h3>Make payday a little more predictable.</h3><p>Add your first paycheck to start your history and personalize your take-home estimate.</p><button className="pt-button pt-button-primary" disabled={busy} onClick={() => openPaycheck()}><Upload size={16} />Add a paycheck</button></div>}</section>
            <section className="pt-panel"><div className="pt-panel-heading"><h2>Workweek breakdown</h2><span className="pt-pill">{hours(state.settings.overtimeThreshold)} H / WEEK</span></div>{summary.weeks.map((week, index) => <div className="pt-week-row" key={week.start}><div><strong>Week of {dateLabel(week.start)}</strong><span>{hours(week.totalHours)} h</span></div><div className="pt-progress"><span style={{ width: `${Math.min(100, week.totalHours / state.settings.overtimeThreshold * 100)}%` }} /></div><small>{hours(week.regularHours)} regular · {hours(week.overtimeHours)} overtime{summary.weeks.length > 2 && (index === 0 || index === summary.weeks.length - 1) ? ' · partial week' : ''}</small></div>)}<p className="pt-muted pt-small">Overtime resets each workweek. Confirm your workweek and pay-period dates in preferences.</p><button className="pt-button pt-button-quiet" onClick={() => setView('settings')}>Review preferences<ArrowRight size={14} /></button></section></div>
          <section className="pt-panel"><div className="pt-panel-heading"><h2>Recent shifts</h2><button className="pt-button pt-button-quiet" disabled={busy} onClick={() => openShift()}><Plus size={15} />Add shift</button></div>{shiftList(4)}{periodShifts.length > 4 && <button className="pt-button pt-button-quiet" onClick={() => setView('shifts')}>All {periodShifts.length} shifts<ArrowRight size={14} /></button>}</section>
        </>}
        {view === 'shifts' && <section className="pt-panel"><div className="pt-panel-heading"><div><h2>Your hours, accounted for.</h2><p className="pt-muted pt-small">{hours(summary.totalHours)} paid hours · {money(summary.gross)} gross this period</p></div><button className="pt-button pt-button-primary" disabled={busy} onClick={() => openShift()}><Plus size={16} />Add shift</button></div>{shiftList()}</section>}
        {view === 'paychecks' && <><div className="pt-period-toolbar"><div><h2>Your payday archive</h2><p className="pt-muted">{sortedChecks.length} paycheck{sortedChecks.length === 1 ? '' : 's'} · {money(sortedChecks.reduce((sum, item) => sum + item.net, 0))} total take-home</p></div><button className="pt-button pt-button-primary" disabled={busy} onClick={() => openPaycheck()}><Plus size={16} />Add paycheck</button></div><p className="pt-notice"><ShieldCheck size={17} />Paystubs are private. Confirmed totals help refine your historical take-home percentage; files are not read automatically.</p>{sortedChecks.length ? <div className="pt-paychecks">{sortedChecks.map(check => <article className="pt-paycheck pt-panel" key={check.id}><div className="pt-paycheck-top"><span className="pt-pill"><FileText size={13} />AUTOZONE</span><div className="pt-row-actions"><button className="pt-icon-button" aria-label={`Edit paycheck dated ${dateLabel(check.payDate)}`} disabled={busy} onClick={() => openPaycheck(check)}><Pencil size={15} /></button><button className="pt-icon-button" aria-label={`Delete paycheck dated ${dateLabel(check.payDate)}`} disabled={busy} onClick={() => { if (window.confirm('Delete this paycheck and its attached paystub? This also updates your historical estimate.')) run(async () => { await save({ ...state, paychecks: state.paychecks.filter(item => item.id !== check.id) }); if (check.attachmentId && !state.paychecks.some(item => item.id !== check.id && item.attachmentId === check.attachmentId)) await deleteStub(check.attachmentId); }, 'Paycheck deleted.'); }}><Trash2 size={15} /></button></div></div><h2>Paid {dateLabel(check.payDate, { month: 'long', day: 'numeric', year: 'numeric' })}</h2><p className="pt-muted pt-small">{dateLabel(check.periodStart)} – {dateLabel(check.periodEnd)}, {parseDate(check.periodEnd).getFullYear()}</p><div className="pt-paycheck-values"><div><small>TAKE-HOME</small><strong>{money(check.net)}</strong></div><div><small>GROSS</small><strong>{money(check.gross)}</strong></div></div><p className="pt-small pt-muted">{check.gross > 0 ? `${(check.net / check.gross * 100).toFixed(1)}% take-home · ${money(check.gross - check.net)} deductions` : 'No earnings recorded'}</p>{check.note && <p className="pt-small">{check.note}</p>}{check.attachmentId && <button className="pt-button pt-button-quiet" disabled={busy} onClick={() => run(() => downloadStub(check.attachmentId!, check.attachmentName ?? 'paystub.pdf'))}><ArrowDownToLine size={15} />Download paystub</button>}</article>)}</div> : <section className="pt-panel"><div className="pt-empty"><FileText size={32} /><h3>A home for every paycheck.</h3><p>Add past or current paychecks, with an optional PDF or photo of each paystub.</p><button className="pt-button pt-button-primary" onClick={() => openPaycheck()}>Add your first paycheck</button></div></section>}</>}
        {view === 'forecast' && <Forecast settings={state.settings} paychecks={state.paychecks} />}
        {view === 'settings' && <SettingsForm key={JSON.stringify(state.settings)} settings={state.settings} paychecks={state.paychecks} onSave={async settings => { await save({ ...state, settings }); setPeriodOffset(0); setNotice({ text: 'Preferences saved across your devices.', error: false }); }} />}
        {view === 'backups' && <section className="pt-panel"><div className="pt-panel-heading"><h2>A copy, just in case.</h2><ShieldCheck size={20} /></div><p className="pt-muted">Your records sync with your account. You can also keep an independent copy.</p><div className="pt-backup-summary"><span><strong>{state.shifts.length}</strong> shifts</span><span><strong>{state.paychecks.length}</strong> paychecks</span><span><strong>{state.paychecks.filter(item => item.attachmentId).length}</strong> linked paystubs</span></div><button className="pt-button pt-button-primary" onClick={exportBackup}><ArrowDownToLine size={16} />Download records backup</button><p className="pt-muted pt-small">JSON backups include records, settings, and file references. Original PDF/image files stay in your private storage; download each paystub from Pay history.</p><hr /><h3>Restore a backup</h3><p className="pt-muted pt-small">Only PayTrack v1 JSON backups are supported. Restoring replaces your current records and settings; it does not upload or delete paystub files.</p><label className="pt-field">Choose a PayTrack backup<input className="pt-input" type="file" accept="application/json,.json" disabled={busy} onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; setPendingBackup(null); if (!file) return; try { if (file.size > 10 * 1024 * 1024) throw new Error('Choose a backup no larger than 10 MB.'); const imported = validateStore(JSON.parse(await file.text())); if (imported.paychecks.some(item => item.attachmentId && !item.attachmentId.startsWith(`${user.id}/`))) throw new Error('This backup links files from a different account. Restore it in its original account.'); setPendingBackup(imported); } catch (error) { setNotice({ text: message(error), error: true }); } }} /></label>{pendingBackup && <div className="pt-notice"><p>This backup contains {pendingBackup.shifts.length} shifts and {pendingBackup.paychecks.length} paychecks. It will replace your current records{pendingBackup.activeShift ? ' and includes a running shift timer' : ''}.</p><div className="pt-form-actions"><button className="pt-button pt-button-quiet" onClick={exportBackup}>Back up current records first</button><button className="pt-button pt-button-danger" disabled={busy} onClick={() => run(async () => { await save(pendingBackup); setPendingBackup(null); }, 'Backup restored.')}>Replace records with backup</button><button className="pt-button pt-button-quiet" onClick={() => setPendingBackup(null)}>Cancel</button></div></div>}</section>}
        <footer className="pt-page-footer">PayTrack · Built around your payday.<span>Estimates reflect recorded hours and historical deductions; actual payroll may differ.</span></footer>
      </div>
    </main>
    {modal && <Modal title={modal === 'shift' ? editShift ? 'Edit shift' : 'Add a shift' : editPaycheck ? 'Edit paycheck' : 'Add a paycheck'} onClose={closeModal} busy={busy}>{modal === 'shift' ? <ShiftForm existing={editShift} onCancel={closeModal} onSave={async shift => { if (modalBase.current !== state) throw new Error('Your records changed while this form was open. Close it and reopen from the latest records before saving.'); await save({ ...state, shifts: [...state.shifts.filter(item => item.id !== shift.id), shift] }); setModal(null); setNotice({ text: 'Shift saved. Your hours and earnings are updated.', error: false }); }} /> : <PaycheckForm existing={editPaycheck} onCancel={closeModal} onSave={savePaycheck} />}</Modal>}
  </div>;
}
