import { createClient } from "@supabase/supabase-js";

// Publishable key + RLS: browsers can only SELECT from public.stocks and call search_stocks().
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } },
);
