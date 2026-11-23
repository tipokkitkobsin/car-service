import { buildStatuses, daysBetween, estimateKm, formatKm, nextRound } from '../core/schedule.js';
import { addVisit, deleteVisit, validateVisit } from '../core/records.js';
import { confirmDialog, field, h, parseNumber, submitting, tag } from './dom.js';

const SAME_ROUND_DAYS = 45;
const URGENT = new Set(['overdue', 'check', 'soon']);

const defaultRound = (data, today) => {
  const latest = data.visits[data.visits.length - 1];
  return latest && daysBetween(latest.date, today) <= SAME_ROUND_DAYS ? latest.roundKm : nextRound(data).km;
};

const roundOptions = (data, selected) => {
  const { roundKm, roundMonths } = data.car;
  const top = Math.max(nextRound(data).km, selected) + roundKm;
  const values = Array.from({ length: top / roundKm }, (_, index) => top - index * roundKm);
  return values.map((km) => h('option', { value: String(km), selected: km === selected },
    `${formatKm(km)} km / ${(km / roundKm) * roundMonths / 12} ปี`));
};

const itemChecks = (ctx, chosen) => {
  const rows = buildStatuses(ctx.data, ctx.today);
  const groups = [...new Set(rows.map((row) => row.item.group ?? 'อื่น ๆ'))];
  return groups.map((group) => [
    h('p', { class: 'group-title' }, group),
    rows.filter((row) => (row.item.group ?? 'อื่น ๆ') === group).map((row) => h('label', { class: 'check' },
      h('input', { type: 'checkbox', name: 'item', value: row.item.id, checked: chosen.has(row.item.id) }),
      h('span', {}, row.item.name),
      URGENT.has(row.state) ? tag(row.state) : null)),
  ]);
};

const readForm = (form, base) => {
  const value = (name) => form.elements[name].value.trim();
  return {
    id: base?.id ?? `v-${crypto.randomUUID()}`,
    date: value('date'),
    km: parseNumber(value('km')),
    roundKm: Number(value('roundKm')),
    itemIds: [...form.querySelectorAll('input[name=item]:checked')].map((box) => box.value),
    shop: value('shop'),
    cost: parseNumber(value('cost')),
    note: value('note'),
  };
};

const selectDue = (form, ctx) => {
  const due = new Set(buildStatuses(ctx.data, ctx.today)
    .filter((row) => row.state === 'overdue' || row.state === 'soon').map((row) => row.item.id));
  form.querySelectorAll('input[name=item]').forEach((box) => { box.checked = due.has(box.value); });
};

const shopList = (data) => h('datalist', { id: 'shops' },
  [...new Set(data.visits.map((visit) => visit.shop).filter(Boolean))].map((shop) => h('option', { value: shop })));

const removeButton = (ctx, visit) => h('button', {
  class: 'btn btn-danger',
  type: 'button',
  onClick: async () => {
    if (!await confirmDialog(`ลบการเข้าอู่วันที่ ${visit.date}? ย้อนกลับได้จากประวัติ commit เท่านั้น`, 'ลบ')) return;
    try {
      await ctx.mutate((data) => deleteVisit(data, visit.id), `visit: delete ${visit.date}`);
      ctx.toast('ลบแล้ว');
      ctx.go('#/history');
    } catch (failure) {
      ctx.toast(failure.message);
    }
  },
}, 'ลบ');

const fields = (ctx, visit, round) => [
  h('div', { class: 'grid-2' },
    field('วันที่ *', 'date', h('input', { id: 'date', name: 'date', type: 'date', max: ctx.today, value: visit?.date ?? ctx.today, required: true })),
    field('เลขไมล์ *', 'km', h('input', {
      id: 'km', name: 'km', inputmode: 'numeric', autocomplete: 'off', required: true,
      value: String(visit?.km ?? estimateKm(ctx.data, ctx.today).km),
    }))),
  field('รอบเช็คระยะ *', 'roundKm', h('select', { id: 'roundKm', name: 'roundKm' }, roundOptions(ctx.data, round)),
    'เข้าหลายอู่ในรอบเดียวกัน ให้เลือกรอบเดิม'),
  h('div', { class: 'grid-2' },
    field('อู่', 'shop', h('input', { id: 'shop', name: 'shop', list: 'shops', maxlength: 200, value: visit?.shop ?? '' })),
    field('ค่าใช้จ่าย (บาท)', 'cost', h('input', { id: 'cost', name: 'cost', inputmode: 'decimal', autocomplete: 'off', value: visit?.cost ?? '' }))),
  shopList(ctx.data),
  field('โน้ต', 'note', h('textarea', { id: 'note', name: 'note', maxlength: 1000, value: visit?.note ?? '' })),
];

export const renderVisit = (ctx, visitId) => {
  const visit = ctx.data.visits.find((entry) => entry.id === visitId);
  const round = visit?.roundKm ?? defaultRound(ctx.data, ctx.today);
  const error = h('p', { class: 'error', role: 'alert', hidden: true });
  const save = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'บันทึก');
  const onSubmit = async (event) => {
    event.preventDefault();
    error.hidden = true;
    const next = readForm(event.target, visit);
    try {
      await submitting(save, () => ctx.mutate((data) => {
        const errors = validateVisit(data, next, ctx.today);
        if (errors.length) throw new Error(errors.join(' · '));
        return addVisit(data, next);
      }, `visit: ${next.date} round ${next.roundKm}`));
      ctx.toast('บันทึกแล้ว');
      ctx.go('#/history');
    } catch (failure) {
      error.textContent = failure.message;
      error.hidden = false;
      error.scrollIntoView({ block: 'center' });
    }
  };
  const form = h('form', { class: 'stack', onSubmit, novalidate: true },
    h('h1', {}, visit ? 'แก้การเข้าอู่' : 'บันทึกการเข้าอู่'),
    fields(ctx, visit, round),
    h('fieldset', { class: 'card' },
      h('legend', {}, 'งานที่ทำ *'),
      h('button', { class: 'btn', type: 'button', onClick: () => selectDue(form, ctx) }, 'เลือกงานที่ถึงกำหนด'),
      itemChecks(ctx, new Set(visit?.itemIds ?? []))),
    error,
    save,
    visit ? removeButton(ctx, visit) : null);
  return form;
};
