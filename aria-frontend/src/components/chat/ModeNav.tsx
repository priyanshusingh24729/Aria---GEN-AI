"use client";

import { MessageSquare, FileText, Image as ImageIcon, Database, Brush, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MODES = [
  { href: "/chat/general", label: "General Chat", icon: MessageSquare },
  { href: "/chat/documents", label: "Document Assistant", icon: FileText },
  // { href: "/chat/images", label: "Image Generation", icon: ImageIcon },
  { href: "/chat/sql", label: "SQL Assistant", icon: Database },
  { href: "/chat/datacleaning", label: "Data Analytics", icon: Brush },
  { href: "/chat/analytics", label: "Analytics Dashboard", icon: BarChart3 },
];

export function ModeNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1.5">
      {MODES.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-[8px] border px-3.5 py-2.5 text-[0.85rem] font-medium transition-colors ${
              active
                ? "border-accent/40 bg-accent/[0.08] text-accent"
                : "border-border bg-surface2 text-text-dim hover:border-accent2/40 hover:text-text"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
