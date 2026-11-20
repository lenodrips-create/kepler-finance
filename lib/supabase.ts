import { createClient } from "@supabase/supabase-js";

// Public anon key + RLS: browsers can only SELECT from public.stocks and call the granted functions.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);
