import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the middleware.ts convention to proxy.ts (function
// renamed from `middleware` to `proxy`). The logic is unchanged — only the
// file/function name changed. Renaming this is not optional: Next 16 does
// not run middleware.ts, which would mean zero route protection.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg|ico)$).*)",
  ],
};