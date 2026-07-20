import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/google";
import { SHEET_CONFIGS, REQUEST_CATEGORIES } from "@/config/sheets";

/**
 * GET /api/health/sheets - connectivity check for the five workflow trackers.
 *
 * Unlike /api/health (which only checks that env vars are present), this
 * actually calls the Google Sheets API for each configured spreadsheet and
 * reports, in plain English, what is wrong when a tracker can't be read.
 * No sheet data is returned - only tab titles and row counts.
 */
export const dynamic = "force-dynamic";

function explain(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (/has not been used in project|is disabled/i.test(message)) {
    return "The Google Sheets API is not enabled in the Google Cloud project that owns the service account. Open console.cloud.google.com, make sure the correct project is selected (top bar), search for 'Google Sheets API' and click ENABLE.";
  }
  if (/caller does not have permission|PERMISSION_DENIED/i.test(message)) {
    return "The service account has no access to this spreadsheet. Open the spreadsheet, click Share, and add the service account email (the long address ending in .iam.gserviceaccount.com, the same one in GOOGLE_SERVICE_ACCOUNT_EMAIL) as a Viewer.";
  }
  if (/Requested entity was not found|not found.*spreadsheet/i.test(message)) {
    return "No spreadsheet exists with this ID. The spreadsheet IDs are set in src/config/sheets.ts - compare them with the ID in each tracker's browser URL (the long code between /d/ and /edit).";
  }
  if (/Tab with gid/i.test(message)) {
    return "The spreadsheet was found, but the expected tab was not. The tab is identified by the gid number in src/config/sheets.ts - open the tracker, click the correct tab, and compare the gid=... number at the end of the browser URL.";
  }
  if (/DECODER routines|invalid_grant|invalid signature|PEM|no start line/i.test(message)) {
    return "The service account private key in .env appears to be pasted incorrectly. Re-copy the whole private_key value from the downloaded JSON file, keeping the \\n parts and the BEGIN/END lines exactly as they appear, all on one line inside the quotes.";
  }
  if (/service account is not configured/i.test(message)) {
    return "GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is missing from .env. Remember to stop the app (Ctrl+C) and run 'npm run dev' again after editing .env.";
  }
  return `Unrecognised error - raw message: ${message}`;
}

export async function GET() {
  const results = [];

  for (const category of REQUEST_CATEGORIES) {
    const config = SHEET_CONFIGS[category];
    try {
      const sheets = getSheetsClient();
      const meta = await sheets.spreadsheets.get({
        spreadsheetId: config.spreadsheetId,
        fields: "sheets(properties(sheetId,title))",
      });
      const tab = meta.data.sheets?.find(
        (s) => s.properties?.sheetId === config.gid
      );
      if (!tab?.properties?.title) {
        throw new Error(
          `Tab with gid ${config.gid} not found in spreadsheet ${config.spreadsheetId}`
        );
      }
      const values = await sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `'${tab.properties.title.replace(/'/g, "''")}'!A2:Z`,
      });
      results.push({
        category,
        ok: true,
        tab: tab.properties.title,
        dataRows: values.data.values?.length ?? 0,
      });
    } catch (err) {
      console.error(`health/sheets: ${category} failed`, err);
      results.push({
        category,
        ok: false,
        spreadsheetId: config.spreadsheetId,
        problem: explain(err),
      });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    { ok: allOk, trackers: results },
    { status: allOk ? 200 : 502 }
  );
}
