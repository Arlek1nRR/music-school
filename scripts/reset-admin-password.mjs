// =========================================================================
// scripts/reset-admin-password.mjs
//
// One-shot: rotate the password of the admin user in Supabase Auth
// using the service-role key (auth.admin.updateUserById).
//
// USAGE (load secrets from .env, do NOT commit):
//   set -a && source .env && set +a
//   node scripts/reset-admin-password.mjs
//
// Or pass directly:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/reset-admin-password.mjs
// =========================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.SUPABASE_ADMIN_EMAIL || 'semikovnikita2007@gmail.com';

// Генерим стойкий 20-символьный пароль: A-Z, a-z, 0-9
const randomPassword = (len = 20) => {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZ' +
    'abcdefghijkmnopqrstuvwxyz' +
    '23456789';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Не заданы SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Либо положи их в .env, либо передай через env-переменные.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 1) Найти пользователя по email
const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
if (listErr) {
  console.error('Не удалось получить список пользователей:', listErr.message);
  process.exit(1);
}

const user = list.users.find((u) => (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase());
if (!user) {
  console.error(`Пользователь с email ${ADMIN_EMAIL} не найден в Auth.`);
  process.exit(1);
}

console.log(`Найден user_id: ${user.id}`);

// 2) Сгенерить новый пароль и обновить
const newPassword = randomPassword(20);
const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(user.id, {
  password: newPassword,
});

if (updErr) {
  console.error('updateUserById упал:', updErr.message);
  process.exit(1);
}

console.log('Пароль обновлён.');
console.log('----------------------------------------');
console.log(`email:    ${updated.user.email}`);
console.log(`user_id:  ${updated.user.id}`);
console.log(`new_pwd:  ${newPassword}`);
console.log('----------------------------------------');
console.log('Запиши новый пароль в безопасное место (password manager).');
console.log();
console.log('Этот пароль НЕ нужно заливать в Cloudflare через wrangler secret put —');
console.log('логин admin/admin-login.js идёт через supabase.auth.signInWithPassword');
console.log('(anon-ключ + хеш пароля на стороне Supabase). Просто используй его при входе.');
console.log();
console.log('Однако сам факт, что старый пароль был закоммичен в .env, означает');
console.log('что он скомпрометирован. Ротация (которую ты только что сделал) — это');
console.log('и есть фикс. Старый пароль "77619532Qweqw" больше не действует.');
