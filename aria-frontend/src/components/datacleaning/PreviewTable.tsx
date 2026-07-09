"use client";

import { useMemo, useState } from "react";
import type { PreviewResponse } from "@/lib/api/types";
import { EmptyState } from "./EmptyState";

const PAGE_SIZE = 10;

export function PreviewTable({ preview }: { preview: PreviewResponse | null }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filteredRows = useMemo(() => {
    if (!preview) return [];
    if (!search.trim()) return preview.rows;
    const q = search.toLowerCase();
    return preview.rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(q))
    );
  }, [preview, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (!preview) {
    return <EmptyState icon="📄" title="No preview yet" description="Upload a dataset to see a live preview." />;
  }

  if (preview.columns.length === 0) {
    return <EmptyState icon="📄" title="Dataset is empty" />;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
            {preview.total_rows.toLocaleString()} rows
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
            {preview.columns.length} columns
          </span>
        </div>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search rows…"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-400/50 sm:w-56"
        />
      </div>

      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-max text-left text-xs">
          <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
            <tr>
              {preview.columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap border-b border-white/10 px-4 py-2.5 font-medium text-zinc-400"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className="odd:bg-white/[0.015] hover:bg-emerald-400/[0.04] transition-colors">
                {preview.columns.map((col) => (
                  <td key={col} className="whitespace-nowrap px-4 py-2.5 text-zinc-300">
                    {row[col] === null || row[col] === undefined ? (
                      <span className="text-zinc-600">—</span>
                    ) : (
                      String(row[col])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-zinc-500">
        <span>
          Page {page + 1} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-30 hover:border-emerald-400/40 hover:text-emerald-300 transition-colors"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-30 hover:border-emerald-400/40 hover:text-emerald-300 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
