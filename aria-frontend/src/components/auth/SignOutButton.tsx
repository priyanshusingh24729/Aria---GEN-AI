"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-[8px] border border-border bg-surface2 px-4 py-2 text-[0.84rem] font-medium text-text transition-colors hover:border-accent hover:text-accent"
    >
      Sign out
    </button>
  );
}
