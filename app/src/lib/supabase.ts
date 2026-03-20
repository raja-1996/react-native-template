import { createClient } from "@supabase/supabase-js";

// Only used for Realtime subscriptions — all other operations go through FastAPI
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "http://localhost:54321";

// Prefer new-style publishable key; fall back to legacy anon key
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
