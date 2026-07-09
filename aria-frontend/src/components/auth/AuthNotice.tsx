interface AuthNoticeProps {
  variant: "error" | "success";
  children: React.ReactNode;
}

export function AuthNotice({ variant, children }: AuthNoticeProps) {
  const accentColor = variant === "error" ? "border-l-danger" : "border-l-accent";
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-[8px] border border-border ${accentColor} border-l-[3px] bg-surface2 px-3.5 py-2.5 text-[0.85rem] leading-relaxed text-text-dim`}
    >
      {children}
    </div>
  );
}
