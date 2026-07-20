import { prisma } from "./prisma";
import { fetchSheetRows, parseSheetDate } from "./sheets";
import { buildAgentMatcher, matchAll, AgentMatcher } from "./agent-match";
import { SHEET_CONFIGS, RequestCategory, columnToIndex } from "@/config/sheets";

/**
 * Business layer: turn raw sheet rows into the per-agent request lists the
 * UI renders. This is the only module the API route talks to.
 */

export interface RequestColumn {
  key: string;
  label: string;
  kind: "date" | "text" | "status" | "notes";
  primary?: boolean;
}

export interface RequestRecord {
  id: string;
  values: Record<string, string>;
}

export interface RequestListResponse {
  category: RequestCategory;
  title: string;
  columns: RequestColumn[];
  rows: RequestRecord[];
  total: number;
  fetchedAt: string;
}

interface PortalUser {
  email: string;
  name?: string | null;
  role?: string;
}

/** Build the row matcher for a user from their profile + aliases. */
async function matcherForUser(user: PortalUser): Promise<AgentMatcher> {
  if (user.role === "ADMIN") return matchAll;

  const candidates: string[] = [];
  if (user.name) candidates.push(user.name);

  try {
    const profile = await prisma.agentProfile.findUnique({
      where: { email: user.email.toLowerCase() },
      include: { aliases: true },
    });
    if (profile) {
      candidates.push(profile.fullName);
      candidates.push(...profile.aliases.map((a) => a.name));
    }
  } catch (err) {
    console.error("matcherForUser: database error, falling back to session name", err);
  }

  // Last resort: derive "jane.doe" -> "jane doe" from the email local part.
  if (candidates.length === 0) {
    candidates.push(user.email.split("@")[0].replace(/[._-]+/g, " "));
  }

  return buildAgentMatcher(candidates);
}

export async function getRequestsForUser(
  category: RequestCategory,
  user: PortalUser
): Promise<RequestListResponse> {
  const config = SHEET_CONFIGS[category];
  const [matcher, rawRows] = await Promise.all([
    matcherForUser(user),
    fetchSheetRows(config),
  ]);

  const agentIdx = columnToIndex(config.agentColumn);
  const dateField = config.fields.find((f) => f.kind === "date");

  const rows: RequestRecord[] = [];
  rawRows.forEach((raw, i) => {
    // Skip fully blank rows.
    if (!raw.some((cell) => cell && cell.trim())) return;
    if (!matcher(raw[agentIdx])) return;

    const values: Record<string, string> = {};
    for (const field of config.fields) {
      values[field.key] = (raw[columnToIndex(field.column)] ?? "").trim();
    }
    rows.push({ id: `${category}-${i + 2}`, values }); // +2 = real sheet row number
  });

  // Newest first; rows without a parseable date keep sheet order at the end.
  if (dateField) {
    rows.sort((a, b) => {
      const ta = parseSheetDate(a.values[dateField.key]);
      const tb = parseSheetDate(b.values[dateField.key]);
      if (ta === null && tb === null) return 0;
      if (ta === null) return 1;
      if (tb === null) return -1;
      return tb - ta;
    });
  }

  return {
    category,
    title: config.title,
    columns: config.fields.map(({ key, label, kind, primary }) => ({ key, label, kind, primary })),
    rows,
    total: rows.length,
    fetchedAt: new Date().toISOString(),
  };
}
