import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ulqtxarculokvihiabgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVscXR4YXJjdWxva3ZpaGlhYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzYxMjAsImV4cCI6MjA5NTExMjEyMH0.XwLl6lNvoO9VIbUmjHdA3WbBMmFcP_usKQ3sx0TOxyc';

export const supabaseConfigured = true;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
