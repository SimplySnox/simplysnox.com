import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { localDate, parseDate } from '../../lib/paytrack/model';
import type { Paycheck } from '../../lib/paytrack/model';

interface PaycheckFormProps {
  onSave: (paycheck: Paycheck, file: File | null) => Promise<void>;
  onCancel: () => void;
  existing?: Paycheck;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_EXTENSION = /\.(pdf|png|jpe?g|webp)$/i;

function amount(value: string, label: string): number {
  const result = Number(value);
  if (!value.trim() || !Number.isFinite(result) || result < 0 || result > 1000000) {
    throw new Error(`Enter ${label.toLowerCase()} between $0 and $1,000,000.`);
  }
  if (Math.abs(result * 100 - Math.round(result * 100)) > 0.000001) {
    throw new Error(`${label} can have at most two decimal places.`);
  }
  return Math.round(result * 100) / 100;
}

export default function PaycheckForm({ onSave, onCancel, existing }: PaycheckFormProps) {
  const prefix = useId();
  const [payDate, setPayDate] = useState(existing?.payDate ?? localDate());
  const [periodStart, setPeriodStart] = useState(existing?.periodStart ?? localDate());
  const [periodEnd, setPeriodEnd] = useState(existing?.periodEnd ?? localDate());
  const [gross, setGross] = useState(existing ? existing.gross.toFixed(2) : '');
  const [net, setNet] = useState(existing ? existing.net.toFixed(2) : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const hasAttachment = Boolean(file || existing?.attachmentId);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  function chooseFile(nextFile: File | null) {
    if (savingRef.current) return;
    setConfirmed(false);
    setError('');
    if (!nextFile) return;
    if (!ALLOWED_TYPES.has(nextFile.type) && !(nextFile.type === '' && ALLOWED_EXTENSION.test(nextFile.name))) {
      setError('Choose a PDF, PNG, JPEG, or WebP paystub. Other file types are not supported.');
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setError('This paystub is larger than 10 MB. Choose a smaller image or PDF.');
      return;
    }
    if (nextFile.size === 0) {
      setError('This file is empty. Choose a PDF or image that contains your paystub.');
      return;
    }
    if (nextFile.name.length > 255) {
      setError('Rename this file to 255 characters or fewer, then select it again.');
      return;
    }
    setFile(nextFile);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    setError('');
    try {
      for (const [label, value] of [['Pay date', payDate], ['Period start', periodStart], ['Period end', periodEnd]]) {
        try { parseDate(value); } catch {
          throw new Error(`${label}: enter a valid date between 1900 and 2200.`);
        }
      }
      if (periodEnd < periodStart) throw new Error('The pay period must end on or after its start date.');
      if (payDate < periodStart) throw new Error('The pay date must be on or after the pay period starts.');
      const grossAmount = amount(gross, 'Gross pay');
      const netAmount = amount(net, 'Take-home pay');
      if (grossAmount <= 0) throw new Error('Gross pay must be greater than $0.');
      if (netAmount > grossAmount) throw new Error('Take-home pay cannot exceed gross pay. Check both amounts against your paystub.');
      if (hasAttachment && !confirmed) throw new Error('Check the confirmation box after reviewing both totals against your paystub.');
      const paycheck: Paycheck = {
        ...existing,
        id: existing?.id ?? crypto.randomUUID(),
        payDate, periodStart, periodEnd,
        gross: grossAmount,
        net: netAmount,
        note: note.trim(),
      };
      savingRef.current = true;
      setSaving(true);
      await onSave(paycheck, file);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The paycheck could not be saved. Try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const isPdf = file?.type === 'application/pdf' || Boolean(file && /\.pdf$/i.test(file.name));

  return (
    <form onSubmit={submit} noValidate aria-busy={saving} className="pt-paycheck-form">
      <p className="pt-notice" id={`${prefix}-instructions`}>
        Enter the gross and take-home totals from your paystub. Attachments are saved with your record;
        amounts are not extracted automatically.
      </p>
      {error && <div className="pt-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</div>}
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <legend className="pt-sr-only">Paycheck details</legend>
        <div className="pt-form-grid">
          <label className="pt-field" htmlFor={`${prefix}-paid`}>
            <span>Pay date</span>
            <input className="pt-input" id={`${prefix}-paid`} type="date" min="1900-01-01" max="2200-12-31" value={payDate} onChange={event => setPayDate(event.target.value)} required />
          </label>
          <label className="pt-field" htmlFor={`${prefix}-start`}>
            <span>Pay period starts</span>
            <input className="pt-input" id={`${prefix}-start`} type="date" min="1900-01-01" max="2200-12-31" value={periodStart} onChange={event => setPeriodStart(event.target.value)} required />
          </label>
          <label className="pt-field" htmlFor={`${prefix}-end`}>
            <span>Pay period ends</span>
            <input className="pt-input" id={`${prefix}-end`} type="date" min={periodStart || '1900-01-01'} max="2200-12-31" value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} required />
          </label>
          <label className="pt-field" htmlFor={`${prefix}-gross`}>
            <span>Gross pay ($)</span>
            <input className="pt-input" id={`${prefix}-gross`} type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" placeholder="0.00" value={gross} onChange={event => { setGross(event.target.value); setConfirmed(false); }} required aria-describedby={`${prefix}-instructions`} />
          </label>
          <label className="pt-field" htmlFor={`${prefix}-net`}>
            <span>Take-home pay ($)</span>
            <input className="pt-input" id={`${prefix}-net`} type="number" inputMode="decimal" min="0" max="1000000" step="0.01" placeholder="0.00" value={net} onChange={event => { setNet(event.target.value); setConfirmed(false); }} required aria-describedby={`${prefix}-instructions`} />
          </label>
        </div>
        <label className="pt-field" htmlFor={`${prefix}-note`}>
          <span>Note <small>(optional)</small></span>
          <textarea className="pt-input" id={`${prefix}-note`} value={note} onChange={event => setNote(event.target.value)} maxLength={2000} rows={2} placeholder="For example, bonus or a payroll correction" />
        </label>
        <div className="pt-upload" onDragOver={event => event.preventDefault()} onDrop={event => {
          event.preventDefault();
          if (savingRef.current) return;
          if (event.dataTransfer.files.length > 1) {
            setError('Choose one paystub at a time.');
            return;
          }
          chooseFile(event.dataTransfer.files[0] ?? null);
        }}>
          <label className="pt-field" htmlFor={`${prefix}-attachment`}>
            <span><Upload size={16} aria-hidden="true" /> {existing?.attachmentId ? 'Replace paystub (optional)' : 'Attach paystub (optional)'}</span>
            <span id={`${prefix}-file-help`}>Choose or drop a PDF, PNG, JPEG, or WebP up to 10 MB.</span>
            <input ref={fileInput} className="pt-input" id={`${prefix}-attachment`} type="file" accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp" aria-describedby={`${prefix}-file-help`} onChange={event => {
              chooseFile(event.target.files?.[0] ?? null);
              event.target.value = '';
            }} />
          </label>
          {!file && existing?.attachmentId && <p className="pt-file-details"><FileText size={16} aria-hidden="true" /> Keeping attached paystub: {existing.attachmentName ?? 'Paystub'}</p>}
          {file && <div className="pt-file-details">
            <p><FileText size={16} aria-hidden="true" /> {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            {previewUrl && (isPdf ? <a className="pt-button pt-button-quiet" href={previewUrl} target="_blank" rel="noopener noreferrer">Preview PDF</a> :
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label="Open full paystub image preview">
                {/* A blob URL keeps the selected image preview in this browser. */}
                <img className="pt-upload-preview" src={previewUrl} alt="Selected paystub preview" style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'contain' }} />
              </a>)}
            <button className="pt-button pt-button-quiet" type="button" onClick={() => { setFile(null); setConfirmed(false); if (fileInput.current) fileInput.current.value = ''; }}>
              <X size={14} aria-hidden="true" /> {existing?.attachmentId ? 'Keep original paystub' : 'Remove selected file'}
            </button>
          </div>}
        </div>
        {hasAttachment && <label className="pt-checkbox" htmlFor={`${prefix}-confirmed`}>
          <input id={`${prefix}-confirmed`} type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} required />
          <span>I checked these totals against my paystub.</span>
        </label>}
        <div className="pt-form-actions">
          <button className="pt-button pt-button-quiet" type="button" onClick={onCancel}>Cancel</button>
          <button className="pt-button pt-button-primary" type="submit">{saving ? 'Saving…' : existing ? 'Save changes' : 'Save paycheck'}</button>
        </div>
      </fieldset>
    </form>
  );
}
