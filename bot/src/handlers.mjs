// Bot logic with no Discord dependency, so it can be tested directly.
import { addReading, deleteReading, validateReading } from '../../web/core/records.js';
import { buildStatuses, dueText, estimateKm, formatKm, leftText, sortByUrgency } from '../../web/core/schedule.js';

const MAX_REPLY = 1900;

class RejectedReading extends Error {}

export const parseKm = (raw) => {
  const clean = String(raw).replace(/[,\s]/g, '');
  return /^\d{1,7}$/.test(clean) ? Number(clean) : null;
};

export const isAllowed = ({ userId, channelId }, config) => (
  userId === config.ownerId && channelId === config.channelId
);

// Returns the reply text and, when saved, the reading so the bot can offer an undo button.
export const recordKm = async ({ raw, store, today }) => {
  const km = parseKm(raw);
  if (km === null) return { text: 'กรุณาพิมพ์เลขไมล์เป็นตัวเลข เช่น 115000' };
  const reading = { date: today, km };
  try {
    await store.update((data) => {
      const errors = validateReading(data, reading, today);
      if (errors.length) throw new RejectedReading(errors[0]);
      return addReading(data, reading);
    }, `km: ${km} (discord)`);
  } catch (error) {
    if (error instanceof RejectedReading) return { text: `ไม่ได้บันทึก: ${error.message}` };
    throw error;
  }
  return {
    text: `บันทึกเลขไมล์ ${formatKm(km)} km แล้ว · ถ้าผิด ให้กด "แก้" หรือพิมพ์ /km ใหม่วันนี้ ค่าใหม่จะแทนค่าเดิม`,
    reading,
  };
};

export const undoKm = async ({ date, km, store }) => {
  try {
    await store.update((data) => {
      const isPresent = data.readings.some((entry) => entry.date === date && entry.km === km);
      if (!isPresent) throw new RejectedReading('missing');
      return deleteReading(data, date);
    }, `km: delete ${date} ${km} (discord)`);
  } catch (error) {
    if (error instanceof RejectedReading) return 'ไม่พบรายการนี้แล้ว อาจถูกแก้หรือลบไปก่อน';
    throw error;
  }
  return `ลบเลขไมล์ ${formatKm(km)} km ของวันที่ ${date} แล้ว`;
};

export const statusText = async ({ store, today }) => {
  const { data } = await store.load();
  const estimate = estimateKm(data, today);
  const rows = sortByUrgency(buildStatuses(data, today))
    .filter((row) => ['overdue', 'check', 'soon'].includes(row.state));
  const lines = rows.map((row) => `• **${row.item.name}** ${row.state === 'check' ? 'ต้องตรวจ' : `${dueText(row)} (${leftText(row)})`}`);
  const head = `เลขไมล์${estimate.isEstimated ? 'ประมาณ' : ''} ${formatKm(estimate.km)} km`;
  return [head, ...(lines.length ? lines : ['ไม่มีงานค้าง'])].join('\n').slice(0, MAX_REPLY);
};
