import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { diagnoseAllTrackers, TrackerDiagnosis } from "@/lib/diagnostics";

export const metadata = { title: "Sheet check" };
export const dynamic = "force-dynamic";

/**
 * Admin-only page that explains, per tracker, why a portal is empty.
 * Shows real values out of the sheets, so it must never be open to agents.
 */

const VERDICTS = {
  ok: {
    icon: CheckCircle2,
    tone: "border-green-200 bg-green-50 text-green-800",
    label: "Working",
  },
  "cannot-read": {
    icon: XCircle,
    tone: "border-red-200 bg-red-50 text-red-800",
    label: "The bot cannot open this sheet",
  },
  "no-agent-column": {
    icon: AlertTriangle,
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    label: "No agent column could be found",
  },
  "no-rows-matched": {
    icon: AlertTriangle,
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    label: "Sheet opens fine, but none of its rows look like yours",
  },
  "sheet-empty": {
    icon: HelpCircle,
    tone: "border-gray-200 bg-gray-50 text-gray-700",
    label: "The sheet has no data rows yet",
  },
} as const;

function envVarFor(category: string) {
  return `SHEETS_${category.toUpperCase()}_AGENT_COL`;
}

function Card({ d }: { d: TrackerDiagnosis }) {
  const verdict = VERDICTS[d.verdict];
  const Icon = verdict.icon;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-brand-heading">{d.title}</h2>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${verdict.tone}`}
        >
          <Icon size={14} aria-hidden="true" />
          {verdict.label}
        </span>
      </div>

      {d.readError && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{d.readError}</p>
      )}

      {d.headerRow && d.headerRow.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            What is actually in row 1 of this sheet
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.headerRow.map((h) => (
              <span
                key={h.column}
                className={`rounded-md border px-2 py-1 text-xs ${
                  h.column === d.agentColumn
                    ? "border-brand-primary bg-brand-primary/10 font-semibold text-brand-primary"
                    : "border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                <span className="font-mono font-bold">{h.column}</span> {h.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {d.agentColumn && (
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">Column used for the agent</dt>
            <dd className="font-semibold">
              <span className="font-mono">{d.agentColumn}</span> — {d.agentHeader}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">Chosen because</dt>
            <dd>
              {d.agentSource === "config" && "It is written into the app (an unverified guess)"}
              {d.agentSource === "env" && `You set ${envVarFor(d.category)} in .env`}
              {d.agentSource === "detected" && "It was read from the heading in row 1"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">Matched on</dt>
            <dd>{d.matchMode === "email" ? "Email address (exact)" : "Name (allows aliases)"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">Rows</dt>
            <dd>
              <span className="font-semibold">{d.matchedRows}</span> of {d.totalRows} are yours
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              Compared against your login
            </dt>
            <dd className="font-mono text-xs">{d.comparedWith?.join("  ·  ")}</dd>
          </div>
        </dl>
      )}

      {d.sampleValues && d.sampleValues.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            What column {d.agentColumn} actually contains
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {d.sampleValues.map((s) => (
              <li
                key={s.value}
                className={`rounded-md border px-2 py-1 text-xs ${
                  s.matches
                    ? "border-green-300 bg-green-50 text-green-800"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                {s.value} <span className="text-gray-400">×{s.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-400">
            Green means it was recognised as you. If this list shows names but the app is
            matching on email (or the other way round), that is the problem.
          </p>
        </div>
      )}

      {d.verdict === "no-agent-column" && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Nothing in row 1 looks like an agent name or email, so the page deliberately shows
          nothing rather than showing everybody&apos;s rows. Pick the right column from row 1
          above and add this line to your <code>.env</code> file:{" "}
          <code className="font-mono font-semibold">{envVarFor(d.category)}=&quot;B&quot;</code>{" "}
          (using the correct letter).
        </p>
      )}

      {d.verdict === "no-rows-matched" && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Either column <span className="font-mono font-semibold">{d.agentColumn}</span> is the
          wrong column — pick the right letter from row 1 above and set{" "}
          <code className="font-mono font-semibold">{envVarFor(d.category)}</code> in your{" "}
          <code>.env</code> — or it is the right column but your name is spelled differently in
          the sheet, in which case add that spelling as an alias.
        </p>
      )}

      <p className="mt-4 border-t border-gray-100 pt-3 font-mono text-[11px] text-gray-400">
        id {d.spreadsheetId} · gid {d.gid}
      </p>
    </section>
  );
}

export default async function SheetCheckPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const results = await diagnoseAllTrackers({
    email: session.user.email!,
    name: session.user.name,
    // Diagnose as a normal agent would be matched, not as an admin who sees
    // everything - otherwise every tracker would report "working".
    role: "AGENT",
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-brand-heading">Sheet check</h1>
      <p className="mt-1 text-sm text-gray-500">
        Why each tracker is or is not showing rows, checked against your own login. Admin only.
      </p>

      <div className="mt-6 space-y-4">
        {results.map((d) => (
          <Card key={d.category} d={d} />
        ))}
      </div>
    </div>
  );
}
