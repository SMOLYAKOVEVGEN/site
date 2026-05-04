import { createClient } from '@supabase/supabase-js';

function getEnvValue(name: string): string {
  const importMetaEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      : undefined;

  return importMetaEnv?.[name] || process.env[name] || '';
}

const supabaseUrl = getEnvValue('PUBLIC_SUPABASE_URL');

const supabaseKey = getEnvValue('PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[supabase] Missing public environment variables: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
