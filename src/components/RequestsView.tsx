"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCw, Search, Inbox, AlertTriangle } from "lucide-react";
import DataTable from "./DataTable";
import type { RequestCategory } from "@/config/sheets";
import type { RequestListResponse } from "@/lib/requests";

/**
 * Shared client view for all five "My ..." pages: fetches the agent's rows
 * from the API, with loading, error, empty, search and refresh states.
 */

interface Props {
  category: RequestCategory;
  title: string;
  description: string;
}

export default function RequestsView({ category, title, description }: Props) {
  const [data, setData] = useState<RequestListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${category}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      setData(body as RequestListResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.rows;
    return data.rows.filter((row) =>
      Object.values(row.values).some((v) => v.toLowerCase().includes(q))
    );
  }, [data, query]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-secondary">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-brand-secondary hover:text-brand-secondary disabled:opacity-50"
        >
          <RotateCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="relative mt-5">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by property, status, admin..."
          aria-label={`Search ${title}`}
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-brand-secondary focus:outline-none focus:ring-1 focus:ring-brand-secondary"
        />
      </div>

      <div className="mt-5">
        {loading && (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200/70" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Couldn't load your {title.toLowerCase()}.</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && data && filteredRows.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <Inbox size={28} className="text-gray-300" aria-hidden="true" />
            <p className="font-medium text-gray-600">
              {query ? "No results match your search." : `No ${title.toLowerCase()} found.`}
            </p>
            {!query && (
              <p className="text-sm text-gray-400">
                New submissions appear here shortly after the form is processed.
              </p>
            )}
          </div>
        )}

        {!loading && !error && data && filteredRows.length > 0 && (
          <>
            <p className="mb-3 text-xs text-gray-400">
              {filteredRows.length} of {data.total} request{data.total === 1 ? "" : "s"}
            </p>
            <DataTable columns={data.columns} rows={filteredRows} />
          </>
        )}
      </div>
    </div>
  );
}
