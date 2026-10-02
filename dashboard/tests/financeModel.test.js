import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCashflowModel } from '../src/financeModel.js';
const fixture = () => ({ start: { isoDate: '2026-09-30', date: '9/30', balance: 1000 },
  events: [{ isoDate: '2026-10-01', date: '10/1', amount: -100, type: 'fixed' },
    { isoDate: '2026-10-02', date: '10/2', amount: 300, type: 'income', label: '給与' }],
  forecast: { enabled: true, recurring: [{ id: 'rent', label: '家賃', type: 'fixed', amount: -50,
    schedule: 'month-end', start: '2026-10-01', end: '2026-11-30', note: 'fixture' }] } });
test('Tokyo midnight moves each event exactly once between future and history', () => {
  const before = buildCashflowModel(fixture(), new Date('2026-10-01T14:59:59Z'));
  const after = buildCashflowModel(fixture(), new Date('2026-10-01T15:00:00Z'));
  assert.equal(before.todayIso, '2026-10-01');
  assert.equal(before.todayPoint.balance, 900);
  assert.equal(after.todayIso, '2026-10-02');
  assert.equal(after.todayPoint.balance, 1200);
  assert.equal(before.projected.balance, 1100);
  assert.equal(after.projected.balance, 1100);
  assert.equal(after.upcomingEvents.length, 2);
  assert.equal(after.pastAndTodayEvents.length, 2);
  assert.equal(after.minimum.balance, 1100);
  assert.equal(after.baseActual.isoDate, '2026-09-30');
});
test('impossible and non-ISO dates fail instead of rolling into a different day', () => {
  for (const date of ['2026-02-30', '2026-13-01', '2026-1-2', '2026-10-02-extra']) {
    const value = fixture(); value.events[0].isoDate = date;
    assert.throws(() => buildCashflowModel(value), /日付が不正/);
  }
});
test('missing and non-finite amounts do not propagate NaN into every balance', () => {
  for (const amount of [null, '', undefined, 'unknown', Infinity]) {
    const value = fixture(); value.events[0].amount = amount;
    assert.throws(() => buildCashflowModel(value), /金額が不正/);
    const base = fixture(); base.start.balance = amount;
    assert.throws(() => buildCashflowModel(base), /金額が不正/);
  }
});
