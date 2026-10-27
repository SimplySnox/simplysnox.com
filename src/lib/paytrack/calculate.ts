import { localDate, parseDate, type Paycheck, type Settings, type Shift } from './model';

export { localDate, defaultStore, validateStore } from './model';

const HOUR = 3600000;
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function addDays(date: string, days: number): string {
  const value = parseDate(date);
  value.setDate(value.getDate() + days);
  return localDate(value);
}

function calendarDay(date: string): number {
  const value = parseDate(date);
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86400000;
}

export function getPeriodStart(date: string, anchor: string): string {
  return addDays(anchor, Math.floor((calendarDay(date) - calendarDay(anchor)) / 14) * 14);
}

interface Segment { start: number; end: number; factor: number }

/** Actual breaks are removed exactly. Untimed manual breaks are spread proportionally
 * over the remaining shift, including when a shift crosses a workweek boundary. */
function paidSegments(shift: Shift): Segment[] {
  const start = Date.parse(shift.start), end = Date.parse(shift.end);
  const pauses = shift.breaks.slice().sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const result: Segment[] = [];
  let cursor = start;
  for (const pause of pauses) {
    if (Date.parse(pause.start) > cursor) result.push({ start: cursor, end: Date.parse(pause.start), factor: 1 });
    cursor = Date.parse(pause.end);
  }
  if (cursor < end) result.push({ start: cursor, end, factor: 1 });
  const remaining = result.reduce((sum, item) => sum + item.end - item.start, 0);
  const factor = remaining > 0 ? Math.max(0, (remaining - shift.manualBreakMinutes * 60000) / remaining) : 0;
  return result.map(item => ({ ...item, factor }));
}

export function shiftHours(shift: Shift): number {
  return paidSegments(shift).reduce((sum, item) => sum + (item.end - item.start) * item.factor / HOUR, 0);
}

export interface WeekResult {
  start: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  gross: number;
}
export interface PeriodResult {
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  gross: number;
  weeks: WeekResult[];
}

/** Overtime is accrued in chronological order inside each configured workweek.
 * Hours outside the selected 14 days still count toward its boundary-week threshold. */
export function calculatePeriod(shifts: Shift[], periodStart: string, settings: Settings): PeriodResult {
  const periodBeginning = parseDate(periodStart), beginning = periodBeginning.getTime();
  const end = parseDate(addDays(periodStart, 14)).getTime();
  const offset = (periodBeginning.getDay() - settings.weekStartsOn + 7) % 7;
  let weekStart = addDays(periodStart, -offset);
  const segments = shifts.flatMap(paidSegments).sort((a, b) => a.start - b.start);
  const weeks: WeekResult[] = [];
  while (parseDate(weekStart).getTime() < end) {
    const weekBeginning = parseDate(weekStart).getTime();
    const nextWeek = addDays(weekStart, 7), weekEnd = parseDate(nextWeek).getTime();
    let priorHours = 0, regularHours = 0, overtimeHours = 0;
    for (const segment of segments) {
      const a = Math.max(segment.start, weekBeginning), b = Math.min(segment.end, weekEnd);
      if (b <= a) continue;
      const selectedStart = Math.max(a, beginning), selectedEnd = Math.min(b, end);
      if (selectedEnd > selectedStart) {
        const selectedHours = (selectedEnd - selectedStart) * segment.factor / HOUR;
        const hoursBeforeSelection = priorHours + (selectedStart - a) * segment.factor / HOUR;
        const regular = Math.min(selectedHours, Math.max(0, settings.overtimeThreshold - hoursBeforeSelection));
        regularHours += regular;
        overtimeHours += selectedHours - regular;
      }
      priorHours += (b - a) * segment.factor / HOUR;
    }
    // Floating-point addition must not leave a microscopic negative amount.
    overtimeHours = Math.max(0, overtimeHours);
    weeks.push({ start: weekStart, regularHours, overtimeHours, totalHours: regularHours + overtimeHours, gross: roundMoney(regularHours * settings.regularRate + overtimeHours * settings.overtimeRate) });
    weekStart = nextWeek;
  }
  const regularHours = weeks.reduce((sum, item) => sum + item.regularHours, 0);
  const overtimeHours = weeks.reduce((sum, item) => sum + item.overtimeHours, 0);
  return { regularHours, overtimeHours, totalHours: regularHours + overtimeHours, gross: roundMoney(weeks.reduce((sum, item) => sum + item.gross, 0)), weeks };
}

export interface NetEstimate {
  net: number | null;
  percent: number | null;
  samples: number;
  source: 'history' | 'manual' | 'none';
}

/** A historical take-home ratio, not a tax or withholding calculation. */
export function estimateNet(gross: number, paychecks: Paycheck[], settings: Settings): NetEstimate {
  if (settings.estimateMode === 'manual') {
    const percent = settings.manualNetPercent;
    if (percent === null || !Number.isFinite(percent) || percent < 0 || percent > 100) return { net: null, percent: null, samples: 0, source: 'none' };
    return { net: roundMoney(gross * percent / 100), percent, samples: 0, source: 'manual' };
  }
  const records = paychecks.filter(item => Number.isFinite(item.gross) && Number.isFinite(item.net) && item.gross > 0 && item.net >= 0 && item.net <= item.gross)
    .slice().sort((a, b) => b.payDate.localeCompare(a.payDate)).slice(0, 10);
  if (!records.length) return { net: null, percent: null, samples: 0, source: 'none' };
  const percent = records.reduce((sum, item) => sum + item.net, 0) / records.reduce((sum, item) => sum + item.gross, 0) * 100;
  return { net: roundMoney(gross * percent / 100), percent, samples: records.length, source: 'history' };
}
