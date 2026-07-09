interface ModeHeaderProps {
  subtitle: string;
  badge: React.ReactNode;
  dotColor?: string;
  pulse?: boolean;
}

export function ModeHeader({ subtitle, badge, dotColor = "#6ee7b7", pulse = true }: ModeHeaderProps) {
  return (
    <div className="border-b border-border px-8 py-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] font-display text-base font-extrabold text-bg"
          style={{ background: "linear-gradient(135deg, #6ee7b7, #38bdf8)" }}
        >
          A
        </div>
        <div>
          <div
            className="bg-clip-text font-display text-[1.35rem] font-extrabold leading-none text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg, #6ee7b7, #38bdf8)" }}
          >
            Aria
          </div>
          <div className="mt-0.5 text-[0.8rem] text-text-dim">{subtitle}</div>
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface2 px-3 py-1 text-[0.76rem] font-medium text-text-dim">
        <span
          className={`h-[7px] w-[7px] rounded-full ${pulse ? "animate-pulse" : ""}`}
          style={{ backgroundColor: dotColor }}
        />
        {badge}
      </div>
    </div>
  );
}
