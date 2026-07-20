import { getSheetsClient } from "./google";
import { SheetConfig } from "@/config/sheets";

/**
 * Low-level sheet reading with a short in-memory cache.
 *
 * The cache keeps the portal snappy for 130+ agents while staying within the
 * Sheets API quota (300 read requests/min/project): at a 60s TTL each tracker
 * is read at most once a minute no matter how many agents are browsing.
 *
 * Note for serverless hosting (Vercel/Lambda): the cache is per warm
 * instance, which is still effective. For multi-region scale swap this Map
 * for Redis without changing the call sites.
 */

const CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const tabTitleCache = new Map<string, CacheEntry<string>>();
const rowsCache = new Map<string, CacheEntry<string[][]>>();

function getCached<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const hit = map.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  map.delete(key);
  return undefined;
}

/** Resolve a gid (from the sheet URL) to its current tab title. */
async function resolveTabTitle(spreadsheetId: string, gid: number): Promise<string> {
  const key = `${spreadsheetId}:${gid}`;
  const cached = getCached(tabTitleCache, key);
  if (cached) return cached;

  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });

  const tab = meta.data.sheets?.find((s) => s.properties?.sheetId === gid);
  const title = tab?.properties?.title;
  if (!title) {
    throw new Error(`Tab with gid ${gid} not found in spreadsheet ${spreadsheetId}`);
  }

  // Tab titles rarely change - cache for 10 minutes.
  tabTitleCache.set(key, { value: title, expiresAt: Date.now() + 10 * CACHE_TTL_MS });
  return title;
}

/**
 * Fetch all data rows (row 2 downward, columns A-Z) of a tracker tab as
 * formatted strings - exactly what the admins see in the sheet.
 */
export async function fetchSheetRows(config: SheetConfig): Promise<string[][]> {
  const key = `${config.spreadsheetId}:${config.gid}:values`;
  const cached = getCached(rowsCache, key);
  if (cached) return cached;

  const title = await resolveTabTitle(config.spreadsheetId, config.gid);
  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `'${title.replace(/'/g, "''")}'!A2:Z`,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const rows = (res.data.values ?? []) as string[][];
  rowsCache.set(key, { value: rows, expiresAt: Date.now() + CACHE_TTL_MS });
  return rows;
}

/**
 * Best-effort parse of the date strings found in the trackers so lists can
 * be sorted newest-first. Supports dd/mm/yyyy (SA convention), yyyy-mm-dd
 * and anything Date.parse understands. Returns null when unparseable.
 */
export function parseSheetDate(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();

  // dd/mm/yyyy or dd-mm-yyyy (with optional time)
  const dmy = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day).getTime();
    }
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}
