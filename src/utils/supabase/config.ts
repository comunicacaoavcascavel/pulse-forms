const REST_SUFFIX = /\/rest\/v1\/?$/;

export function getSupabaseProjectUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(REST_SUFFIX, '');
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
}

export function getSupabasePublicConfig() {
  const url = getSupabaseProjectUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error(
      'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel antes de gerar o build.'
    );
  }

  return { url, anonKey };
}
