import { updateInterval } from '../core/records.js';
import { field, h, parseNumber, submitting } from './dom.js';
import { clearToken, DATA_SOURCE } from './session.js';

const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

export const renderLogin = ({ onToken, message }) => {
  const input = h('input', { id: 'token', type: 'password', autocomplete: 'off', spellcheck: 'false', required: true });
  const remember = h('input', { type: 'checkbox', id: 'remember' });
  const error = h('p', { class: 'error', role: 'alert', hidden: !message }, message ?? '');
  const button = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'เชื่อมต่อ');
  const onSubmit = async (event) => {
    event.preventDefault();
    error.hidden = true;
    try {
      await submitting(button, () => onToken(input.value.trim(), remember.checked));
    } catch (failure) {
      error.textContent = failure.message;
      error.hidden = false;
    }
  };
  return h('form', { class: 'card stack', onSubmit },
    h('h1', {}, 'เชื่อมต่อข้อมูลรถ'),
    h('p', { class: 'muted' }, `ใช้ fine-grained token ที่เลือกเฉพาะ repo ${DATA_SOURCE.repo} และให้สิทธิ์ Contents: Read and write`),
    h('a', { href: TOKEN_URL, target: '_blank', rel: 'noopener noreferrer' }, 'สร้าง token บน GitHub'),
    field('GitHub token', 'token', input, 'ปกติจะหายเมื่อปิดเบราว์เซอร์'),
    h('label', { class: 'check', htmlFor: 'remember' }, remember, h('span', {}, 'จำในเครื่องส่วนตัวนี้')),
    h('p', { class: 'muted' }, 'ถ้าจำไว้ เว็บอื่นใน tipokkitkobsin.github.io จะอ่าน token ได้ จึงไม่ควรเปิดเว็บที่ไม่ไว้ใจใต้โดเมนนี้'),
    error,
    button);
};

const intervalRow = (ctx, item) => {
  const kmId = `km-${item.id}`;
  const monthId = `mo-${item.id}`;
  const km = h('input', { id: kmId, inputmode: 'numeric', value: String(item.intervalKm), 'aria-label': `${item.name} ระยะ km` });
  const months = h('input', { id: monthId, inputmode: 'numeric', value: String(item.intervalMonths), 'aria-label': `${item.name} ระยะเดือน` });
  const onChange = async () => {
    try {
      await ctx.mutate((data) => updateInterval(data, item.id, parseNumber(km.value), parseNumber(months.value)), `item: ${item.id} interval`);
      ctx.toast('บันทึกระยะแล้ว');
    } catch (failure) {
      ctx.toast(failure.message);
    }
  };
  km.addEventListener('change', onChange);
  months.addEventListener('change', onChange);
  return h('div', { class: 'interval' }, h('span', {}, item.name), km, months);
};

const backup = (data) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = h('a', { href: url, download: 'car-service-backup.json' });
  link.click();
  URL.revokeObjectURL(url);
};

export const renderSettings = (ctx) => {
  const editable = ctx.data.items.filter((item) => item.intervalKm);
  return h('div', { class: 'stack' },
    h('h1', {}, 'ตั้งค่า'),
    h('section', { class: 'card' },
      h('h2', { style: null }, 'ระยะของแต่ละรายการ'),
      h('p', { class: 'muted' }, 'แก้ตัวเลขแล้วบันทึกทันที อย่างใดถึงก่อนถือว่าครบกำหนด'),
      h('div', { class: 'interval interval-head', 'aria-hidden': 'true' },
        h('span', {}, 'รายการ'), h('span', {}, 'ทุกกี่ km'), h('span', {}, 'ทุกกี่เดือน')),
      editable.map((item) => intervalRow(ctx, item))),
    h('section', { class: 'card stack' },
      h('h2', {}, 'ข้อมูลและการเชื่อมต่อ'),
      h('p', { class: 'muted' }, `ข้อมูลอยู่ใน repo private ${DATA_SOURCE.repo}`),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', onClick: () => backup(ctx.data) }, 'ดาวน์โหลดสำรอง'),
        h('button', {
          class: 'btn btn-danger',
          type: 'button',
          onClick: () => { clearToken(); ctx.reload(); },
        }, 'ออกจากเครื่องนี้'))));
};
