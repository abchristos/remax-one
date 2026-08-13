import { fetchSheetRows, fetchSheetHeader } from "./sheets";
import { buildAgentMatcher, buildEmailMatcher } from "./agent-match";
import { agentNameCandidates, resolveLayout, PortalUser } from "./requests";
import {
  SHEET_CONFIGS,
  REQUEST_CATEGORIES,
  RequestCategory,
  indexToColumn,
} from "@/config/sheets";

/**
 * Per-tracker self-diagnosis for the admin "Sheet check" page.
 *
 * The portal shows an agent only their own rows, which means every tracker
 * depends on one column being the right one. When a page comes up empty there
 * are three quite different causes - the sheet cannot be read at all, the
 * agent column is wrong, or the column is right but the value in it does not
 * look like the signed-in user. This module tells them apart and reports the
 * evidence, so the column is chosen by looking rather than guessing.
 */

export interface TrackerDiagnosis {
  category: RequestCategory;
  title: string;
  spreadsheetId: string;
  gid: number;
  /** Set when the sheet could not be read at all - nothing else is filled in. */
  readError?: string;
  /** Header row as "A - Date Submitted" entries. */
  headerRow?: { column: string; label: string }[];
  agentColumn?: string;
  agentHeader?: string;
  agentSource?: "config" | "env" | "detected" | "none";
  matchMode?: "email" | "name";
  /** What the app compares each row against. */
  comparedWith?: string[];
  totalRows?: number;
  matchedRows?: number;
  /** Distinct values found in the agent column, most frequent first. */
  sampleValues?: { value: string; count: number; matches: boolean }[];
  verdict: "ok" | "cannot-read" | "no-agent-column" | "no-rows-matched" | "sheet-empty";
}

function explainReadError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (/has not been used in project|is disabled/i.test(message)) {
    return "The Google Sheets API is switched off in the Google Cloud project. Open console.cloud.google.com, check the correct project is selected at the top, search for 'Google Sheets API' and click ENABLE.";
  }
  if (/caller does not have permission|PERMISSION_DENIED/i.test(message)) {
    return "The reader bot has not been given access to THIS spreadsheet. Open it, click Share, paste in the address from GOOGLE_SERVICE_ACCOUNT_EMAIL and set it to Viewer. Sharing the folder is not always enough - share the sheet itself.";
  }
  if (/Requested entity was not found|not found.*spreadsheet/i.test(message)) {
    return "No spreadsheet exists with this ID. Compare the ID below with the long code in the sheet's own web address, between /d/ and /edit.";
  }
  if (/Tab with gid/i.test(message)) {
    return "The spreadsheet opened, but the tab we expect is not there. Open the tracker, click the correct tab, and look at the gid=NUMBER at the very end of the web address - that number must match the gid below.";
  }
  if (/DECODER routines|invalid_grant|invalid signature|PEM|no start line/i.test(message)) {
    return "The bot's private key in .env looks mis-pasted. Re-copy the whole private_key value from the downloaded JSON file, keeping the \\n parts and the BEGIN/END lines, all inside the quotes.";
  }
  if (/service account is not configured/i.test(message)) {
    return "GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is missing from .env. Stop the app with Ctrl+C and run 'npm run dev' again after editing .env.";
  }
  return `Unrecognised problem. The raw message was: ${message}`;
}

export async function diagnoseTracker(
  category: RequestCategory,
  user: PortalUser
): Promise<TrackerDiagnosis> {
  const config = SHEET_CONFIGS[category];
  const base = {
    category,
    title: config.title,
    spreadsheetId: config.spreadsheetId,
    gid: config.gid,
  };

  let layout;
  let rows: string[][];
  let header: string[];
  try {
    [layout, rows, header] = await Promise.all([
      resolveLayout(config),
      fetchSheetRows(config),
      fetchSheetHeader(config),
    ]);
  } catch (err) {
    console.error(`diagnoseTracker(${category})`, err);
    return { ...base, verdict: "cannot-read", readError: explainReadError(err) };
  }

  const headerRow = header
    .map((label, i) => ({ column: indexToColumn(i), label: (label ?? "").trim() }))
    .filter((h) => h.label);

  const dataRows = rows.filter((r) => r.some((cell) => cell && cell.trim()));

  if (layout.agentIndex === null) {
    return {
      ...base,
      verdict: "no-agent-column",
      headerRow,
      agentSource: "none",
      totalRows: dataRows.length,
    };
  }

  const comparedWith =
    layout.agentMode === "email" ? [user.email] : await agentNameCandidates(user);
  const matcher =
    layout.agentMode === "email"
      ? buildEmailMatcher(user.email)
      : buildAgentMatcher(comparedWith);

  const counts = new Map<string, number>();
  let matchedRows = 0;
  for (const row of dataRows) {
    const cell = (row[layout.agentIndex] ?? "").trim();
    counts.set(cell, (counts.get(cell) ?? 0) + 1);
    if (matcher(cell)) matchedRows++;
  }

  const sampleValues = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([value, count]) => ({
      value: value || "(blank)",
      count,
      matches: matcher(value),
    }));

  const verdict =
    dataRows.length === 0
      ? "sheet-empty"
      : matchedRows === 0
        ? "no-rows-matched"
        : "ok";

  return {
    ...base,
    verdict,
    headerRow,
    agentColumn: indexToColumn(layout.agentIndex),
    agentHeader: (header[layout.agentIndex] ?? "").trim() || "(no heading)",
    agentSource: layout.agentSource,
    matchMode: layout.agentMode,
    comparedWith,
    totalRows: dataRows.length,
    matchedRows,
    sampleValues,
  };
}

export async function diagnoseAllTrackers(user: PortalUser): Promise<TrackerDiagnosis[]> {
  return Promise.all(REQUEST_CATEGORIES.map((c) => diagnoseTracker(c, user)));
}
