// =========================================================================
// api/config.js — отдаёт браузеру только публичные значения:
// SUPABASE_URL и SUPABASE_ANON_KEY. Service-role ключ сюда НЕ попадает.
// =========================================================================

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = process.env.SUPABASE_URL || '';
  const anon = process.env.SUPABASE_ANON_KEY || '';
  const adminEmail = process.env.SUPABASE_ADMIN_EMAIL || '';

  if (!url || !anon) {
    return res.status(500).json({
      error: 'Server is not configured. Заполните SUPABASE_URL и SUPABASE_ANON_KEY в env.',
    });
  }

  return res.status(200).json({
    supabaseUrl: url,
    supabaseAnonKey: anon,
    // email нужен на клиенте только для UX (плейсхолдер в форме логина).
    // Реальная проверка — на сервере в /api/requests.
    adminEmailHint: adminEmail,
  });
}
