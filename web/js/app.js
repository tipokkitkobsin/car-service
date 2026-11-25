import { todayInBangkok } from '../core/schedule.js';
import { h, icon } from './dom.js';
import { clearToken, openStore, readToken, writeToken } from './session.js';
import { renderHistory } from './view-history.js';
import { renderOverview } from './view-overview.js';
import { renderReading } from './view-reading.js';
import { renderTimeline } from './view-timeline.js';
import { renderLogin, renderSettings } from './view-settings.js';
import { renderVisit } from './view-visit.js';

const TOAST_MS = 3500;
const TABS = [
  { hash: '#/', label: 'ภาพรวม', icon: 'gauge' },
  { hash: '#/visit', label: 'บันทึก', icon: 'plus' },
  { hash: '#/timeline', label: 'ไทม์ไลน์', icon: 'route' },
  { hash: '#/history', label: 'ประวัติ', icon: 'history' },
  { hash: '#/settings', label: 'ตั้งค่า', icon: 'settings' },
];

const main = document.getElementById('main');
const nav = document.getElementById('nav');
const toastBox = document.getElementById('toast');
let session = null;
let toastTimer = null;

const toast = (message) => {
  toastBox.textContent = message;
  toastBox.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastBox.classList.remove('show'), TOAST_MS);
};

const currentRoute = () => {
  const hash = location.hash || '#/';
  return hash.startsWith('#/') ? hash : '#/';
};

const renderNav = (route) => {
  const active = route.startsWith('#/visit/') || route.startsWith('#/reading/') ? '#/history'
    : route.startsWith('#/visit') ? '#/visit' : route;
  nav.replaceChildren(...TABS.map((tab) => h('a', {
    href: tab.hash,
    'aria-current': tab.hash === active ? 'page' : null,
  }, icon(tab.icon), tab.label)));
  nav.hidden = false;
};

const go = (hash) => {
  if (location.hash === hash) render();
  else location.hash = hash;
};

const mutate = async (change, message) => {
  const saved = await session.store.update(change, message);
  session = { ...session, data: saved.data };
  if (!document.querySelector('dialog')) render();
  return saved;
};

const viewFor = (route, ctx) => {
  if (route.startsWith('#/visit/')) return renderVisit(ctx, decodeURIComponent(route.slice('#/visit/'.length)));
  if (route === '#/visit') return renderVisit(ctx, null);
  if (route.startsWith('#/reading/')) return renderReading(ctx, route.slice('#/reading/'.length));
  if (route === '#/history') return renderHistory(ctx);
  if (route === '#/timeline') return renderTimeline(ctx);
  if (route === '#/settings') return renderSettings(ctx);
  return renderOverview(ctx);
};

function render() {
  if (!session) return;
  const route = currentRoute();
  const ctx = { data: session.data, today: todayInBangkok(), mutate, toast, go, reload: () => location.reload() };
  main.replaceChildren(viewFor(route, ctx));
  renderNav(route);
}

const showLogin = (message) => {
  session = null;
  nav.hidden = true;
  main.replaceChildren(renderLogin({ onToken: connect, message }));
};

async function connect(token, shouldRemember) {
  const store = openStore(token);
  const { data } = await store.load();
  if (shouldRemember !== undefined && !writeToken(token, shouldRemember)) {
    toast('เบราว์เซอร์นี้จำ token ไม่ได้ ต้องใส่ใหม่ทุกครั้ง');
  }
  session = { store, data };
  render();
}

const boot = async () => {
  const token = readToken();
  if (!token) {
    showLogin();
    return;
  }
  try {
    await connect(token);
  } catch (failure) {
    if (failure.code === 'auth') clearToken();
    showLogin(failure.message);
  }
};

window.addEventListener('hashchange', () => {
  render();
  if (session) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
});

if (window.top === window.self) boot();
else main.textContent = 'เปิดเว็บนี้ในแท็บของตัวเองเท่านั้น';
