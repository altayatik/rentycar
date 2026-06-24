import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabaseKey = supabaseAnonKey || supabasePublishableKey;

export const supabaseConfigError = !supabaseUrl
  ? "Missing VITE_SUPABASE_URL. Add it to .env.local and restart the dev server."
  : !supabaseKey
    ? "Missing VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY. Add one public browser key to .env.local and restart the dev server."
    : "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function usernameToPseudoEmail(input: string) {
  const value = input.trim().toLowerCase();
  return value.includes("@") ? value : `${value}@rentycar.local`;
}

export const usernameToEmail = usernameToPseudoEmail;
