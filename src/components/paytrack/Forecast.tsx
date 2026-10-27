import { useId, useState } from 'react';
import { estimateNet } from '../../lib/paytrack/calculate';
import type { Paycheck, Settings } from '../../lib/paytrack/model';

interface Props { settings: Settings; paychecks: Paycheck[] }
const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const hours = (amount: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);
const cents = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

export default function Forecast({ settings, paychecks }: Props) {
  const prefix = useId();
  const [first, setFirst] = useState('40');
  const [second, setSecond] = useState('40');
  const values = [first, second].map(value => value.trim() === '' ? NaN : Number(value));
  const valid = values.every(value => Number.isFinite(value) && value >= 0 && value <= 168);
  const weeks = valid ? values.map(total => {
    const regular = Math.min(total, settings.overtimeThreshold);
    const overtime = Math.max(0, total - settings.overtimeThreshold);
    return { total, regular, overtime, gross: cents(regular * settings.regularRate + overtime * settings.overtimeRate) };
  }) : [];
  const regularHours = weeks.reduce((sum, week) => sum + week.regular, 0);
  const overtimeHours = weeks.reduce((sum, week) => sum + week.overtime, 0);
  const gross = cents(weeks.reduce((sum, week) => sum + week.gross, 0));
  const estimate = estimateNet(gross, paychecks, settings);

  return (
    <section className="pt-panel" style={{ display: 'grid', gap: 20 }}>
      <div className="pt-panel-heading" style={{ marginBottom: 0 }}><div><h2>Plan your next paycheck</h2><p className="pt-muted pt-small">Try a schedule before you work it.</p></div></div>
      <p className="pt-notice">This is a hypothetical two-workweek forecast. Enter paid hours after unpaid breaks. These hours are separate from saved shifts and do not change your records.</p>
      <div className="pt-form-grid">
        <label className="pt-field">Workweek 1 · paid hours
          <input className="pt-input" type="number" inputMode="decimal" min="0" max="168" step="0.01" value={first} onChange={event => setFirst(event.target.value)} aria-invalid={!Number.isFinite(values[0]) || values[0] < 0 || values[0] > 168} aria-describedby={!valid ? `${prefix}-error` : undefined} />
        </label>
        <label className="pt-field">Workweek 2 · paid hours
          <input className="pt-input" type="number" inputMode="decimal" min="0" max="168" step="0.01" value={second} onChange={event => setSecond(event.target.value)} aria-invalid={!Number.isFinite(values[1]) || values[1] < 0 || values[1] > 168} aria-describedby={!valid ? `${prefix}-error` : undefined} />
        </label>
      </div>
      {!valid ? <p className="pt-error" role="alert" id={`${prefix}-error`}>Enter between 0 and 168 paid hours for each week.</p> : <>
        <div className="pt-metrics" aria-live="polite">
          <div className="pt-metric"><p className="pt-metric-label">Regular hours</p><p className="pt-metric-value">{hours(regularHours)}<small> hrs</small></p></div>
          <div className="pt-metric"><p className="pt-metric-label">Overtime hours</p><p className="pt-metric-value">{hours(overtimeHours)}<small> hrs</small></p></div>
          <div className="pt-metric"><p className="pt-metric-label">Estimated gross</p><p className="pt-metric-value">{money(gross)}</p></div>
        </div>
        <div className="pt-formula">
          <p className="pt-muted pt-small">Estimated take-home pay</p>
          <p className="pt-metric-value" aria-live="polite">{estimate.net === null ? '—' : money(estimate.net)}</p>
          {estimate.percent === null
            ? <p className="pt-muted pt-small">Add a confirmed paycheck or save a custom take-home percentage in Preferences to estimate net pay.</p>
            : <p className="pt-muted pt-small">{money(gross)} × {estimate.percent.toFixed(2)}% take-home = {money(estimate.net!)}{estimate.source === 'history' ? ` · Based on ${estimate.samples} recent paycheck${estimate.samples === 1 ? '' : 's'}.` : ' · Uses your saved custom percentage.'}</p>}
        </div>
        <div className="pt-formula">
          {weeks.map((week, index) => <p key={index} className="pt-small">Week {index + 1}: {hours(week.regular)} h × {money(settings.regularRate)} + {hours(week.overtime)} h × {money(settings.overtimeRate)} = <strong>{money(week.gross)}</strong></p>)}
        </div>
      </>}
      <p className="pt-muted pt-small">Overtime starts after {hours(settings.overtimeThreshold)} paid hours in each workweek. Your workweek starts on {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][settings.weekStartsOn]}. Estimates use your current rates and take-home method. Actual payroll deductions can differ.</p>
    </section>
  );
}
