import type { ReactNode } from "react";

export function EmptyState({
  icon = "🧹",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
      {description && <p className="max-w-sm text-xs text-zinc-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
