import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://vuqywoeqprllevvyzwtd.supabase.co";

let currentUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
let currentAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export let supabase: SupabaseClient = createClient(
  currentUrl,
  currentAnonKey || "sb_publishable_placeholder"
);

let isInitialized = false;

export async function ensureSupabaseClient(): Promise<SupabaseClient> {
  if (isInitialized && currentAnonKey) {
    return supabase;
  }

  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        currentUrl = data.supabaseUrl;
        currentAnonKey = data.supabaseAnonKey;
        supabase = createClient(currentUrl, currentAnonKey);
        isInitialized = true;
        return supabase;
      }
    }
  } catch {
    /* ignore fetch error */
  }

  isInitialized = true;
  return supabase;
}
