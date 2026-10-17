import { createClient } from '@supabase/supabase-js';

// Publishable keys are intended for browser clients. PostgreSQL RLS is the
// authorization boundary; never place a Supabase secret/service-role key here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://plsnlwskttnskhsacina.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-xZ_yRjRVa1rlaHc5em0Hg_-eEKhxai';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
