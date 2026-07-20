import { google, sheets_v4 } from "googleapis";

/**
 * Google Sheets API client authenticated with a read-only service account.
 * The service account email must be given Viewer access on each tracker
 * spreadsheet - no OAuth flow, no user tokens, credentials never leave
 * the server.
 */
let client: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (client) return client;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // The key is stored with literal \n in .env; restore real newlines.
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Google service account is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  client = google.sheets({ version: "v4", auth });
  return client;
}
