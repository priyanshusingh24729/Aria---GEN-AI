"use client";

import { ChevronDown, Database, Table2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/chat/Button";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { EmptyState } from "@/components/chat/EmptyState";
import { ModeHeader } from "@/components/chat/ModeHeader";
import { ModeShell } from "@/components/chat/ModeShell";
import { SidebarSectionLabel } from "@/components/chat/SidebarSectionLabel";
import { StatCard } from "@/components/chat/StatCard";
import { UploadDropzone } from "@/components/chat/UploadDropzone";
import { useSql } from "@/context/SqlContext";
import type { SqlExchange } from "@/lib/api/types";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import {
  Download,
  FileSpreadsheet,
  Copy,
  Search,
  Maximize2,
  TableIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 20, 50, 100];

// ── ResultsTable ───────────────────────────────────────────────────────────────

function ResultsTable({
  rows,
}: {
  rows: Record<string, unknown>[];
}) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  const columns = useMemo(() => Object.keys(rows[0] ?? {}), [rows]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(
    () => filteredRows.slice(page * pageSize, (page + 1) * pageSize),
    [filteredRows, page, pageSize]
  );

  // reset page when search/pageSize changes
  const handleSearch = (v: string) => { setSearch(v); setPage(0); };
  const handlePageSize = (v: number) => { setPageSize(v); setPage(0); };

  const exportLabel = "query-results";

  const actionBtnCls =
    "flex items-center gap-1.5 rounded-lg border border-[#2a3349] bg-[#1b2235] px-3 py-1.5 text-[0.78rem] font-medium text-gray-200 transition hover:bg-[#222b44] hover:text-white";

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-[#2a3349] bg-[#0f1420] p-8 text-center text-sm text-gray-500">
        No rows found.
      </div>
    );
  }

  // ── Export uses the currently filtered table rows ───────────────
  const exportRows = filteredRows;

  const downloadCSV = () => {
    if (!exportRows.length) return;
    const headers = Object.keys(exportRows[0]);
    const csv = [
      headers.join(","),
      ...exportRows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")),
    ].join("\n");
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${exportLabel}.csv`);
  };

  const downloadExcel = () => {
    if (!exportRows.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), "Results");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${exportLabel}.xlsx`);
  };

  const copyTable = () => navigator.clipboard.writeText(JSON.stringify(exportRows, null, 2));

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2a3349] bg-[#0f1420] shadow-2xl ring-1 ring-black/40">

      {/* ── Header bar + actions ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a3349] bg-[#161c2c] px-4 py-3">

        {/* Label */}
        <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-[0.78rem] font-semibold text-cyan-300">
          <TableIcon size={13} />
          Table
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button onClick={downloadCSV} className={actionBtnCls} title={`Download ${exportLabel} as CSV`}>
            <Download size={13} /> CSV
          </button>
          <button onClick={downloadExcel} className={actionBtnCls} title={`Download ${exportLabel} as Excel`}>
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={copyTable} className={actionBtnCls} title={`Copy ${exportLabel} as JSON`}>
            <Copy size={13} /> Copy
          </button>
          <button
            onClick={() => document.documentElement.requestFullscreen()}
            className="rounded-lg border border-[#2a3349] bg-[#1b2235] p-1.5 text-gray-200 transition hover:bg-[#222b44] hover:text-white"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      {/* Search + pagination controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2638] bg-[#111827] px-4 py-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search rows…"
            className="w-52 rounded-lg border border-[#2a3349] bg-[#0a0e17] py-1.5 pl-9 pr-3 text-[0.8rem] text-white placeholder:text-gray-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
          />
        </div>

        {/* Page size + pagination */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <select
              value={pageSize}
              onChange={(e) => handlePageSize(Number(e.target.value))}
              className="appearance-none rounded-lg border border-[#2a3349] bg-[#1b2235] py-1.5 pl-3 pr-7 text-[0.78rem] text-gray-200 outline-none focus:border-cyan-400"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} / page</option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 text-gray-400" />
          </div>

          {/* Page buttons */}
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2a3349] bg-[#1b2235] text-gray-400 transition hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={13} />
          </button>

          {/* Page number pills */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              // sliding window around current page
              let p = i;
              if (totalPages > 5) {
                const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                p = start + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-7 w-7 items-center justify-center rounded-md border text-[0.75rem] font-semibold transition ${
                    p === page
                      ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                      : "border-[#2a3349] bg-[#1b2235] text-gray-400 hover:border-cyan-400/50 hover:text-gray-200"
                  }`}
                >
                  {p + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2a3349] bg-[#1b2235] text-gray-400 transition hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[600px] overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="whitespace-nowrap border-b-2 border-cyan-400/30 bg-[#1a2235] px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-cyan-300 w-10">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap border-b-2 border-cyan-400/30 bg-[#1a2235] px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-cyan-300"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, i) => (
              <tr
                key={i}
                className={`transition hover:bg-[#212a42] ${
                  i % 2 === 0 ? "bg-[#131a29]" : "bg-[#0f1521]"
                }`}
              >
                <td className="whitespace-nowrap border-b border-[#222b3e] px-4 py-2.5 text-[0.75rem] tabular-nums text-gray-500 font-medium">
                  {page * pageSize + i + 1}
                </td>
                {columns.map((col) => (
                  <td
                    key={col}
                    className="whitespace-nowrap border-b border-[#222b3e] px-4 py-2.5 font-medium text-gray-100"
                  >
                    {String(row[col] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer row count */}
      <div className="border-t border-[#1e2638] bg-[#111827] px-4 py-2 text-[0.72rem] text-gray-500">
        Showing{" "}
        <span className="text-gray-300 font-medium">
          {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredRows.length)}
        </span>{" "}
        of{" "}
        <span className="text-gray-300 font-medium">{filteredRows.length.toLocaleString()}</span>{" "}
        rows
        {search && ` (filtered from ${rows.length.toLocaleString()})`}
      </div>
    </div>
  );
}

// ── ExchangeBlock ─────────────────────────────────────────────────────────────

function ExchangeBlock({ exchange }: { exchange: SqlExchange }) {
  return (
    <div className="flex flex-col gap-3">
      {/* User question */}
      <div className="self-end rounded-[14px] border border-border bg-[#1e2640] px-4 py-3 text-[0.92rem] text-text">
        {exchange.question}
      </div>

      {exchange.cannotAnswerReason ? (
        <div className="rounded-[8px] border border-[#fb923c]/30 bg-surface2 px-3.5 py-2.5 text-[0.85rem] text-text-dim">
          ⚠️ This question can&apos;t be answered from the available schema.
          <br />
          <span className="text-text-dimmer">Reason: {exchange.cannotAnswerReason}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-[#141824] px-4 py-3.5">

          {/* SQL */}
          {exchange.sql && (
            <div>
              <div className="mb-1 font-display text-[0.68rem] font-bold uppercase tracking-[0.12em] text-text-dimmer">
                Generated SQL
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-[8px] border border-border border-l-[3px] border-l-[#fb923c] bg-[#0e1117] px-4 py-3 text-[0.82rem] leading-relaxed text-[#e2c07a]">
                {exchange.sql}
              </pre>
            </div>
          )}

          {/* Error */}
          {exchange.error && (
            <div className="rounded-[8px] border border-danger/40 bg-surface2 px-3.5 py-2.5 text-[0.85rem] text-danger">
              ⚠️ SQL execution error: {exchange.error}
            </div>
          )}

          {/* Results table */}
          {exchange.rows && (
            <div>
              <div className="mb-2 font-display text-[0.68rem] font-bold uppercase tracking-[0.12em] text-text-dimmer">
                Query results · <span className="text-accent">{exchange.rowCount} row(s)</span>
              </div>
              <ResultsTable rows={exchange.rows} />
            </div>
          )}

          {/* Explanation */}
          {exchange.explanation !== undefined && (
            <div>
              <div className="mb-1 font-display text-[0.68rem] font-bold uppercase tracking-[0.12em] text-text-dimmer">
                Explanation
              </div>
              <div className="rounded-[8px] border border-border border-l-[3px] border-l-accent2 bg-surface2 px-3.5 py-2.5 text-[0.87rem] leading-relaxed text-text-dim">
                {exchange.explanation}
                {exchange.streaming && (
                  <span className="ml-0.5 animate-pulse text-accent">▌</span>
                )}
              </div>
            </div>
          )}

          {exchange.streaming && !exchange.sql && !exchange.error && (
            <p className="text-[0.84rem] text-text-dimmer">Writing SQL query…</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SqlAssistantPage() {
  const { session, exchanges, isUploading, isQuerying, uploadError, uploadFile, ask, clearSession } = useSql();
  const [schemaOpen, setSchemaOpen] = useState(false);

  return (
    <ModeShell
      header={
        <ModeHeader
          subtitle="SQL Assistant · Natural Language to SQL"
          badge={
            session
              ? `SQL Assistant · ${session.tables.length} table(s) ready`
              : "SQL Assistant · No data loaded"
          }
          dotColor={session ? "#6ee7b7" : "#fb923c"}
        />
      }
      sidebarExtra={
        <>
          <SidebarSectionLabel>Data source</SidebarSectionLabel>
          <UploadDropzone
            accept=".db,.sql,.xlsx,.csv"
            label={isUploading ? "Uploading…" : "Click or drag a file here"}
            hint="db · sql · xlsx · csv"
            onFiles={(files) => files[0] && uploadFile(files[0])}
          />

          {uploadError && (
            <div className="mt-2 rounded-[8px] border border-danger/40 bg-surface2 px-3 py-2 text-[0.78rem] text-danger">
              {uploadError}
            </div>
          )}

          {session && (
            <>
              <SidebarSectionLabel>Database</SidebarSectionLabel>
              <StatCard label="Status" value="● Ready" small />
              <StatCard label="Source file" value={session.sourceName} small />
              <StatCard label="Tables found" value={session.tables.length} />

              {session.tables.length > 0 && (
                <>
                  <SidebarSectionLabel>Detected tables</SidebarSectionLabel>
                  <div className="flex flex-col gap-1">
                    {session.tables.map((t) => (
                      <div
                        key={t}
                        className="flex items-center gap-2 rounded-[8px] border border-border bg-surface2 px-2.5 py-1.5 text-[0.78rem] text-text-dim"
                      >
                        <Table2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{t}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Button variant="danger" className="mt-3" onClick={clearSession}>
                🗑️ Clear database
              </Button>
            </>
          )}
        </>
      }
    >
      {!session ? (
        <EmptyState
          icon={Database}
          title="No data loaded yet"
          text="Upload a .db, .sql, .xlsx, or .csv file in the sidebar to get started. Once loaded, ask questions in plain English — Aria will write and run the SQL for you."
        />
      ) : (
        <div className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-5 px-6 py-6">
          {/* Schema preview */}
          <div className="rounded-[8px] border border-border">
            <button
              onClick={() => setSchemaOpen((o) => !o)}
              className="flex w-full items-center justify-between px-3.5 py-2 text-left text-[0.8rem] text-text-dim"
            >
              <span>🔍 Schema preview</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${schemaOpen ? "rotate-180" : ""}`} />
            </button>
            {schemaOpen && (
              <pre className="overflow-x-auto whitespace-pre-wrap border-t border-border bg-[#0e1117] px-4 py-3 text-[0.78rem] leading-relaxed text-[#e2c07a]">
                {session.schemaText}
              </pre>
            )}
          </div>

          {exchanges.length === 0 && (
            <p className="text-[0.78rem] leading-relaxed text-text-dimmer">
              💡 Try: <em>&quot;Show all rows&quot;</em> · <em>&quot;Top 5 by value&quot;</em> ·{" "}
              <em>&quot;Total sales by month&quot;</em> · <em>&quot;Count rows per category&quot;</em>
            </p>
          )}

          {exchanges.map((exchange, i) => (
            <ExchangeBlock key={i} exchange={exchange} />
          ))}
        </div>
      )}

      {session && (
        <div className="mx-auto w-full max-w-[1040px]">
          <ChatComposer
            placeholder="Ask a question about your data…"
            disabled={isQuerying}
            onSend={ask}
          />
        </div>
      )}
    </ModeShell>
  );
}