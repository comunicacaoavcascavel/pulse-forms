import { createClient } from '@supabase/supabase-js';
import { getSupabaseProjectUrl } from './config';

function isLegacyServiceRoleJwt(key: string) {
  const [, payload] = key.split('.');
  if (!payload) return false;

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(normalizedPayload, 'base64').toString('utf8'));
    return decoded?.role === 'service_role';
  } catch {
    return false;
  }
}

export function isValidServiceRoleKey(key?: string | null) {
  if (!key) return false;
  const trimmedKey = key.trim();

  if (!trimmedKey || trimmedKey.startsWith('sb_publishable_')) {
    return false;
  }

  return trimmedKey.startsWith('sb_secret_') || isLegacyServiceRoleJwt(trimmedKey);
}

export function hasServiceRoleKey() {
  return isValidServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  const supabaseUrl = getSupabaseProjectUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !isValidServiceRoleKey(serviceRoleKey)) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY precisa ser uma secret/service_role key server-only, não uma publishable/anon key.');
  }

  return createClient(supabaseUrl, serviceRoleKey!.trim(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
