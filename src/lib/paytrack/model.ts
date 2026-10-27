export interface Settings {
  regularRate: number;
  overtimeRate: number;
  overtimeThreshold: number;
  /** Local calendar weekday, 0 = Sunday. Confirm this with your employer. */
  weekStartsOn: number;
  /** Any known first day of a 14-day pay period. */
  periodAnchor: string;
  manualNetPercent: number | null;
  estimateMode: 'history' | 'manual';
}

export interface Break { start: string; end: string }
export interface Shift {
  id: string;
  start: string;
  end: string;
  breaks: Break[];
  manualBreakMinutes: number;
  note: string;
}
export interface ActiveShift {
  start: string;
  breaks: Break[];
  breakStartedAt: string | null;
}
export interface Paycheck {
  id: string;
  payDate: string;
  periodStart: string;
  periodEnd: string;
  gross: number;
  net: number;
  note: string;
  attachmentId?: string;
  attachmentName?: string;
}
export interface Store {
  version: 1;
  settings: Settings;
  shifts: Shift[];
  paychecks: Paycheck[];
  activeShift: ActiveShift | null;
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDate(value: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Use a date in YYYY-MM-DD format.');
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2200) throw new Error('Dates must be between 1900 and 2200.');
  const result = new Date(year, month - 1, day);
  if (localDate(result) !== value) throw new Error(`Invalid calendar date: ${value}.`);
  return result;
}

export function defaultStore(now = new Date()): Store {
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  return {
    version: 1,
    settings: {
      regularRate: 15.5, overtimeRate: 23.25, overtimeThreshold: 40,
      weekStartsOn: 0, periodAnchor: localDate(sunday),
      manualNetPercent: null, estimateMode: 'history',
    },
    shifts: [], paychecks: [], activeShift: null,
  };
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function number(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label} must be a number between ${min} and ${max}.`);
  return value;
}
function text(value: unknown, max: number, label: string, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(`${label} is missing or too long.`);
  return value;
}
function date(value: unknown, label: string): string {
  const result = text(value, 10, label, true);
  parseDate(result);
  return result;
}
function timestamp(value: unknown, label: string): string {
  const result = text(value, 40, label, true);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(result) || !Number.isFinite(Date.parse(result))) throw new Error(`${label} must be a valid timestamp with a timezone.`);
  parseDate(result.slice(0, 10));
  return result;
}
function array(value: unknown, max: number, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${label} must contain at most ${max} records.`);
  return value;
}
function breaks(value: unknown, start: string, end?: string): Break[] {
  const result = array(value, 100, 'Breaks').map(value => {
    const item = object(value, 'Break');
    return { start: timestamp(item.start, 'Break start'), end: timestamp(item.end, 'Break end') };
  }).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  let previousEnd = Date.parse(start);
  for (const item of result) {
    const a = Date.parse(item.start), b = Date.parse(item.end);
    if (a < previousEnd || b <= a || (end && b > Date.parse(end))) throw new Error('Breaks must be inside their shift and cannot overlap.');
    previousEnd = b;
  }
  return result;
}

/** Validate and reconstruct imported data; never trust an arbitrary JSON backup. */
export function validateStore(value: unknown): Store {
  const root = object(value, 'Backup');
  if (root.version !== 1) throw new Error('This backup version is not supported.');
  const input = object(root.settings, 'Settings');
  const weekStartsOn = number(input.weekStartsOn, 0, 6, 'Workweek start');
  if (!Number.isInteger(weekStartsOn)) throw new Error('Workweek start must be a weekday.');
  if (input.estimateMode !== 'history' && input.estimateMode !== 'manual') throw new Error('Choose history or manual estimate mode.');
  const settings: Settings = {
    regularRate: number(input.regularRate, 0, 10000, 'Regular rate'),
    overtimeRate: number(input.overtimeRate, 0, 10000, 'Overtime rate'),
    overtimeThreshold: number(input.overtimeThreshold, 0.01, 168, 'Overtime threshold'),
    weekStartsOn, periodAnchor: date(input.periodAnchor, 'Pay-period anchor'),
    manualNetPercent: input.manualNetPercent === null ? null : number(input.manualNetPercent, 0, 100, 'Take-home percentage'),
    estimateMode: input.estimateMode,
  };
  const shifts: Shift[] = array(root.shifts, 20000, 'Shifts').map(value => {
    const item = object(value, 'Shift');
    const start = timestamp(item.start, 'Clock in'), end = timestamp(item.end, 'Clock out');
    const duration = Date.parse(end) - Date.parse(start);
    if (duration <= 0 || duration > 48 * 3600000) throw new Error('A shift must last more than zero and at most 48 hours.');
    const pauses = breaks(item.breaks, start, end);
    const manualBreakMinutes = number(item.manualBreakMinutes, 0, 48 * 60, 'Unpaid break minutes');
    const unpaid = pauses.reduce((sum, item) => sum + Date.parse(item.end) - Date.parse(item.start), 0) + manualBreakMinutes * 60000;
    if (unpaid > duration) throw new Error('Unpaid breaks cannot exceed the shift length.');
    return { id: text(item.id, 200, 'Shift ID', true), start, end, breaks: pauses, manualBreakMinutes, note: text(item.note, 2000, 'Shift note') };
  });
  const ordered = shifts.slice().sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  for (let i = 1; i < ordered.length; i++) if (Date.parse(ordered[i].start) < Date.parse(ordered[i - 1].end)) throw new Error('Shifts cannot overlap.');
  if (new Set(shifts.map(item => item.id)).size !== shifts.length) throw new Error('Shift IDs must be unique.');
  const paychecks: Paycheck[] = array(root.paychecks, 10000, 'Paychecks').map(value => {
    const item = object(value, 'Paycheck');
    const periodStart = date(item.periodStart, 'Period start'), periodEnd = date(item.periodEnd, 'Period end');
    if (periodEnd < periodStart) throw new Error('A pay period cannot end before it starts.');
    const gross = number(item.gross, 0, 1000000, 'Gross pay'), net = number(item.net, 0, 1000000, 'Take-home pay');
    if (net > gross) throw new Error('Take-home pay cannot exceed gross pay in a PayTrack earnings record.');
    const result: Paycheck = { id: text(item.id, 200, 'Paycheck ID', true), payDate: date(item.payDate, 'Pay date'), periodStart, periodEnd, gross, net, note: text(item.note, 2000, 'Paycheck note') };
    if (item.attachmentId !== undefined) result.attachmentId = text(item.attachmentId, 200, 'Attachment ID', true);
    if (item.attachmentName !== undefined) result.attachmentName = text(item.attachmentName, 255, 'Attachment name', true);
    return result;
  });
  if (new Set(paychecks.map(item => item.id)).size !== paychecks.length) throw new Error('Paycheck IDs must be unique.');
  const paycheckDates = paychecks.map(item => `${item.payDate}:${item.periodStart}:${item.periodEnd}`);
  if (new Set(paycheckDates).size !== paycheckDates.length) throw new Error('A paycheck for that pay date and period already exists. Keep one record per pay date and period.');
  let activeShift: ActiveShift | null = null;
  if (root.activeShift !== null) {
    const item = object(root.activeShift, 'Active shift');
    const start = timestamp(item.start, 'Active clock in');
    const pauses = breaks(item.breaks, start);
    const breakStartedAt = item.breakStartedAt === null ? null : timestamp(item.breakStartedAt, 'Current break start');
    if (breakStartedAt && Date.parse(breakStartedAt) < Date.parse(pauses.length ? pauses[pauses.length - 1].end : start)) throw new Error('The current break must follow earlier breaks.');
    if (ordered.some(shift => Date.parse(shift.end) > Date.parse(start))) throw new Error('An active shift cannot overlap a saved shift.');
    activeShift = { start, breaks: pauses, breakStartedAt };
  }
  return { version: 1, settings, shifts, paychecks, activeShift };
}
