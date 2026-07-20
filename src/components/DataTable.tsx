import StatusBadge from "./StatusBadge";
import type { RequestColumn, RequestRecord } from "@/lib/requests";

/**
 * Responsive request list:
 *  - md and up: a classic data table
 *  - below md:  stacked cards (property as title, label/value pairs below)
 */

function CellValue({ column, value }: { column: RequestColumn; value: string }) {
  if (column.kind === "status") return <StatusBadge value={value} />;
  if (!value) return <span className="text-gray-300">—</span>;
  if (column.kind === "notes") {
    return <span className="block max-w-xs whitespace-pre-wrap text-sm text-gray-600">{value}</span>;
  }
  return <span className="text-sm">{value}</span>;
}

export default function DataTable({
  columns,
  rows,
}: {
  columns: RequestColumn[];
  rows: RequestRecord[];
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const dateCol = columns.find((c) => c.kind === "date");
  const rest = columns.filter((c) => c.key !== primary.key && c.key !== dateCol?.key);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 align-top">
                    <CellValue column={c} value={row.values[c.key] ?? ""} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-brand-ink">
                {row.values[primary.key] || "(no property name)"}
              </p>
              {dateCol && (
                <p className="shrink-0 text-xs text-gray-400">{row.values[dateCol.key]}</p>
              )}
            </div>
            <dl className="mt-3 space-y-2">
              {rest.map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-4">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {c.label}
                  </dt>
                  <dd className="text-right">
                    <CellValue column={c} value={row.values[c.key] ?? ""} />
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
