import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, calculatePeriod, estimateNet, getPeriodStart, shiftHours } from '../src/lib/paytrack/calculate';
import { defaultStore, validateStore, type Paycheck, type Shift } from '../src/lib/paytrack/model';

// Check elapsed time over the employer's local workweek, including DST transitions.
process.env.TZ = 'America/New_York';

function shift(date: string, hours: number, id = date): Shift {
  const start = new Date(`${date}T08:00:00`);
  return { id, start: start.toISOString(), end: new Date(start.getTime() + hours * 3600000).toISOString(), breaks: [], manualBreakMinutes: 0, note: '' };
}
function paycheck(id: string, gross: number, net: number, payDate = '2026-10-16'): Paycheck {
  return { id, gross, net, payDate, periodStart: '2026-10-01', periodEnd: '2026-10-14', note: '' };
}
const settings = { ...defaultStore(new Date('2026-10-04T12:00:00')).settings, periodAnchor: '2026-10-04' };
test('weekly overtime is calculated separately rather than using an 80-hour threshold', () => {
  const shifts = [0, 1, 2, 3, 4].map(i => shift(addDays('2026-10-05', i), 9));
  shifts.push(...[0, 1, 2, 3, 4].map(i => shift(addDays('2026-10-12', i), 7)));
  const result = calculatePeriod(shifts, '2026-10-04', settings);
  assert.equal(result.totalHours, 80);
  assert.equal(result.regularHours, 75);
  assert.equal(result.overtimeHours, 5);
  assert.equal(result.gross, 1278.75);
  assert.equal(result.weeks[0].overtimeHours, 5);
  assert.equal(result.weeks[1].overtimeHours, 0);
});

test('boundary-week hours before the pay period still contribute to overtime', () => {
  const shifts = [0, 1, 2, 3].map(i => shift(addDays('2026-10-04', i), 12));
  const result = calculatePeriod(shifts, '2026-10-05', settings);
  assert.equal(result.weeks.length, 3);
  assert.equal(result.totalHours, 36);
  assert.equal(result.regularHours, 28);
  assert.equal(result.overtimeHours, 8);
});

test('overnight shifts and timed breaks are split at local workweek boundaries', () => {
  const value: Shift = { id: 'night', start: new Date('2026-10-10T22:00:00').toISOString(), end: new Date('2026-10-11T02:00:00').toISOString(), breaks: [{ start: new Date('2026-10-10T23:30:00').toISOString(), end: new Date('2026-10-11T00:30:00').toISOString() }], manualBreakMinutes: 0, note: '' };
  const result = calculatePeriod([value], '2026-10-04', settings);
  assert.equal(result.weeks[0].totalHours, 1.5);
  assert.equal(result.weeks[1].totalHours, 1.5);
  assert.equal(shiftHours(value), 3);
});

test('untimed unpaid breaks are deducted proportionally across week boundaries', () => {
  const value: Shift = { id: 'night', start: new Date('2026-10-10T22:00:00').toISOString(), end: new Date('2026-10-11T02:00:00').toISOString(), breaks: [], manualBreakMinutes: 30, note: '' };
  const result = calculatePeriod([value], '2026-10-04', settings);
  assert.equal(result.weeks[0].totalHours, 1.75);
  assert.equal(result.weeks[1].totalHours, 1.75);
});

test('elapsed hours account for spring-forward and fall-back changes', () => {
  const spring = { ...shift('2026-03-08', 1), start: '2026-03-08T01:00:00-05:00', end: '2026-03-08T04:00:00-04:00' };
  const fall = { ...shift('2026-11-01', 1), start: '2026-11-01T00:00:00-04:00', end: '2026-11-01T04:00:00-05:00' };
  assert.equal(shiftHours(spring), 2);
  assert.equal(shiftHours(fall), 5);
  assert.equal(calculatePeriod([spring], '2026-03-01', settings).totalHours, 2);
  assert.equal(calculatePeriod([fall], '2026-10-25', settings).totalHours, 5);
});

test('calendar periods remain 14 days across DST and work before the anchor', () => {
  assert.equal(addDays('2026-03-01', 14), '2026-03-15');
  assert.equal(getPeriodStart('2026-03-14', '2026-03-01'), '2026-03-01');
  assert.equal(getPeriodStart('2026-03-15', '2026-03-01'), '2026-03-15');
  assert.equal(getPeriodStart('2026-02-28', '2026-03-01'), '2026-02-15');
});

test('configured weekday controls overtime reset independently of period anchor', () => {
  const result = calculatePeriod([shift('2026-10-04', 12), shift('2026-10-05', 12)], '2026-10-04', { ...settings, weekStartsOn: 1, overtimeThreshold: 10 });
  assert.equal(result.weeks[0].start, '2026-09-28');
  assert.equal(result.weeks[0].overtimeHours, 2);
  assert.equal(result.weeks[1].overtimeHours, 2);
});

test('historical estimates use a gross-weighted ratio instead of averaging percentages', () => {
  const result = estimateNet(1000, [paycheck('a', 100, 50), paycheck('b', 900, 810)], settings);
  assert.equal(result.net, 860);
  assert.equal(result.percent, 86);
  assert.equal(result.samples, 2);
  assert.equal(result.source, 'history');
});

test('only ten most recent eligible records inform historical estimates', () => {
  const records = [paycheck('old', 10000, 0, '2026-01-01')];
  records.push(...Array.from({ length: 10 }, (_, i) => paycheck(String(i), 100, 90, addDays('2026-10-01', i))));
  records.push(paycheck('zero', 0, 0, '2026-10-30'));
  const result = estimateNet(200, records, settings);
  assert.equal(result.samples, 10);
  assert.equal(result.net, 180);
});

test('manual estimates support zero percent, while missing history remains unknown', () => {
  assert.deepEqual(estimateNet(500, [], settings), { net: null, percent: null, samples: 0, source: 'none' });
  assert.deepEqual(estimateNet(500, [], { ...settings, estimateMode: 'manual', manualNetPercent: 0 }), { net: 0, percent: 0, samples: 0, source: 'manual' });
  assert.equal(estimateNet(123.45, [], { ...settings, estimateMode: 'manual', manualNetPercent: 81.23 }).net, 100.28);
});

test('valid backups round-trip without retaining arbitrary imported properties', () => {
  const store = defaultStore();
  store.shifts = [shift('2026-10-05', 8)];
  store.paychecks = [paycheck('a', 1000, 850)];
  assert.deepEqual(validateStore({ ...store, extra: 'ignored' }), store);
});

test('imports reject invalid dates, infinite amounts, excessive breaks, and duplicate IDs', () => {
  assert.throws(() => validateStore({ ...defaultStore(), settings: { ...settings, periodAnchor: '2026-02-30' } }), /calendar date/);
  assert.throws(() => validateStore({ ...defaultStore(), settings: { ...settings, regularRate: Infinity } }), /Regular rate/);
  assert.throws(() => validateStore({ ...defaultStore(), shifts: [{ ...shift('2026-10-05', 1), manualBreakMinutes: 61 }] }), /exceed/);
  assert.throws(() => validateStore({ ...defaultStore(), paychecks: [paycheck('a', 100, 90), paycheck('a', 100, 90)] }), /unique/);
});

test('imports reject overlapping shifts and breaks, reversed times, and net above gross', () => {
  const first = shift('2026-10-05', 8);
  assert.throws(() => validateStore({ ...defaultStore(), shifts: [first, { ...first, id: 'other' }] }), /overlap/);
  assert.throws(() => validateStore({ ...defaultStore(), shifts: [{ ...first, end: first.start }] }), /more than zero/);
  assert.throws(() => validateStore({ ...defaultStore(), shifts: [{ ...first, breaks: [{ start: first.start, end: first.end }, { start: first.start, end: first.end }] }] }), /overlap/);
  assert.throws(() => validateStore({ ...defaultStore(), paychecks: [paycheck('a', 100, 101)] }), /exceed gross/);
});

test('imports reject duplicate paycheck periods even if IDs and amounts differ', () => {
  assert.throws(() => validateStore({ ...defaultStore(), paychecks: [paycheck('a', 100, 90), paycheck('b', 200, 180)] }), /pay date and period already exists/);
  const distinctDate = paycheck('b', 200, 180, '2026-10-17');
  assert.equal(validateStore({ ...defaultStore(), paychecks: [paycheck('a', 100, 90), distinctDate] }).paychecks.length, 2);
  const distinctPeriod = { ...paycheck('c', 300, 270), periodStart: '2026-09-17', periodEnd: '2026-09-30' };
  assert.equal(validateStore({ ...defaultStore(), paychecks: [paycheck('a', 100, 90), distinctPeriod] }).paychecks.length, 2);
});

test('imports reject an active shift overlapping saved time', () => {
  const completed = shift('2026-10-05', 8);
  assert.throws(() => validateStore({ ...defaultStore(), shifts: [completed], activeShift: { start: completed.start, breaks: [], breakStartedAt: null } }), /active shift/);
  const active = { start: completed.end, breaks: [], breakStartedAt: null };
  assert.deepEqual(validateStore({ ...defaultStore(), shifts: [completed], activeShift: active }).activeShift, active);
});
