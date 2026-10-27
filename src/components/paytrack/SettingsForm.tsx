import { useEffect, useRef, useState, type FormEvent } from 'react';
import { defaultStore, validateStore, type Paycheck, type Settings } from '../../lib/paytrack/model';

interface Props {
  settings: Settings;
  paychecks: Paycheck[];
  onSave: (settings: Settings) => Promise<void>;
}

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fields(settings: Settings) {
  return {
    regularRate: String(settings.regularRate),
    overtimeRate: String(settings.overtimeRate),
    overtimeThreshold: String(settings.overtimeThreshold),
    weekStartsOn: String(settings.weekStartsOn),
    periodAnchor: settings.periodAnchor,
    estimateMode: settings.estimateMode,
    manualNetPercent: settings.manualNetPercent === null ? '' : String(settings.manualNetPercent),
  };
}

function numeric(value: string, label: string): number {
  if (!value.trim()) throw new Error(`Enter ${label}.`);
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`Enter a valid number for ${label}.`);
  return result;
}

export default function SettingsForm({ settings, paychecks, onSave }: Props) {
  const [form, setForm] = useState(() => fields(settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [timezone, setTimezone] = useState('your device’s local timezone');
  const savingRef = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => { setForm(fields(settings)); }, [settings]);
  useEffect(() => { setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone); }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const latest = paychecks.filter(item => Number.isFinite(item.gross) && Number.isFinite(item.net) && item.gross > 0 && item.net >= 0 && item.net <= item.gross)
    .slice().sort((a, b) => b.payDate.localeCompare(a.payDate))[0];

  function change(key: keyof typeof form, value: string) {
    setForm(previous => ({ ...previous, [key]: value }));
    setSaved(false);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    setError('');
    setSaved(false);
    try {
      const next: Settings = {
        regularRate: numeric(form.regularRate, 'your regular hourly rate'),
        overtimeRate: numeric(form.overtimeRate, 'your overtime hourly rate'),
        overtimeThreshold: numeric(form.overtimeThreshold, 'the weekly overtime threshold'),
        weekStartsOn: numeric(form.weekStartsOn, 'the workweek start'),
        periodAnchor: form.periodAnchor,
        estimateMode: form.estimateMode,
        manualNetPercent: form.manualNetPercent.trim() === '' ? null : numeric(form.manualNetPercent, 'a take-home percentage'),
      };
      validateStore({ ...defaultStore(), settings: next });
      if (next.estimateMode === 'manual' && next.manualNetPercent === null) throw new Error('Enter a take-home percentage or choose paycheck history.');
      savingRef.current = true;
      setSaving(true);
      await onSave(next);
      setSaved(true);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Your preferences could not be saved. Please try again.');
    } finally { savingRef.current = false; setSaving(false); }
  }

  return (
    <section className="pt-panel">
      <div className="pt-panel-heading"><div><h2>Pay preferences</h2><p className="pt-muted pt-small">Set the rules for your hours and estimates.</p></div></div>
      <form onSubmit={submit} noValidate aria-busy={saving}>
        <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 20 }}>
          <div className="pt-form-grid">
            <label className="pt-field">Regular hourly rate ($)
              <input className="pt-input" type="number" inputMode="decimal" min="0" max="10000" step="0.01" required value={form.regularRate} onChange={event => change('regularRate', event.target.value)} />
            </label>
            <label className="pt-field">Overtime hourly rate ($)
              <input className="pt-input" type="number" inputMode="decimal" min="0" max="10000" step="0.01" required value={form.overtimeRate} onChange={event => change('overtimeRate', event.target.value)} />
            </label>
            <label className="pt-field">Overtime starts after (hours per week)
              <input className="pt-input" type="number" inputMode="decimal" min="0.01" max="168" step="0.01" required value={form.overtimeThreshold} onChange={event => change('overtimeThreshold', event.target.value)} />
            </label>
            <label className="pt-field">Employer’s workweek starts on
              <select className="pt-input" value={form.weekStartsOn} onChange={event => change('weekStartsOn', event.target.value)}>
                {weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </label>
            <label className="pt-field pt-form-wide">First day of a known biweekly pay period
              <input className="pt-input" type="date" required min="1900-01-01" max="2200-12-31" value={form.periodAnchor} onChange={event => change('periodAnchor', event.target.value)} />
              <span className="pt-muted pt-small">Use the period’s first day from a paystub. This is separate from the day you receive your paycheck.</span>
            </label>
          </div>
          <p className="pt-notice">Confirm your employer’s workweek and pay-period dates. Calendar calculations currently use {timezone}; use devices set to the same timezone for consistent week boundaries.</p>
          <div className="pt-form-grid">
            <label className="pt-field">Take-home estimate method
              <select className="pt-input" value={form.estimateMode} onChange={event => change('estimateMode', event.target.value)}>
                <option value="history">Learn from paycheck history</option>
                <option value="manual">Use my percentage</option>
              </select>
            </label>
            <label className="pt-field">Take-home percentage (%)
              <input className="pt-input" type="number" inputMode="decimal" min="0" max="100" step="any" disabled={form.estimateMode !== 'manual'} required={form.estimateMode === 'manual'} placeholder="e.g. 82" value={form.manualNetPercent} onChange={event => change('manualNetPercent', event.target.value)} />
              <span className="pt-muted pt-small">The percentage of gross pay you keep after deductions.</span>
            </label>
          </div>
          <div className="pt-form-actions">
            <button className="pt-button pt-button-quiet" type="button" disabled={!latest} onClick={() => {
              if (!latest) return;
              setForm(previous => ({ ...previous, estimateMode: 'manual', manualNetPercent: String(Math.round(latest.net / latest.gross * 1000000) / 10000) }));
              setSaved(false);
              setError('');
            }}>Use latest paycheck</button>
            <span className="pt-muted pt-small">{latest ? `Uses totals from ${latest.payDate}. Save to apply.` : 'Add a paycheck to use its percentage.'}</span>
          </div>
          <p className="pt-muted pt-small">History uses total take-home pay ÷ total gross pay from your 10 most recent confirmed paychecks. This is a weighted historical ratio, not a tax calculation. Changing deductions, benefits, or hours can change your actual take-home pay.</p>
          {error && <p className="pt-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
          {saved && <p className="pt-success" role="status">Preferences saved.</p>}
          <div className="pt-form-actions"><button className="pt-button pt-button-primary" type="submit">{saving ? 'Saving…' : 'Save preferences'}</button></div>
        </fieldset>
      </form>
    </section>
  );
}
