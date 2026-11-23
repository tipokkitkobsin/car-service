import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowed, parseKm, recordKm, statusText } from '../bot/src/handlers.mjs';
import { makeData } from './fixture.mjs';

const config = { ownerId: 'u1', channelId: 'c1' };
const memoryStore = (initial) => {
  let current = initial;
  return {
    update: async (change) => { current = change(current); return { data: current }; },
    load: async () => ({ data: current }),
    read: () => current,
  };
};

test('parseKm accepts commas and spaces', () => {
  assert.equal(parseKm('115,000'), 115000);
  assert.equal(parseKm(' 115000 '), 115000);
});

test('parseKm rejects text and decimals', () => {
  assert.equal(parseKm('abc'), null);
  assert.equal(parseKm('115000.5'), null);
  assert.equal(parseKm('1e6'), null);
});

test('only the owner in the one channel is allowed', () => {
  assert.equal(isAllowed({ userId: 'u1', channelId: 'c1' }, config), true);
  assert.equal(isAllowed({ userId: 'u2', channelId: 'c1' }, config), false);
  assert.equal(isAllowed({ userId: 'u1', channelId: 'c2' }, config), false);
});

test('recordKm saves a valid reading', async () => {
  const store = memoryStore(makeData({ readings: [{ date: '2026-11-01', km: 100000 }] }));
  const reply = await recordKm({ raw: '101,000', store, today: '2026-11-24' });
  assert.match(reply, /101,000/);
  assert.equal(store.read().readings.length, 2);
});

test('recordKm refuses a lower km and saves nothing', async () => {
  const store = memoryStore(makeData({ readings: [{ date: '2026-11-01', km: 100000 }] }));
  const reply = await recordKm({ raw: '90000', store, today: '2026-11-24' });
  assert.match(reply, /ต่ำกว่า/);
  assert.equal(store.read().readings.length, 1);
});

test('recordKm refuses text without touching the store', async () => {
  const store = memoryStore(makeData());
  assert.match(await recordKm({ raw: 'hello', store, today: '2026-11-24' }), /ตัวเลข/);
  assert.equal(store.read().readings.length, 0);
});

test('statusText lists what is overdue', async () => {
  const store = memoryStore(makeData({ readings: [{ date: '2026-11-01', km: 121000 }] }));
  assert.match(await statusText({ store, today: '2026-11-24' }), /Plug/);
});
