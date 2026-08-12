import { FieldKind } from "@/config/sheets";

/**
 * Header-row parsing for portals whose sheet layout is not hard-coded.
 *
 * The five original trackers have hand-written column configs in
 * src/config/sheets.ts. Newer sheets (Queries, POPs) instead declare no
 * `fields`, and their columns are derived here from row 1 of the sheet -
 * so the portal works without anyone transcribing the layout, and keeps
 * working when an admin adds a column.
 */

export interface DerivedColumn {
  key: string;
  label: string;
  kind: FieldKind;
  /** Zero-based index of the column in the sheet row */
  index: number;
  primary?: boolean;
}

/** Headers holding an email address: matched on, but not shown to the agent. */
const EMAIL_RE = /e-?mail/i;

const DATE_RE = /\b(date|timestamp|submitted|received)\b/i;
const STATUS_RE = /status|progress|outcome/i;
const NOTES_RE = /describ|note|comment|reason|quer|instruction|detail|message/i;

/** Header text that identifies the agent who submitted the row. */
const AGENT_RE = /agent|consultant|submitted by|full name|^name\b/i;

function kindForHeader(label: string): FieldKind {
  if (DATE_RE.test(label)) return "date";
  if (STATUS_RE.test(label)) return "status";
  if (NOTES_RE.test(label)) return "notes";
  return "text";
}

/** "Property Name / Address" -> "property-name-address" */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Drop blank trailing cells so an A1:Z read does not yield 26 columns. */
function trimHeader(header: string[]): string[] {
  const trimmed = header.map((h) => (h ?? "").trim());
  let last = trimmed.length - 1;
  while (last >= 0 && !trimmed[last]) last--;
  return trimmed.slice(0, last + 1);
}

/**
 * Find the column identifying the row's agent.
 *
 * An agent-email column wins: comparing it to the signed-in Google address is
 * exact, unlike name matching. Returns null when nothing plausible is found -
 * callers MUST then show no rows rather than every agent's rows.
 */
export function detectAgentColumn(
  header: string[]
): { index: number; mode: "email" | "name" } | null {
  const labels = trimHeader(header);

  const emailIdx = labels.findIndex((l) => EMAIL_RE.test(l) && AGENT_RE.test(l));
  if (emailIdx !== -1) return { index: emailIdx, mode: "email" };

  // A lone "Email address" column (Google's own collected-email column).
  const anyEmailIdx = labels.findIndex((l) => EMAIL_RE.test(l));
  if (anyEmailIdx !== -1) return { index: anyEmailIdx, mode: "email" };

  const nameIdx = labels.findIndex((l) => AGENT_RE.test(l));
  if (nameIdx !== -1) return { index: nameIdx, mode: "name" };

  return null;
}

/** Mode to use when the agent column was pinned by an env var. */
export function agentModeForIndex(header: string[], index: number): "email" | "name" {
  return EMAIL_RE.test(trimHeader(header)[index] ?? "") ? "email" : "name";
}

/**
 * Build the display columns from a header row. Email columns are omitted -
 * they exist to identify the agent, and repeating the signed-in user's own
 * address on every row is noise.
 */
export function deriveColumns(header: string[], agentIndex: number | null): DerivedColumn[] {
  const columns: DerivedColumn[] = [];
  const seen = new Set<string>();

  trimHeader(header).forEach((label, index) => {
    if (!label) return;
    if (EMAIL_RE.test(label)) return;

    let key = slugify(label) || `col-${index}`;
    while (seen.has(key)) key = `${key}-${index}`;
    seen.add(key);

    columns.push({ key, label, kind: kindForHeader(label), index });
  });

  // Mobile card title: the first column that is neither a date nor an
  // agent-identifying column - in practice the property. The label test
  // matters as well as the index: a sheet can identify the agent by an email
  // column while still showing a separate "Name of Agent" column, and the
  // agent's own name makes a useless card title.
  const primary =
    columns.find((c) => c.kind !== "date" && c.index !== agentIndex && !AGENT_RE.test(c.label)) ??
    columns.find((c) => c.kind !== "date") ??
    columns[0];
  if (primary) primary.primary = true;

  return columns;
}
