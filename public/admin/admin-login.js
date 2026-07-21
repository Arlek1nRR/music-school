// =========================================================================
// admin/admin-login.js — авторизация админа через Supabase Auth.
// При успехе сохраняет access_token в localStorage и редиректит на /admin/.
// =========================================================================

import { getSupabase } from '../js/supabase-client.js';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

const form = document.getElementById('login-form');
const btn = document.getElementById('login-btn');
const errBox = document.getElementById('login-error');

const showError = (msg) => {
  errBox.textContent = msg;
  errBox.hidden = false;
};
const clearError = () => {
  errBox.hidden = true;
  errBox.textContent = '';
};

const setBusy = (busy) => {
  btn.disabled = busy;
  btn.textContent = busy ? 'Входим...' : 'Войти';
};

// Если уже залогинен — сразу на главную админки
const existing = localStorage.getItem(TOKEN_KEY);
if (existing) {
  window.location.replace('./');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) return showError('Заполните email и пароль.');

  setBusy(true);
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showError('Неверный email или пароль.');
      setBusy(false);
      return;
    }
    if (!data || !data.session || !data.session.access_token) {
      showError('Сессия не получена. Попробуйте ещё раз.');
      setBusy(false);
      return;
    }
    localStorage.setItem(TOKEN_KEY, data.session.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify({
      email: data.user.email,
      id: data.user.id,
    }));
    window.location.replace('./');
  } catch (err) {
    console.error(err);
    showError('Ошибка соединения. Проверьте конфигурацию Supabase.');
    setBusy(false);
  }
});
