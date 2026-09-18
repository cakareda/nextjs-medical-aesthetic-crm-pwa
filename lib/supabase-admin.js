import { createClient } from '@supabase/supabase-js';

// Sadece sunucu tarafında kullanılmalı: service role key RLS'i atlar.
// İstemciye asla gönderilmemeli.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export const STORAGE_BUCKET = 'patient-media';
