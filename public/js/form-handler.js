// =========================================================================
// js/form-handler.js — перехватывает submit на <form data-form>,
// сериализует поля и отправляет POST /api/requests.
// Работает и для кастомных select'ов: читает значение из скрытого input,
// который создаёт main.js (data-select-hidden), либо из нативного <select>.
// =========================================================================

const DIRECTION_LABELS = { piano: 'Фортепиано', guitar: 'Гитара', vocal: 'Вокал' };

const findSelectValue = (form) => {
  // 1) Скрытый input из main.js (data-select-hidden)
  const hidden = form.querySelector('input[type="hidden"][data-select-hidden]');
  if (hidden && hidden.value) return hidden.value;
  // 2) Нативный select
  const sel = form.querySelector('select');
  if (sel && sel.value) return sel.value;
  return '';
};

const collectFormData = (form) => {
  const data = {};
  // явные поля
  ['name', 'phone', 'age', 'time'].forEach((key) => {
    const el = form.querySelector(`[name="${key}"]`);
    if (el) data[key] = el.value.trim();
  });
  // direction (кастомный select)
  const dir = form.querySelector('[name="direction"]');
  if (dir) {
    data.direction = findSelectValue(form);
  }
  return data;
};

const determineType = (form, data) => {
  // 1) Явный data-атрибут
  const explicit = (form.getAttribute('data-form-type') || '').toLowerCase();
  if (explicit === 'trial' || explicit === 'consultation') return explicit;
  // 2) Эвристика: если есть direction/age/time — это пробный урок
  if (data.direction || data.age || data.time !== undefined) return 'trial';
  return 'consultation';
};

const showStatus = (btn, text, success) => {
  if (!btn) return;
  btn.disabled = true;
  const original = btn.dataset._orig || btn.textContent;
  btn.dataset._orig = original;
  btn.textContent = text;
  btn.style.background = success
    ? 'linear-gradient(135deg, #5DEFA0, #25D366)'
    : 'linear-gradient(135deg, #E76A6A, #C0392B)';
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
    btn.style.background = '';
  }, 3000);
};

const handler = async (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();

  const data = collectFormData(form);
  const type = determineType(form, data);
  data.type = type;

  const btn = form.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Отправляем...';
  }

  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Form submit failed', result);
      showStatus(btn, '✕ Ошибка отправки', false);
      return;
    }
    showStatus(btn, '✓ Заявка принята', true);
    form.reset();
    // После reset() подтянуть плейсхолдеры кастомного select
    form.dispatchEvent(new Event('reset', { bubbles: true }));
  } catch (err) {
    console.error(err);
    showStatus(btn, '✕ Нет связи с сервером', false);
  }
};

document.addEventListener('submit', handler, true);

// Экспорт для отладки в консоли (необязательно)
export const __debug = { DIRECTION_LABELS, determineType };
