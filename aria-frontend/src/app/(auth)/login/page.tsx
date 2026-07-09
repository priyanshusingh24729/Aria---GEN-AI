
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense, useState } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { createClient } from "@/lib/supabase/client";
import { AIBackdrop } from "@/components/auth/ai-backdrop";
import { GlassAuthCard } from "@/components/auth/glass-auth-card";
import { FloatingLogo } from "@/components/auth/floating-logo";
import { FieldGlow } from "@/components/auth/holo-field";
import { FxButton } from "@/components/auth/fx-button";

// ─────────────────────────────────────────────────────────────────────────
// Everything in this function is UNCHANGED from the original implementation:
// same validation, same Supabase call, same routing, same error handling.
// ─────────────────────────────────────────────────────────────────────────
function describeError(message: string): string {
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "That email and password don't match. Try again or reset your password below.";
  }
  if (message.toLowerCase().includes("email not confirmed")) {
    return "Confirm your email before signing in — check your inbox for the link we sent.";
  }
  return message;
}

const textVariants = {
  hidden: {
  opacity: 0,
  y: 8,
},
show: {
  opacity: 1,
  y: 0,
}
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // ── state: unchanged ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [pending, setPending] = useState(false);

  // ── submit handler: unchanged ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(describeError(error.message));
      setPending(false);
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.08, delayChildren: 0.15 }}
      className="flex flex-col gap-6"
    >
      <motion.div variants={textVariants} transition={{ duration: 0.5 }}>
        <h1 className="font-display text-[1.5rem] font-bold text-text">Welcome back</h1>
        <p className="mt-1.5 text-[0.88rem] text-text-dim">Sign in to continue to Aria.</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key={error}
            initial={{ opacity: 0, y: -6, x: 0 }}
            animate={{ opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <AuthNotice variant="error">{error}</AuthNotice>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.form
        onSubmit={handleSubmit}
        variants={textVariants}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4"
      >
        <FieldGlow>
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
        </FieldGlow>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="text-[0.8rem] font-medium text-text-dim">
              Password
            </label>
            <Link href="/forgot-password" className="text-[0.78rem] text-accent2 hover:underline">
              Forgot your password?
            </Link>
          </div>
          <FieldGlow>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-[10px] border border-border bg-surface2 px-3.5 py-2.5 text-[0.92rem] text-text placeholder-text-dimmer outline-none transition-colors focus:border-accent/60"
            />
          </FieldGlow>
        </div>

        <FxButton>
          <AuthButton type="submit" pending={pending} pendingLabel="Signing in…">
            Sign in
          </AuthButton>
        </FxButton>
      </motion.form>

      <motion.p variants={textVariants} transition={{ duration: 0.5 }} className="text-center text-[0.85rem] text-text-dim">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-accent2 hover:underline">
          Sign up
        </Link>
      </motion.p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    // <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-5 sm:px-6">
    //   {/* <AIBackdrop /> */}

    //   <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center ">
    //     {/*
    //       If your logo currently renders in a shared (auth) layout rather
    //       than this page, wrap that render with <FloatingLogo> instead —
    //       this is just here so the card isn't alone if it doesn't.

    //       <FloatingLogo>
    //         <Logo />
    //       </FloatingLogo>
    //     */}

        <GlassAuthCard className="w-full">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </GlassAuthCard>
      // </div>
    // </div>
  );
}