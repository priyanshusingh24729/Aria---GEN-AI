import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use inside client components (forms, interactive UI).
 * Reads the public URL/anon key — safe to expose to the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
