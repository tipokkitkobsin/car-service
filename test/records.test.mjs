import test from 'node:test';
import assert from 'node:assert/strict';
import { addReading, addVisit, deleteVisit, validateReading, validateVisit } from '../web/core/records.js';
import { makeData, visit } from './fixture.mjs';

const today = '2026-11-24';
const withReading = () => makeData({ readings: [{ date: '2026-11-01', km: 100000 }] });

test('accepts a sensible reading', () => {
  assert.deepEqual(validateReading(withReading(), { date: today, km: 101000 }, today), []);
});

test('rejects a lower km than an earlier reading', () => {
  assert.equal(validateReading(withReading(), { date: today, km: 99000 }, today).length, 1);
});

test('rejects a higher km than a later reading', () => {
  assert.equal(validateReading(withReading(), { date: '2026-10-01', km: 100500 }, today).length, 1);
});

test('rejects a jump too large for the days passed (typo guard)', () => {
  assert.equal(validateReading(withReading(), { date: today, km: 1000000 }, today).length, 1);
});

test('rejects future dates, bad dates and non-integers', () => {
  const data = withReading();
  assert.ok(validateReading(data, { date: '2026-11-25', km: 101000 }, today).length > 0);
  assert.ok(validateReading(data, { date: '2026-02-31', km: 101000 }, today).length > 0);
  assert.ok(validateReading(data, { date: today, km: 100.5 }, today).length > 0);
});

test('visit needs at least one known item', () => {
  const data = withReading();
  const empty = visit('v1', today, 101000, []);
  const unknown = visit('v2', today, 101000, ['nope']);
  assert.ok(validateVisit(data, empty, today).length > 0);
  assert.ok(validateVisit(data, unknown, today).length > 0);
});

test('visit rejects negative cost and a round off the grid', () => {
  const data = withReading();
  const good = visit('v1', today, 101000, ['oil']);
  assert.deepEqual(validateVisit(data, good, today), []);
  assert.ok(validateVisit(data, { ...good, cost: -1 }, today).length > 0);
  assert.ok(validateVisit(data, { ...good, roundKm: 110100 }, today).length > 0);
});

test('editing a visit does not compare it with itself', () => {
  const entry = visit('v1', today, 101000, ['oil']);
  const data = makeData({ visits: [entry] });
  assert.deepEqual(validateVisit(data, { ...entry, km: 100900 }, today), []);
});

test('add and delete return new objects', () => {
  const data = Object.freeze(makeData());
  const added = addVisit(data, visit('v1', today, 101000, ['oil']));
  assert.equal(data.visits.length, 0);
  assert.equal(added.visits.length, 1);
  assert.equal(deleteVisit(added, 'v1').visits.length, 0);
  assert.equal(addReading(data, { date: today, km: 101000 }).readings.length, 1);
});

test('adding a visit with the same id replaces it', () => {
  const first = addVisit(makeData(), visit('v1', today, 101000, ['oil']));
  const second = addVisit(first, visit('v1', today, 101200, ['oil']));
  assert.equal(second.visits.length, 1);
  assert.equal(second.visits[0].km, 101200);
});
