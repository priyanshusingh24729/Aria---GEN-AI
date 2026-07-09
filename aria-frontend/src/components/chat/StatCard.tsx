interface StatCardProps {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  small?: boolean;
}

export function StatCard({ label, value, valueColor, small }: StatCardProps) {
  return (
    <div className="mb-2 rounded-[8px] border border-border bg-surface2 px-4 py-2.5">
      <div className="text-[0.72rem] font-medium uppercase tracking-[0.08em] text-text-dimmer">
        {label}
      </div>
      <div
        className={`mt-0.5 font-display font-bold ${small ? "text-[0.85rem]" : "text-[1.2rem]"}`}
        style={{ color: valueColor ?? "#6ee7b7" }}
      >
        {value}
      </div>
    </div>
  );
}
