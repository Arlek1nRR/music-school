// =========================================================================
// src/index.js — Cloudflare Worker entrypoint.
//
// Routes:
//   GET  /api/config      → { supabaseUrl, supabaseAnonKey, adminEmailHint }
//   POST /api/requests    → create trial / consultation request (public)
//   GET  /api/requests    → list requests (admin only, requires bearer token)
//   PATCH /api/requests   → update status (admin only)
//   <anything else>       → static asset from the assets/ binding
//
// Logic is a verbatim port of the previous Vercel serverless functions
// (api/config.mjs, api/requests.mjs). Only the transport changed:
//   process.env.X  → env.X
//   req.query      → new URL(request.url).searchParams
//   req.body       → await request.json()
//   res.status(..) → new Response(JSON.stringify(..), { status, headers })
// =========================================================================

import { createClient } from '@supabase/supabase-js';

// ---------- CORS ----------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
};

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });

// ---------- константы ----------
const TABLES = {
  trial: 'trial_lesson_requests',
  consultation: 'teacher_consultation_requests',
};

const STATUSES = ['new', 'in_progress', 'done'];

// ---------- утилиты ----------
const requireEnv = (env) => {
  const missing = [];
  if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!env.SUPABASE_ADMIN_EMAIL) missing.push('SUPABASE_ADMIN_EMAIL');
  if (missing.length) {
    const err = new Error('Server is not configured. Missing env: ' + missing.join(', '));
    err.statusCode = 500;
    throw err;
  }
};

const getServiceClient = (env) =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// Создаёт клиент с переданным пользовательским токеном и возвращает user или null.
const getUserFromRequest = async (request, env) => {
  const auth = request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();

  // Валидируем токен через anon-клиент с заголовком Authorization
  const userClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user;
};

const isAdmin = (user, env) =>
  !!(user && user.email && user.email === env.SUPABASE_ADMIN_EMAIL);

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

  return { errors, payload: { name, phone, direction, age, time } };
};

const validateConsultation = (data) => {
  const errors = [];
  const name = clean(data.name);
  const phone = clean(data.phone);
  if (!name || name.length < 2) errors.push('name: required (min 2 chars)');
  if (!phone || phone.length < 6) errors.push('phone: required');
  return { errors, payload: { name, phone } };
};

// ---------- handlers ----------

// GET /api/config
const handleConfig = (request, env) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const url = env.SUPABASE_URL || '';
  const anon = env.SUPABASE_ANON_KEY || '';
  const adminEmail = env.SUPABASE_ADMIN_EMAIL || '';

  if (!url || !anon) {
    return jsonResponse(500, {
      error: 'Server is not configured. Заполните SUPABASE_URL и SUPABASE_ANON_KEY через `wrangler secret put`.',
    });
  }

  return jsonResponse(200, {
    supabaseUrl: url,
    supabaseAnonKey: anon,
    // email нужен на клиенте только для UX (плейсхолдер в форме логина).
    // Реальная проверка — на сервере в /api/requests.
    adminEmailHint: adminEmail,
  });
};

// /api/requests (POST/GET/PATCH)
const handleRequests = async (request, env) => {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let envError;
  try {
    requireEnv(env);
  } catch (e) {
    envError = e;
  }
  if (envError) {
    return jsonResponse(envError.statusCode || 500, {
      error: envError.message,
      hint: 'Заполните SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ADMIN_EMAIL через `wrangler secret put` / vars.',
    });
  }

  const supabase = getServiceClient(env);
  const url = new URL(request.url);

  try {
    // ===== POST: создание заявки =====
    if (request.method === 'POST') {
      const data = (await request.json().catch(() => ({}))) || {};
      const type = data.type;
      if (!TABLES[type]) {
        return jsonResponse(400, { error: 'type must be "trial" or "consultation"' });
      }

      let result;
      if (type === 'trial') {
        const { errors, payload } = validateTrial(data);
        if (errors.length) return jsonResponse(400, { error: 'Validation failed', details: errors });
        result = await supabase.from(TABLES.trial).insert(payload).select('id, status, created_at').single();
      } else {
        const { errors, payload } = validateConsultation(data);
        if (errors.length) return jsonResponse(400, { error: 'Validation failed', details: errors });
        result = await supabase.from(TABLES.consultation).insert(payload).select('id, status, created_at').single();
      }

      if (result.error) {
        return jsonResponse(500, { error: 'DB insert failed', details: result.error.message });
      }
      return jsonResponse(201, {
        ok: true,
        id: result.data.id,
        status: result.data.status,
        created_at: result.data.created_at,
      });
    }

    // ===== GET / PATCH: только для админа =====
    const user = await getUserFromRequest(request, env);
    if (!isAdmin(user, env)) {
      return jsonResponse(401, { error: 'Unauthorized. Требуется вход администратора.' });
    }

    if (request.method === 'GET') {
      const type = (url.searchParams.get('type') || '').toString();
      if (!TABLES[type]) return jsonResponse(400, { error: 'type must be "trial" or "consultation"' });
      const sort = (url.searchParams.get('sort') || 'desc').toString().toLowerCase() === 'asc' ? 'asc' : 'desc';

      const { data, error } = await supabase
        .from(TABLES[type])
        .select('*')
        .order('created_at', { ascending: sort === 'asc' });

      if (error) return jsonResponse(500, { error: 'DB select failed', details: error.message });
      return jsonResponse(200, { ok: true, type, sort, items: data || [] });
    }

    if (request.method === 'PATCH') {
      const data = (await request.json().catch(() => ({}))) || {};
      const { id, type, status } = data;
      if (!TABLES[type]) return jsonResponse(400, { error: 'type must be "trial" or "consultation"' });
      if (!id) return jsonResponse(400, { error: 'id is required' });
      if (!STATUSES.includes(status)) {
        return jsonResponse(400, { error: 'status must be one of: ' + STATUSES.join(', ') });
      }

      const { data: updated, error } = await supabase
        .from(TABLES[type])
        .update({ status })
        .eq('id', id)
        .select('id, status')
        .single();

      if (error) return jsonResponse(500, { error: 'DB update failed', details: error.message });
      return jsonResponse(200, { ok: true, item: updated });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (e) {
    return jsonResponse(500, { error: 'Internal error', details: e && e.message ? e.message : String(e) });
  }
};

// ---------- main ----------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // /api/* — собственный роутинг
    if (pathname === '/api/config') {
      return handleConfig(request, env);
    }
    if (pathname === '/api/requests') {
      return handleRequests(request, env);
    }

    // Всё остальное — статические ассеты, привязанные wrangler'ом
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Assets binding missing', { status: 500 });
  },
};
