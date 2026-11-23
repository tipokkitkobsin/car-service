// Decides what to send. Sending and saving are the caller's job.
import { daysBetween } from './schedule.js';

const LAST_STAGE_DAYS = 7;
const LAST_STAGE_KM = 300;
const ASK_KM_EVERY_DAYS = 30;
const MONDAY = 1;

const stageFor = (row) => (
  row.daysLeft <= LAST_STAGE_DAYS || (row.kmLeft !== null && row.kmLeft <= LAST_STAGE_KM) ? 2 : 1
);
const keyFor = (row) => `${row.item.id}:${row.dueDate}:${row.dueKm ?? ''}`;
const isMonday = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay() === MONDAY;
const isDue = (since, today) => !since || daysBetween(since, today) >= ASK_KM_EVERY_DAYS;

const planSoon = (rows, sent) => {
  const soon = rows.filter((row) => row.state === 'soon');
  const nextSent = Object.fromEntries(soon.map((row) => [
    keyFor(row), Math.max(stageFor(row), sent[keyFor(row)] ?? 0),
  ]));
  const fresh = soon.filter((row) => stageFor(row) > (sent[keyFor(row)] ?? 0));
  return { fresh, nextSent };
};

export const planReminders = ({ rows, today, lastReadingDate, estimateKm, state = {} }) => {
  const { fresh, nextSent } = planSoon(rows, state.sent ?? {});
  const overdue = rows.filter((row) => row.state === 'overdue');
  const shouldDigest = overdue.length > 0 && isMonday(today) && state.lastDigest !== today;
  const shouldAsk = isDue(lastReadingDate, today) && isDue(state.lastAsk, today);
  const messages = [
    ...(fresh.length ? [{ kind: 'soon', rows: fresh }] : []),
    ...(shouldDigest ? [{ kind: 'overdue', rows: overdue }] : []),
    ...(shouldAsk ? [{ kind: 'askKm', estimateKm, lastReadingDate }] : []),
  ];
  const nextState = {
    sent: nextSent,
    lastDigest: shouldDigest ? today : state.lastDigest ?? null,
    lastAsk: shouldAsk ? today : state.lastAsk ?? null,
  };
  return { messages, nextState };
};
