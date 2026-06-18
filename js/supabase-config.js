// =========================================================================
// js/supabase-config.js — единая точка получения URL и anon-ключа Supabase.
// Сначала читаем из window.__SUPABASE__ (можно зашить инлайном для статики),
// иначе подтягиваем с /api/config. Кэшируем на сессию.
// =========================================================================

let cached = null;

export async function getSupabaseConfig() {
  if (cached) return cached;

  if (typeof window !== 'undefined' && window.__SUPABASE__ && window.__SUPABASE__.url && window.__SUPABASE__.anonKey) {
    cached = {
      supabaseUrl: window.__SUPABASE__.url,
      supabaseAnonKey: window.__SUPABASE__.anonKey,
      adminEmailHint: window.__SUPABASE__.adminEmail || '',
    };
    return cached;
  }

  const res = await fetch('/api/config', { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error('Не удалось получить конфигурацию Supabase: ' + res.status);
  }
  cached = await res.json();
  return cached;
}
