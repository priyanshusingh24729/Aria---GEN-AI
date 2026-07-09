"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    setSubmittedEmail(email);
    setPending(false);
  }

  if (submittedEmail) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-[1.5rem] font-bold text-text">Check your inbox</h1>
          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-text-dim">
            If an account exists for <span className="text-text">{submittedEmail}</span>, we sent
            a link to reset your password.
          </p>
        </div>
        <Link href="/login" className="text-center text-[0.85rem] text-accent2 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[1.5rem] font-bold text-text">Reset your password</h1>
        <p className="mt-1.5 text-[0.88rem] text-text-dim">
          Enter the email tied to your account and we&apos;ll send a reset link.
        </p>
      </div>

      {error && <AuthNotice variant="error">{error}</AuthNotice>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <AuthButton type="submit" pending={pending} pendingLabel="Sending…">
          Send reset link
        </AuthButton>
      </form>

      <p className="text-center text-[0.85rem] text-text-dim">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-accent2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
