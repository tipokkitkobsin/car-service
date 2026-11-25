import {
  buildStatuses, dueText, estimateKm, formatDate, formatKm, leftText, nextRound, sortByUrgency, usageOf, usageText,
} from '../core/schedule.js';
import { addReading, validateReading } from '../core/records.js';
import { field, h, icon, parseNumber, STATUS, submitting, tag } from './dom.js';

const statusRow = (row) => h('li', { class: 'row' },
  h('span', { class: 'row-name' }, row.item.name),
  h('span', { class: 'row-left' }, leftText(row)),
  h('span', { class: 'row-sub' },
    [dueText(row) || 'ยังไม่มีบันทึก', row.last?.isAssumed ? ' · ฐานจากค่าสมมติ' : ''].join(''))) ;

const section = (state, rows) => (rows.length === 0 ? null : h('section', { id: `s-${state}` },
  h('h2', {}, tag(state), h('span', { class: 'num' }, `${rows.length} รายการ`)),
  h('ul', { class: 'list' }, rows.map(statusRow))));

const okSection = (rows) => (rows.length === 0 ? null : h('details', { id: 's-ok' },
  h('summary', {}, tag('ok'), h('span', { class: 'num' }, `${rows.length} รายการ`)),
  h('ul', { class: 'list' }, rows.map(statusRow))));

const kmForm = (ctx) => {
  const input = h('input', { id: 'km-now', inputmode: 'numeric', autocomplete: 'off', placeholder: 'เช่น 115000', required: true });
  const error = h('p', { class: 'error', role: 'alert', hidden: true });
  const button = h('button', { class: 'btn btn-primary', type: 'submit' }, 'จด');
  const submit = async (event) => {
    event.preventDefault();
    error.hidden = true;
    const reading = { date: ctx.today, km: parseNumber(input.value) };
    try {
      await submitting(button, () => ctx.mutate((data) => {
        const errors = validateReading(data, reading, ctx.today);
        if (errors.length) throw new Error(errors[0]);
        return addReading(data, reading);
      }, `km: ${reading.km}`));
      ctx.toast('จดเลขไมล์แล้ว');
    } catch (failure) {
      error.textContent = failure.message;
      error.hidden = false;
      input.focus();
    }
  };
  return h('form', { class: 'stack', onSubmit: submit, novalidate: true },
    h('div', { class: 'inline-form' }, field('เลขไมล์วันนี้', 'km-now', input), button), error);
};

const hero = (ctx, rows) => {
  const estimate = estimateKm(ctx.data, ctx.today);
  const round = nextRound(ctx.data);
  const count = (state) => rows.filter((row) => row.state === state).length;
  const lastLine = estimate.last
    ? `จดจริงล่าสุด ${formatKm(estimate.last.km)} km เมื่อ ${formatDate(estimate.last.date)} · ใช้ราว ${Math.round(estimate.perDay)} km/วัน`
    : 'ยังไม่มีเลขไมล์';
  return h('section', { class: 'card hero' },
    h('div', {},
      h('h1', {}, ctx.data.car.name),
      h('p', { class: 'hero-km' }, formatKm(estimate.km), h('small', {}, estimate.isEstimated ? 'km (ประมาณ)' : 'km')),
      h('p', { class: 'muted' }, lastLine)),
    kmForm(ctx),
    h('div', { class: 'summary' }, ['overdue', 'check', 'soon'].map((state) => h('a', { href: `#s-${state}`, onClick: scrollTo(state) },
      h('b', {}, String(count(state))), h('span', {}, STATUS[state].label)))),
    h('div', { class: 'round' },
      h('span', {}, h('strong', {}, `รอบถัดไป ${formatKm(round.km)} km`), ` / ${round.years} ปี`),
      h('span', { class: 'muted' }, `ตามตาราง ${formatDate(round.date)}`)));
};

const scrollTo = (state) => (event) => {
  event.preventDefault();
  document.getElementById(`s-${state}`)?.scrollIntoView({ block: 'start' });
};

const usageRow = (ctx, row) => {
  const usage = usageOf(row, ctx.data, ctx.today);
  const visit = ctx.data.visits.find((entry) => entry.id === row.last?.visitId);
  const since = row.last
    ? `ล่าสุด ${formatDate(row.last.date)}${row.last.km === null ? '' : ` ที่ ${row.last.isKmEstimated ? '~' : ''}${formatKm(row.last.km)} km`}`
    : 'ยังไม่มีบันทึก';
  return h('li', { class: 'row' },
    h('span', { class: 'row-name' }, row.item.name),
    h('span', { class: 'row-left' }, usage ? usageText(usage) : ''),
    h('span', { class: 'row-sub' }, [since, visit?.note].filter(Boolean).join(' · ')));
};

const usageSection = (ctx, rows) => (rows.length === 0 ? null : h('section', { id: 's-usage' },
  h('h2', {}, tag('record'), h('span', {}, 'อายุการใช้งาน')),
  h('ul', { class: 'list' }, rows.map((row) => usageRow(ctx, row)))));

export const renderOverview = (ctx) => {
  const rows = sortByUrgency(buildStatuses(ctx.data, ctx.today));
  const pick = (state) => rows.filter((row) => row.state === state);
  return h('div', {},
    hero(ctx, rows),
    section('overdue', pick('overdue')),
    section('watch', pick('watch')),
    section('check', pick('check')),
    section('soon', pick('soon')),
    okSection(pick('ok')),
    usageSection(ctx, pick('record')),
    h('a', { class: 'btn btn-primary btn-block', href: '#/visit', style: null }, icon('plus'), 'บันทึกการเข้าอู่'));
};
