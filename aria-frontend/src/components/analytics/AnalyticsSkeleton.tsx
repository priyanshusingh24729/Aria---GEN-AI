"use client";

function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[20px] bg-white/[0.04] ${className}`} />;
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 bg-[#0B1220] px-8 py-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Pulse key={i} className="h-24" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-24" />
        ))}
      </div>

      <Pulse className="h-64 w-full" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Pulse key={i} className="h-48" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Pulse className="h-80" />
        <Pulse className="h-80" />
      </div>
    </div>
  );
}
