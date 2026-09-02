import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Plus, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addAlias, removeAlias } from "./actions";

export const metadata = { title: "Agents" };
export const dynamic = "force-dynamic";

/**
 * Admin-only: everyone who has signed in, with the "also known as" names
 * that link their login to the spellings admins use in the tracker sheets.
 * Adding an alias here is what makes an agent's rows appear when the sheet
 * calls them something other than their Google account name.
 */

const MESSAGES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  "saved=1": { tone: "ok", text: "Saved. The agent's rows will appear on their next refresh." },
  "error=too-short": {
    tone: "warn",
    text: "That name is too short to match on - use at least 3 letters.",
  },
  "error=duplicate": { tone: "warn", text: "That spelling is already on this agent." },
  "error=failed": { tone: "warn", text: "Something went wrong saving that. Please try again." },
};

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const agents = await prisma.agentProfile.findMany({
    orderBy: { fullName: "asc" },
    include: { aliases: { orderBy: { name: "asc" } } },
  });

  const messageKey = Object.keys(searchParams)
    .map((k) => `${k}=${searchParams[k]}`)
    .find((k) => k in MESSAGES);
  const message = messageKey ? MESSAGES[messageKey] : null;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-brand-heading">Agents</h1>
      <p className="mt-1 text-sm text-gray-500">
        The sheets identify agents by the name an admin typed; the app identifies them by
        their Google account. When those differ, add the sheet&apos;s spelling here as an
        &ldquo;also known as&rdquo; name. Admin only.
      </p>

      {message && (
        <div
          role="status"
          className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${
            message.tone === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {message.tone === "ok" ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          )}
          {message.text}
        </div>
      )}

      {agents.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Nobody has signed in yet. Agents appear here automatically after their first sign-in.
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {agents.map((agent) => (
          <li key={agent.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-semibold text-brand-ink">{agent.fullName}</p>
                <p className="text-xs text-gray-500">{agent.email}</p>
              </div>
              {!agent.active && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  Deactivated
                </span>
              )}
            </div>

            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Also known as in the sheets
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {agent.aliases.length === 0 && (
                  <span className="text-sm text-gray-400">
                    None yet — rows match only on &ldquo;{agent.fullName}&rdquo;.
                  </span>
                )}
                {agent.aliases.map((alias) => (
                  <form key={alias.id} action={removeAlias}>
                    <input type="hidden" name="aliasId" value={alias.id} />
                    <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 py-1 pl-2.5 pr-1 text-sm text-gray-700">
                      {alias.name}
                      <button
                        type="submit"
                        aria-label={`Remove ${alias.name}`}
                        className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </span>
                  </form>
                ))}
              </div>

              <form action={addAlias} className="mt-3 flex max-w-md gap-2">
                <input type="hidden" name="agentId" value={agent.id} />
                <input
                  type="text"
                  name="name"
                  required
                  minLength={3}
                  maxLength={80}
                  placeholder="Exactly as it appears in the sheet, e.g. Refilwe"
                  aria-label={`Add a name for ${agent.fullName}`}
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-dark"
                >
                  <Plus size={15} aria-hidden="true" />
                  Add
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-gray-400">
        Matching is case-insensitive and ignores punctuation, and a sheet cell matches if it
        contains the whole name. Two agents who are both written as just &ldquo;Sarah&rdquo; in
        a sheet cannot be told apart by any spelling — ask agents to use full names on the forms.
      </p>
    </div>
  );
}
