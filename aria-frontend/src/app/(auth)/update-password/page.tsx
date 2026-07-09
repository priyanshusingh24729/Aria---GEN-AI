"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Use at least 6 characters for your password.");
      return;
    }

    setPending(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[1.5rem] font-bold text-text">Choose a new password</h1>
        <p className="mt-1.5 text-[0.88rem] text-text-dim">
          Make it at least 6 characters. You&apos;ll stay signed in after this.
        </p>
      </div>

      {error && <AuthNotice variant="error">{error}</AuthNotice>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <AuthInput
          id="confirm-password"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <AuthButton type="submit" pending={pending} pendingLabel="Updating…">
          Update password
        </AuthButton>
      </form>
    </div>
  );
}
