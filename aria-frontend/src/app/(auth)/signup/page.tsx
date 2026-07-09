"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { createClient } from "@/lib/supabase/client";

function describeError(message: string): string {
  if (message.toLowerCase().includes("already registered")) {
    return "An account already exists for that email. Try signing in instead.";
  }
  if (message.toLowerCase().includes("password")) {
    return message;
  }
  return message;
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(describeError(error.message));
      setPending(false);
      return;
    }

    // If email confirmation is off in the Supabase project, signUp already
    // returns a live session — skip the "check your inbox" step entirely.
    if (data.session) {
      router.push("/chat");
      router.refresh();
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
            We sent a confirmation link to <span className="text-text">{submittedEmail}</span>.
            Open it to finish creating your account.
          </p>
        </div>
        <AuthNotice variant="success">
          Didn&apos;t get it? Check your spam folder, or{" "}
          <button
            onClick={() => setSubmittedEmail(null)}
            className="font-medium text-accent2 hover:underline"
          >
            try a different email
          </button>
          .
        </AuthNotice>
        <Link href="/login" className="text-center text-[0.85rem] text-accent2 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[1.5rem] font-bold text-text">Create your account</h1>
        <p className="mt-1.5 text-[0.88rem] text-text-dim">
          Start chatting, indexing documents, and generating images with Aria.
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
        <AuthInput
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <AuthInput
          id="confirm-password"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <AuthButton type="submit" pending={pending} pendingLabel="Creating account…">
          Create account
        </AuthButton>
      </form>

      <p className="text-center text-[0.85rem] text-text-dim">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
