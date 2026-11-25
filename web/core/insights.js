// Numbers behind the home-screen charts. Pure functions over the stored data.
import { allReadings, daysBetween, estimateKm, nextRound } from './schedule.js';

const percent = (used, total) => (total > 0 ? Math.round((used / total) * 100) : 0);

// Share of the interval already used: the larger of km and time.
export const lifeOf = (row) => {
  if (!row.dueDate || !row.last) return null;
  const totalDays = daysBetween(row.last.date, row.dueDate);
  const timePct = percent(totalDays - row.daysLeft, totalDays);
  const hasKm = row.dueKm !== null && row.last.km !== null && row.kmLeft !== null;
  const totalKm = hasKm ? row.dueKm - row.last.km : 0;
  const kmPct = hasKm ? percent(totalKm - row.kmLeft, totalKm) : 0;
  return { pct: Math.max(0, timePct, kmPct), timePct, kmPct, isKmLimit: kmPct > timePct };
};

const latestRealVisit = (data) => data.visits
  .filter((visit) => !visit.isKmEstimated)
  .reduce((latest, visit) => (!latest || visit.date >= latest.date ? visit : latest), null);

export const roundProgress = (data, today) => {
  const target = nextRound(data);
  const start = latestRealVisit(data) ?? { date: data.car.deliveredOn, km: 0 };
  const km = estimateKm(data, today).km;
  return {
    start,
    target,
    km,
    kmPct: percent(km - start.km, target.km - start.km),
    timePct: percent(daysBetween(start.date, today), daysBetween(start.date, target.date)),
    kmLeft: target.km - km,
    daysLeft: daysBetween(today, target.date),
  };
};

export const lifespans = (data, itemId, today) => {
  const installs = data.visits
    .filter((visit) => visit.itemIds.includes(itemId))
    .sort((a, b) => a.date.localeCompare(b.date));
  return installs.map((visit, index) => {
    const end = installs[index + 1]?.date ?? today;
    return { visit, from: visit.date, to: end, days: daysBetween(visit.date, end), isCurrent: index === installs.length - 1 };
  });
};

export const odometerSeries = (data, today) => {
  const real = allReadings(data).map((reading) => ({ ...reading, isEstimated: false }));
  const guessed = data.visits
    .filter((visit) => visit.isKmEstimated)
    .map(({ date, km }) => ({ date, km, isEstimated: true }));
  const points = [...real, ...guessed]
    .filter((point) => point.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km);
  const hasStart = points.some((point) => point.date <= data.car.deliveredOn);
  const withStart = hasStart ? points : [{ date: data.car.deliveredOn, km: 0, isEstimated: true }, ...points];
  const last = withStart[withStart.length - 1];
  return last && last.date < today
    ? [...withStart, { date: today, km: estimateKm(data, today).km, isEstimated: true }]
    : withStart;
};
