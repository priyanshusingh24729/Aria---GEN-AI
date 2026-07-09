import { InputHTMLAttributes } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function AuthInput({ label, id, ...props }: AuthInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.8rem] font-medium text-text-dim">
        {label}
      </label>
      <input
        id={id}
        className="rounded-[10px] border border-border bg-surface2 px-3.5 py-2.5 text-[0.92rem] text-text placeholder-text-dimmer outline-none transition-colors focus:border-accent/60"
        {...props}
      />
    </div>
  );
}
