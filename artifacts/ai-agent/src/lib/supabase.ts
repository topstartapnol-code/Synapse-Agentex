import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let currentUrl = import.meta.env.VITE_SUPABASE_URL || "";
let currentAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export let supabase: SupabaseClient = createClient(
  currentUrl || "https://placeholder.supabase.co",
  currentAnonKey || "placeholder"
);

let isInitialized = false;

export async function ensureSupabaseClient(): Promise<SupabaseClient> {
  if (isInitialized && currentUrl && currentAnonKey && !currentUrl.includes("placeholder")) {
    return supabase;
  }

  // If build-time vars were missing, fetch runtime configuration from /api/config
  if (!currentUrl || !currentAnonKey || currentUrl.includes("placeholder")) {
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
  }

  isInitialized = true;
  return supabase;
}
