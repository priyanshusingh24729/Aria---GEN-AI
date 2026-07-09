import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  text: string;
}

export function EmptyState({ icon: Icon, title, text }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
      <Icon className="mb-4 h-10 w-10 text-text-dimmer" strokeWidth={1.5} />
      <div className="mb-2 font-display text-[1.05rem] font-semibold text-text-dim">{title}</div>
      <p className="max-w-[340px] text-[0.85rem] leading-relaxed text-text-dimmer">{text}</p>
    </div>
  );
}
