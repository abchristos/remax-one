# Queries & POPs portals — design

Date: 2026-08-12
Status: approved

## Goal

Add two new request categories to the agent intranet — **Queries** and **POPs**
(proof of payments) — each with a "Submit" tile on the dashboard and a
"My Queries" / "My POPs" tracking page in the sidebar, matching the five
existing portals.

## Sources

| | Queries | POPs |
|---|---|---|
| Form | `https://forms.gle/dPdJ7gBdYngrFbCA7` | `https://forms.gle/77Bf6S4BH9MNVCZ28` |
| Sheet | `1JugZJqS-VOIvvSVNTwetw78Od5YxMwR_2UONlppxgMM` | `1II2zDM8KFjd-ygIhP6wXRVxulOeRfFfMYsaXIrLcQuU` |
| Tab | gid 0 | gid 0 |

The Queries form is public and its questions are known: Timestamp (A),
Name of Agent (B), Agent email address (C), Property Name / Address (D),
query description (E). The POPs form is sign-in restricted and its columns
were not available at design time. Neither sheet's admin-side columns are known.

## Decision: auto-discovered columns

Rather than hand-writing a column config for each new sheet (as the five
existing portals do), these two portals **read row 1 of the sheet at runtime**
and build their column list from the real headers. This lets the portals ship
without knowing either sheet's layout, and keeps working when admins add
columns.

Accepted trade-off: every column an admin fills in is visible to the agent on
that row. If a column is used for internal remarks it must be added to a
hide-list.

`SheetConfig.fields` becomes optional. When present (the five existing
portals) behaviour is unchanged. When absent, columns are derived.

### Header → display kind

| Header matches | Kind |
|---|---|
| `date`, `timestamp`, `submitted` | date |
| `status` | status badge |
| `describe`, `note`, `comment`, `reason`, `query`, `instruction` | notes (wrapped) |
| anything else | text |

Columns whose header contains `email` are used for matching but **hidden from
display** — an agent does not need their own address repeated on every row.
Blank trailing headers are dropped.

The card title on mobile (`primary`) is the first visible column that is
neither a date nor the agent column — in practice the property name.

## Decision: agent matching fails closed

Each portal shows an agent only their own rows. For a sheet with an unknown
layout the identifying column must be detected, and **getting it wrong must
not expose other agents' rows**.

Detection order:

1. `SHEETS_QUERIES_AGENT_COL` / `SHEETS_POPS_AGENT_COL` env override, if set.
2. A header matching agent-email (e.g. "Agent email address") → **email mode**:
   exact, case-insensitive comparison against the signed-in Google address.
3. A header containing `agent` / `consultant` / `name` → **name mode**: the
   existing alias-aware name matcher.
4. **Nothing found → zero rows** plus an on-screen notice. Never all rows.

Email mode is stronger than anything the five existing portals have: it needs
no aliases and cannot mis-attribute a row. The Queries sheet will use it
(column C). POPs resolves at runtime.

ADMIN users continue to see all rows in every mode.

## Components

New module `src/lib/columns.ts` — header parsing, kept out of both the config
and the business layer:

- `deriveColumns(header)` → display columns with kind, key, sheet index
- `detectAgentColumn(header)` → `{ index, mode } | null`

Changed:

- `src/config/sheets.ts` — two new categories; `fields`/`agentColumn` optional
- `src/lib/sheets.ts` — `fetchSheetHeader()`, cached 10 min like tab titles
- `src/lib/agent-match.ts` — `buildEmailMatcher()`
- `src/lib/requests.ts` — derived-layout branch, `notice` on the response
- `src/config/forms.ts`, `src/components/SubmitTile.tsx` — two tiles, 8 total
- `src/components/PortalShell.tsx` — two sidebar links
- `src/components/RequestsView.tsx` — render `notice` as an amber banner
- `src/app/(portal)/queries/page.tsx`, `.../pops/page.tsx`

The API route needs no change: it validates against `REQUEST_CATEGORIES`.

## Error handling

| Case | Behaviour |
|---|---|
| Sheet not shared with service account | 502, existing red error panel |
| Agent column undetectable | 200, zero rows, amber notice |
| Header row entirely blank | treated as undetectable → notice |
| Row blank | skipped, as today |

## Deployment prerequisite

Both new spreadsheets must be shared as **Viewer** with the
`GOOGLE_SERVICE_ACCOUNT_EMAIL` service account, exactly like the other five.
Without this both portals return 502. Documented in `.env.example` and
`EASY-GUIDE.txt`.

## Out of scope

- Changing the five existing portals
- A hide-list for internal admin columns (add on request)
- Writing back to sheets — they remain read-only, admin-owned
