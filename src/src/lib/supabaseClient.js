import { createClient } from '@supabase/supabase-js';

// Supabase холболт — URL/key .env-ээс уншина, хэзээ ч код дотор hardcode
// хийхгүй. .env файл .gitignore-т орсон тул GitHub рүү push хийгдэхгүй.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase тохиргоо дутуу байна: .env файлд VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY-г шалгана уу.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
