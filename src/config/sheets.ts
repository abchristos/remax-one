/**
 * Google Sheets workflow-tracker configuration.
 *
 * Each of the five request categories maps to one tab (identified by gid)
 * of an existing tracker spreadsheet. Column letters below come straight
 * from the business requirements.
 *
 * IMPORTANT - AGENT COLUMN: the requirements did not state which column
 * holds the agent's name in each sheet, but the portal needs it to show each
 * agent only their own rows. The defaults below are sensible guesses -
 * VERIFY THEM against the real sheet headers and correct them here or via
 * the SHEETS_<CATEGORY>_AGENT_COL environment variables.
 */

export const REQUEST_CATEGORIES = [
  "leases",
  "billing",
  "maintenance",
  "deposits",
  "renewals",
  "queries",
  "pops",
] as const;

export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

export type FieldKind = "date" | "text" | "status" | "notes";

export interface SheetField {
  key: string;
  label: string;
  /** Column letter in the sheet, e.g. "A" */
  column: string;
  kind: FieldKind;
  /** The field shown as the card title on mobile (the property name) */
  primary?: boolean;
}

export interface SheetConfig {
  category: RequestCategory;
  title: string;
  spreadsheetId: string;
  /** The gid from the sheet URL - resolved to a tab name at runtime */
  gid: number;
  /**
   * Column letter holding the agent's name or email (used to filter rows per
   * user). Omit to detect it from the header row at runtime - see
   * src/lib/columns.ts. Detection fails closed: no column found means no rows.
   */
  agentColumn?: string;
  /**
   * The columns to display. Omit to build them from row 1 of the sheet, which
   * lets a portal work without its layout being transcribed here.
   */
  fields?: SheetField[];
}

/** Convert a zero-based index back to a column letter (0 -> "A", 26 -> "AA"). */
export function indexToColumn(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** Convert a column letter ("A", "B", ... "AA") to a zero-based index. */
export function columnToIndex(letter: string): number {
  let index = 0;
  for (const ch of letter.trim().toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index - 1;
}

function agentCol(envVar: string, fallback: string): string {
  const value = process.env[envVar]?.trim();
  return value && /^[A-Za-z]{1,2}$/.test(value) ? value.toUpperCase() : fallback;
}

/** Same, but with no fallback: undefined means "detect from the header row". */
function optionalAgentCol(envVar: string): string | undefined {
  const value = process.env[envVar]?.trim();
  return value && /^[A-Za-z]{1,2}$/.test(value) ? value.toUpperCase() : undefined;
}

export const SHEET_CONFIGS: Record<RequestCategory, SheetConfig> = {
  leases: {
    category: "leases",
    title: "My Leases",
    spreadsheetId: "1ng1XK1rTOhfWNUqZUbC9wgcDRZihqWnI8ISM9bc-t8I",
    gid: 1806694388,
    agentColumn: agentCol("SHEETS_LEASES_AGENT_COL", "C"),
    fields: [
      { key: "submitted", label: "Date Submitted", column: "A", kind: "date" },
      { key: "property", label: "Property", column: "B", kind: "text", primary: true },
      { key: "admin", label: "Admin", column: "F", kind: "text" },
      { key: "status", label: "Lease Status", column: "G", kind: "status" },
      { key: "invoices", label: "Invoices Sent", column: "H", kind: "status" },
      { key: "recon", label: "Recon Status", column: "I", kind: "status" },
      { key: "outstandingDocs", label: "Outstanding Documents", column: "J", kind: "notes" },
    ],
  },
  billing: {
    category: "billing",
    title: "My Billing",
    spreadsheetId: "1ffV7ygAqS4vU2QmWmu3X1KrvfjrizqrNBiM5zNPgmxA",
    gid: 980897781,
    agentColumn: agentCol("SHEETS_BILLING_AGENT_COL", "B"),
    fields: [
      { key: "submitted", label: "Date Submitted", column: "A", kind: "date" },
      { key: "property", label: "Property", column: "C", kind: "text", primary: true },
      { key: "instruction", label: "Agent Instruction", column: "D", kind: "notes" },
      { key: "admin", label: "Admin", column: "E", kind: "text" },
      { key: "status", label: "Billing Status", column: "F", kind: "status" },
    ],
  },
  maintenance: {
    category: "maintenance",
    title: "My Maintenance",
    spreadsheetId: "1wUO6oSVLeYsPJMwqy5NjGX-zrC-ilsxa1-WIvr0hQAk",
    gid: 1563606667,
    agentColumn: agentCol("SHEETS_MAINTENANCE_AGENT_COL", "B"),
    fields: [
      { key: "submitted", label: "Date Submitted", column: "A", kind: "date" },
      { key: "property", label: "Property", column: "C", kind: "text", primary: true },
      { key: "admin", label: "Admin", column: "D", kind: "text" },
      { key: "status", label: "Status", column: "E", kind: "status" },
      { key: "notes", label: "Request Notes", column: "F", kind: "notes" },
    ],
  },
  deposits: {
    category: "deposits",
    title: "My Deposit Payouts",
    spreadsheetId: "1Gsy5_XwjVJr2F5rcTPNc0izFhXtp0Wmtdvz8JKcqsHY",
    gid: 1184353808,
    agentColumn: agentCol("SHEETS_DEPOSITS_AGENT_COL", "C"),
    fields: [
      { key: "submitted", label: "Date Submitted", column: "A", kind: "date" },
      { key: "property", label: "Property", column: "B", kind: "text", primary: true },
      { key: "instructions", label: "Special Instructions", column: "D", kind: "notes" },
      { key: "admin", label: "Admin", column: "E", kind: "text" },
      { key: "capturing", label: "Capturing Status", column: "F", kind: "status" },
      { key: "payout", label: "Payout Status", column: "G", kind: "status" },
    ],
  },
  renewals: {
    category: "renewals",
    title: "My Renewals",
    spreadsheetId: "1r5GHJ5rmx7R_GmcCY58ToQTZ4rMve9M6GFJYHkNP-7k",
    gid: 1923552671,
    agentColumn: agentCol("SHEETS_RENEWALS_AGENT_COL", "B"),
    fields: [
      { key: "submitted", label: "Date Submitted", column: "A", kind: "date" },
      { key: "property", label: "Property", column: "C", kind: "text", primary: true },
      { key: "scope", label: "Scope of Work", column: "D", kind: "notes" },
      { key: "instructions", label: "Special Instructions", column: "E", kind: "notes" },
      { key: "admin", label: "Admin", column: "F", kind: "text" },
      { key: "status", label: "Status", column: "G", kind: "status" },
    ],
  },

  // The two newest trackers declare no `fields` and no `agentColumn`: their
  // columns are read from row 1 of the sheet at runtime. See src/lib/columns.ts.
  queries: {
    category: "queries",
    title: "My Queries",
    spreadsheetId: "1JugZJqS-VOIvvSVNTwetw78Od5YxMwR_2UONlppxgMM",
    gid: 0,
    agentColumn: optionalAgentCol("SHEETS_QUERIES_AGENT_COL"),
  },
  pops: {
    category: "pops",
    title: "My POPs",
    spreadsheetId: "1II2zDM8KFjd-ygIhP6wXRVxulOeRfFfMYsaXIrLcQuU",
    gid: 0,
    agentColumn: optionalAgentCol("SHEETS_POPS_AGENT_COL"),
  },
};
