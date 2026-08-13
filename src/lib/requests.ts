import { prisma } from "./prisma";
import { fetchSheetRows, fetchSheetHeader, parseSheetDate } from "./sheets";
import { buildAgentMatcher, buildEmailMatcher, matchAll, AgentMatcher } from "./agent-match";
import { agentModeForIndex, deriveColumns, detectAgentColumn } from "./columns";
import { SHEET_CONFIGS, RequestCategory, SheetConfig, columnToIndex } from "@/config/sheets";

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
  /** Set when rows were withheld for a reason the agent should see. */
  notice?: string;
}

export interface PortalUser {
  email: string;
  name?: string | null;
  role?: string;
}

/**
 * Every name this user might appear under in a sheet: their Google display
 * name, their profile name, and any admin-maintained aliases. Exported so the
 * diagnostics page can show exactly what the app is comparing against.
 */
export async function agentNameCandidates(user: PortalUser): Promise<string[]> {
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

  return Array.from(new Set(candidates.filter(Boolean)));
}

/** Build the name-based row matcher for a user from their profile + aliases. */
async function matcherForUser(user: PortalUser): Promise<AgentMatcher> {
  return buildAgentMatcher(await agentNameCandidates(user));
}

/**
 * Where each displayed column lives in the sheet, and which column identifies
 * the agent. Comes either from the hand-written config or, for sheets that
 * declare no `fields`, from the header row.
 */
export interface SheetLayout {
  columns: RequestColumn[];
  indexByKey: Record<string, number>;
  agentIndex: number | null;
  agentMode: "email" | "name";
  /** How agentIndex was arrived at - surfaced on the diagnostics page. */
  agentSource: "config" | "env" | "detected" | "none";
  /** The sheet's header row, when the layout was derived from it. */
  header?: string[];
}

export async function resolveLayout(config: SheetConfig): Promise<SheetLayout> {
  if (config.fields) {
    const indexByKey: Record<string, number> = {};
    for (const field of config.fields) {
      indexByKey[field.key] = columnToIndex(field.column);
    }
    return {
      columns: config.fields.map(({ key, label, kind, primary }) => ({
        key,
        label,
        kind,
        primary,
      })),
      indexByKey: indexByKey,
      agentIndex: config.agentColumn ? columnToIndex(config.agentColumn) : null,
      agentMode: "name",
      agentSource: config.agentColumn ? "config" : "none",
    };
  }

  const header = await fetchSheetHeader(config);

  // An env override pins the column; otherwise detect it from the headers.
  const pinned = config.agentColumn ? columnToIndex(config.agentColumn) : null;
  const detected = pinned === null ? detectAgentColumn(header) : null;
  const agentIndex = pinned ?? detected?.index ?? null;
  const agentMode =
    pinned !== null ? agentModeForIndex(header, pinned) : detected?.mode ?? "name";

  const derived = deriveColumns(header, agentIndex);
  const indexByKey: Record<string, number> = {};
  for (const column of derived) {
    indexByKey[column.key] = column.index;
  }

  return {
    columns: derived.map(({ key, label, kind, primary }) => ({ key, label, kind, primary })),
    indexByKey,
    agentIndex,
    agentMode,
    agentSource: pinned !== null ? "env" : detected ? "detected" : "none",
    header,
  };
}

export async function getRequestsForUser(
  category: RequestCategory,
  user: PortalUser
): Promise<RequestListResponse> {
  const config = SHEET_CONFIGS[category];
  const isAdmin = user.role === "ADMIN";

  const [layout, rawRows] = await Promise.all([
    resolveLayout(config),
    fetchSheetRows(config),
  ]);

  const base = {
    category,
    title: config.title,
    columns: layout.columns,
    fetchedAt: new Date().toISOString(),
  };

  // Fail closed: with no way to tell whose row is whose, showing everything
  // would leak every agent's requests to every other agent.
  if (layout.agentIndex === null && !isAdmin) {
    console.error(
      `getRequestsForUser(${category}): no agent column found in the sheet header. ` +
        `Set SHEETS_${category.toUpperCase()}_AGENT_COL to the correct column letter.`
    );
    return {
      ...base,
      rows: [],
      total: 0,
      notice:
        "We could not work out which column of this sheet holds the agent's name, " +
        "so nothing is shown. Please let the administrator know.",
    };
  }

  let matcher: AgentMatcher;
  if (isAdmin) {
    matcher = matchAll;
  } else if (layout.agentMode === "email") {
    matcher = buildEmailMatcher(user.email);
  } else {
    matcher = await matcherForUser(user);
  }

  const agentIdx = layout.agentIndex;
  const dateField = layout.columns.find((c) => c.kind === "date");

  const rows: RequestRecord[] = [];
  rawRows.forEach((raw, i) => {
    // Skip fully blank rows.
    if (!raw.some((cell) => cell && cell.trim())) return;
    if (agentIdx !== null && !matcher(raw[agentIdx])) return;

    const values: Record<string, string> = {};
    for (const column of layout.columns) {
      values[column.key] = (raw[layout.indexByKey[column.key]] ?? "").trim();
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

  return { ...base, rows, total: rows.length };
}
