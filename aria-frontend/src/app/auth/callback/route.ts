import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase sends users here after they click an email confirmation or
// password reset link, with a `code` query param to exchange for a session.
// `next` carries where to land afterwards (e.g. /update-password).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/chat";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const errorUrl = new URL("/login", origin);
  errorUrl.searchParams.set("error", "Account created successfully! Please sign in using your credentials.");
  return NextResponse.redirect(errorUrl);
}
