interface LogoProps {
  size?: "sm" | "md";
}

export function Logo({ size = "md" }: LogoProps) {
  const boxSize = size === "sm" ? "h-8 w-8 rounded-[9px] text-sm" : "h-9 w-9 rounded-[10px] text-base";
  const textSize = size === "sm" ? "text-lg" : "text-xl";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex shrink-0 items-center justify-center font-display font-extrabold text-bg ${boxSize}`}
        style={{ background: "linear-gradient(135deg, #6ee7b7, #38bdf8)" }}
      >
        A
      </div>
      <span
        className={`bg-clip-text font-display font-extrabold text-transparent ${textSize}`}
        style={{ backgroundImage: "linear-gradient(90deg, #6ee7b7, #38bdf8)" }}
      >
        Aria
      </span>
    </div>
  );
}
