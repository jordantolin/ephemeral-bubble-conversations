// This file is now correctly configured to use environment variables.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ✅ Usa le env variables invece di hardcodare le chiavi
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// 🔐 Crea client con chiavi sicure e dinamiche
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ Se vuoi mantenere il controllo sui bucket in sviluppo, proteggi il check:
if (import.meta.env.DEV) {
  (async () => {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();

      if (error) {
        console.log('[DEV] Bucket check skipped. Error:', error.message);
        return;
      }

      const avatarsBucketExists = buckets.some(b => b.name === 'avatars');
      if (!avatarsBucketExists) {
        console.warn('[DEV] Missing avatars bucket. Create it in Supabase > Storage.');
      } else {
        console.log('[DEV] Avatars bucket OK');
      }
    } catch (err) {
      console.log('[DEV] Storage init failed:', err);
    }
  })();
}
