// =========================================================================
// js/supabase-client.js — единый инстанс supabase-js для админ-панели.
// Подгружается только на /admin/* (тяжёлый ~200 КБ), на обычных страницах
// не подключается.
// =========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getSupabaseConfig } from './supabase-config.js';

let clientPromise = null;

export function getSupabase() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const cfg = await getSupabaseConfig();
      const client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return client;
    })();
  }
  return clientPromise;
}
