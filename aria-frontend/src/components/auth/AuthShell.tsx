import { FloatingLogo } from "./floating-logo";

import { Logo } from "@/components/Logo";
import { AIBackdrop } from "./ai-backdrop";

export function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6 py-16">

      {/* Animated AI Background */}
      <AIBackdrop />

      {/* Soft center glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[50px] animate-breathe"
        style={{
          background:
            "radial-gradient(circle, rgba(110,231,183,0.28), rgba(56,189,248,0.14) 42%, transparent 70%)",
        }}
      />

      {/* Login Content */}
      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center">

        <div className="mb-8">
           <FloatingLogo>
          <Logo />
          </FloatingLogo>
        </div>

        <div className="w-full rounded-2xl border border-border bg-surface/70 backdrop-blur-xl p-8 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          {children}
        </div> 

      </div>
    </div>
  );
}
