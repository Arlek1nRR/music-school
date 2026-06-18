// =========================================================================
// admin/admin.js — основная логика админ-панели.
//
// - Подключает тему (синхронизация с сайтом через localStorage).
// - Загружает списки заявок trial / consultation через /api/requests.
// - Рендерит таблицы, сортировку, поиск, изменение статуса.
// - Выход: чистит localStorage и редиректит на login.html.
// =========================================================================

import { ADMIN_TOKEN, ADMIN_TOKEN_KEY } from './auth-guard.js';

const DIRECTION_LABELS = { piano: 'Фортепиано', guitar: 'Гитара', vocal: 'Вокал' };
const STATUS_LABELS = {
  new: 'Новая',
  in_progress: 'В обработке',
  done: 'Обработана',
};

const state = {
  activeTab: 'trial',      // 'trial' | 'consultation'
  sort: 'desc',            // 'asc' | 'desc'
  search: '',
  items: { trial: [], consultation: [] },
  loading: false,
};

// ---------- ТЕМА ----------
const THEME_KEY = 'music-school-theme';
const root = document.documentElement;
const getTheme = () => {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};
const applyTheme = (theme) => {
  root.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F4ECDD' : '#0F0E1A');
};
applyTheme(getTheme());

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = root.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

// ---------- ПОЛЬЗОВАТЕЛЬ ----------
try {
  const raw = localStorage.getItem('admin_user');
  if (raw) {
    const u = JSON.parse(raw);
    if (u && u.email) document.getElementById('admin-user').textContent = u.email;
  }
} catch (e) { /* ignore */ }

// ---------- ЛОГАУТ ----------
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem('admin_user');
  window.location.replace('./login.html');
});

// ---------- API ----------
const apiFetch = async (path, opts = {}) => {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + ADMIN_TOKEN,
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) {
    // Токен протух или невалидный
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem('admin_user');
    window.location.replace('./login.html');
    return null;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || ('HTTP ' + res.status));
  }
  return data;
};

const loadTab = async (type) => {
  state.loading = true;
  render();
  try {
    const data = await apiFetch('/api/requests?type=' + type + '&sort=' + state.sort);
    if (!data) return;
    state.items[type] = data.items || [];
  } catch (e) {
    console.error('Load error', e);
    state.items[type] = [];
    alert('Не удалось загрузить заявки: ' + e.message);
  } finally {
    state.loading = false;
    render();
  }
};

const updateStatus = async (type, id, status) => {
  try {
    const data = await apiFetch('/api/requests', {
      method: 'PATCH',
      body: JSON.stringify({ type, id, status }),
    });
    if (!data) return;
    // Локально обновим элемент
    const list = state.items[type];
    const idx = list.findIndex((x) => x.id === id);
    if (idx >= 0) list[idx] = { ...list[idx], status };
    render();
  } catch (e) {
    console.error('Update error', e);
    alert('Не удалось обновить статус: ' + e.message);
    render(); // откатим select
  }
};

// ---------- РЕНДЕР ----------
const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, '0');
  return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
};

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const renderDetailsCell = (item) => {
  if (state.activeTab === 'trial') {
    const dir = item.direction
      ? `<span class="badge badge-direction-${escapeHtml(item.direction)}">${escapeHtml(DIRECTION_LABELS[item.direction] || item.direction)}</span>`
      : '<span class="cell-empty">—</span>';
    const age = item.age != null ? `${item.age} лет` : '—';
    const time = item.time ? `<div class="cell-time" style="margin-top: 4px;">⏱ ${escapeHtml(item.time)}</div>` : '';
    return `<div>${dir}</div><div class="cell-time" style="margin-top: 4px;">${escapeHtml(age)}</div>${time}`;
  }
  return '<span class="cell-empty">—</span>';
};

const renderStatusSelect = (item) => {
  return `
    <select class="status-select status-${escapeHtml(item.status)}" data-id="${escapeHtml(item.id)}">
      <option value="new" ${item.status === 'new' ? 'selected' : ''}>${STATUS_LABELS.new}</option>
      <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>${STATUS_LABELS.in_progress}</option>
      <option value="done" ${item.status === 'done' ? 'selected' : ''}>${STATUS_LABELS.done}</option>
    </select>
  `;
};

const renderRow = (item) => {
  const isNew = item.status === 'new';
  return `
    <tr class="${isNew ? 'is-new' : ''}">
      <td class="cell-name">${escapeHtml(item.name)}</td>
      <td class="cell-phone"><a href="tel:${escapeHtml(item.phone)}">${escapeHtml(item.phone)}</a></td>
      <td>${renderDetailsCell(item)}</td>
      <td class="cell-time">${formatDate(item.created_at)}</td>
      <td>${renderStatusSelect(item)}</td>
    </tr>
  `;
};

const filteredItems = () => {
  const list = state.items[state.activeTab] || [];
  const q = state.search.trim().toLowerCase();
  if (!q) return list;
  return list.filter((it) =>
    (it.name || '').toLowerCase().includes(q) ||
    (it.phone || '').toLowerCase().includes(q)
  );
};

const render = () => {
  // Колонка «детали» в шапке зависит от вкладки
  const thDetails = document.getElementById('th-details');
  thDetails.textContent = state.activeTab === 'trial' ? 'Направление / Возраст / Время' : '—';

  // Счётчики
  document.getElementById('count-trial').textContent = state.items.trial.length;
  document.getElementById('count-consultation').textContent = state.items.consultation.length;

  // Сортировка-индикатор
  document.getElementById('sort-indicator').textContent = state.sort === 'asc' ? '↑' : '↓';

  // Активная вкладка
  document.querySelectorAll('.tab').forEach((t) => {
    const active = t.dataset.tab === state.activeTab;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  const table = document.getElementById('requests-table');
  const empty = document.getElementById('empty');

  if (state.loading) {
    table.hidden = true;
    empty.hidden = false;
    empty.innerHTML = '<div class="loader"></div><div style="margin-top: 12px;">Загрузка…</div>';
    return;
  }

  const items = filteredItems();
  if (items.length === 0) {
    table.hidden = true;
    empty.hidden = false;
    empty.innerHTML = '<div class="empty-icon">∅</div><div>Заявок пока нет</div>';
    return;
  }

  empty.hidden = true;
  table.hidden = false;
  document.getElementById('requests-body').innerHTML = items.map(renderRow).join('');

  // Повесить обработчики на select'ы
  document.querySelectorAll('.status-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const status = e.target.value;
      updateStatus(state.activeTab, id, status);
    });
  });
};

// ---------- СОБЫТИЯ UI ----------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const t = tab.dataset.tab;
    if (t === state.activeTab) return;
    state.activeTab = t;
    render();
    // Если данные ещё не загружены — подгрузим
    if (state.items[t].length === 0) loadTab(t);
  });
});

document.getElementById('th-date').addEventListener('click', () => {
  state.sort = state.sort === 'asc' ? 'desc' : 'asc';
  loadTab(state.activeTab);
});

document.getElementById('search').addEventListener('input', (e) => {
  state.search = e.target.value || '';
  render();
});

document.getElementById('refresh-btn').addEventListener('click', () => {
  loadTab(state.activeTab);
});

// ---------- СТАРТ ----------
(async () => {
  // Загружаем обе вкладки сразу, чтобы счётчики и быстрое переключение работали
  await Promise.all([loadTab('trial'), loadTab('consultation')]);
})();
