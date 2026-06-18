// =========================================================================
// api/requests.js — единый serverless endpoint для всех операций с заявками.
//
// POST   /api/requests                  — создать заявку (открыто для всех)
// GET    /api/requests?type=trial       — список trial-заявок      (только админ)
// GET    /api/requests?type=consultation — список консультаций     (только админ)
// PATCH  /api/requests                  — обновить статус          (только админ)
//
// Авторизация: Authorization: Bearer <supabase access_token>
// =========================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ADMIN_EMAIL = process.env.SUPABASE_ADMIN_EMAIL;

const TABLES = {
  trial: 'trial_lesson_requests',
  consultation: 'teacher_consultation_requests',
};

const STATUSES = ['new', 'in_progress', 'done'];

// ---------- утилиты ----------

const json = (res, status, body) => {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(body));
};

const requireEnv = () => {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_ADMIN_EMAIL) missing.push('SUPABASE_ADMIN_EMAIL');
  if (missing.length) {
    const err = new Error('Server is not configured. Missing env: ' + missing.join(', '));
    err.statusCode = 500;
    throw err;
  }
};

const getServiceClient = () =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// Создаёт клиент с переданным пользовательским токеном и возвращает user или null.
const getUserFromRequest = async (req) => {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();

  // Валидируем токен через anon-клиент с заголовком Authorization
  const userClient = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user;
};

const isAdmin = (user) => user && user.email && user.email === SUPABASE_ADMIN_EMAIL;

// ---------- валидация ----------

const clean = (v) => (typeof v === 'string' ? v.trim() : v);

const validateTrial = (data) => {
  const errors = [];
  const name = clean(data.name);
  const phone = clean(data.phone);
  const direction = clean(data.direction);
  const ageRaw = data.age;
  const time = clean(data.time) || null;

  if (!name || name.length < 2) errors.push('name: required (min 2 chars)');
  if (!phone || phone.length < 6) errors.push('phone: required');
  if (!['piano', 'guitar', 'vocal'].includes(direction)) errors.push('direction: must be piano|guitar|vocal');
  const age = Number.parseInt(ageRaw, 10);
  if (!Number.isFinite(age) || age < 3 || age > 99) errors.push('age: integer 3..99');

  return {
    errors,
    payload: { name, phone, direction, age, time },
  };
};

const validateConsultation = (data) => {
  const errors = [];
  const name = clean(data.name);
  const phone = clean(data.phone);
  if (!name || name.length < 2) errors.push('name: required (min 2 chars)');
  if (!phone || phone.length < 6) errors.push('phone: required');
  return { errors, payload: { name, phone } };
};

// ---------- handler ----------

export default async function handler(req, res) {
  // CORS для админ-фронта (тот же origin, но на всякий случай)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  let envError;
  try {
    requireEnv();
  } catch (e) {
    envError = e;
  }
  if (envError) {
    return json(res, envError.statusCode || 500, {
      error: envError.message,
      hint: 'Создайте .env на основе .env.example и заполните SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ADMIN_EMAIL.',
    });
  }

  const supabase = getServiceClient();

  try {
    // ===== POST: создание заявки =====
    if (req.method === 'POST') {
      const data = req.body || {};
      const type = data.type;
      if (!TABLES[type]) {
        return json(res, 400, { error: 'type must be "trial" or "consultation"' });
      }

      let result;
      if (type === 'trial') {
        const { errors, payload } = validateTrial(data);
        if (errors.length) return json(res, 400, { error: 'Validation failed', details: errors });
        result = await supabase.from(TABLES.trial).insert(payload).select('id, status, created_at').single();
      } else {
        const { errors, payload } = validateConsultation(data);
        if (errors.length) return json(res, 400, { error: 'Validation failed', details: errors });
        result = await supabase.from(TABLES.consultation).insert(payload).select('id, status, created_at').single();
      }

      if (result.error) {
        return json(res, 500, { error: 'DB insert failed', details: result.error.message });
      }
      return json(res, 201, { ok: true, id: result.data.id, status: result.data.status, created_at: result.data.created_at });
    }

    // ===== GET / PATCH: только для админа =====
    const user = await getUserFromRequest(req);
    if (!isAdmin(user)) {
      return json(res, 401, { error: 'Unauthorized. Требуется вход администратора.' });
    }

    if (req.method === 'GET') {
      const type = (req.query.type || '').toString();
      if (!TABLES[type]) return json(res, 400, { error: 'type must be "trial" or "consultation"' });
      const sort = (req.query.sort || 'desc').toString().toLowerCase() === 'asc' ? 'asc' : 'desc';

      const { data, error } = await supabase
        .from(TABLES[type])
        .select('*')
        .order('created_at', { ascending: sort === 'asc' });

      if (error) return json(res, 500, { error: 'DB select failed', details: error.message });
      return json(res, 200, { ok: true, type, sort, items: data || [] });
    }

    if (req.method === 'PATCH') {
      const data = req.body || {};
      const { id, type, status } = data;
      if (!TABLES[type]) return json(res, 400, { error: 'type must be "trial" or "consultation"' });
      if (!id) return json(res, 400, { error: 'id is required' });
      if (!STATUSES.includes(status)) {
        return json(res, 400, { error: 'status must be one of: ' + STATUSES.join(', ') });
      }

      const { data: updated, error } = await supabase
        .from(TABLES[type])
        .update({ status })
        .eq('id', id)
        .select('id, status')
        .single();

      if (error) return json(res, 500, { error: 'DB update failed', details: error.message });
      return json(res, 200, { ok: true, item: updated });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return json(res, 500, { error: 'Internal error', details: e && e.message ? e.message : String(e) });
  }
}
