// =========================================================================
// admin/auth-guard.js — простая защита админ-страниц.
// Проверяет, что в localStorage есть admin_token. Если нет — редирект на login.
// Полноценная валидация токена — на сервере в /api/requests.
// =========================================================================

const TOKEN_KEY = 'admin_token';

const token = (() => {
  try { return localStorage.getItem(TOKEN_KEY); }
  catch (e) { return null; }
})();

if (!token) {
  // login.html лежит рядом с index.html в /admin/
  const here = window.location.pathname;
  const target = here.endsWith('/') || here.endsWith('index.html')
    ? './login.html'
    : './login.html';
  window.location.replace(target);
}

export const ADMIN_TOKEN = token;
export const ADMIN_TOKEN_KEY = TOKEN_KEY;
