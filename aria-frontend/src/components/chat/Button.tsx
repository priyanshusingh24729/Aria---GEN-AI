import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger";
}

const VARIANT_CLASSES: Record<string, string> = {
  default:
    "border border-border bg-surface2 text-text hover:border-accent hover:text-accent hover:bg-accent/[0.06]",
  primary: "border-none bg-gradient-to-br from-accent to-[#22d3ee] text-bg hover:opacity-90",
  danger:
    "border border-danger/40 bg-transparent text-danger hover:bg-danger/[0.08] hover:border-danger",
};

export function Button({ variant = "default", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`w-full rounded-[8px] px-4 py-2 text-[0.84rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
