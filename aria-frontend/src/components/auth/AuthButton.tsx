import { ButtonHTMLAttributes } from "react";
import { GlassAuthCard } from "./glass-auth-card";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pending?: boolean;
  pendingLabel?: string;
}

export function AuthButton({
  children,
  pending,
  pendingLabel,
  disabled,
  ...props
}: AuthButtonProps) {
  return (
  
    <button
      className="w-full rounded-[10px] bg-gradient-to-br from-accent to-[#22d3ee] py-2.5 text-[0.92rem] font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled || pending}
      {...props}
    >
      {pending ? pendingLabel ?? "Working…" : children}
    </button>
    
  );
}
