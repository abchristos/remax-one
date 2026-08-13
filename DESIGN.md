# RE/MAX One Rentals Intranet — MVP Design Document

> **Since this was written:** two further categories — Queries and POPs
> (proof of payments) — were added, taking the app to eight submit tiles and
> seven tracker sheets. They derive their columns from the sheet's header row
> rather than a hand-written config. See
> [docs/superpowers/specs/2026-08-12-queries-pops-portals-design.md](docs/superpowers/specs/2026-08-12-queries-pops-portals-design.md).
> Counts of "five" and "six" below refer to the original MVP.

## 1. Architecture

### Guiding decision

The existing operation already works: agents fill in Google Forms, Apps Script builds Drive
folders, and admins track progress in five Google Sheets. The riskiest thing an MVP could do is
replace that. So this MVP **wraps** the existing workflow instead of replacing it:

- **Google Sheets stay the system of record.** The portal reads them live (with a short cache)
  through the Google Sheets API using a read-only service account. Admins keep working in the
  sheets exactly as today; agents see their own rows in a clean, mobile-friendly UI.
- **Google Forms stay the intake channel.** The six "Submit…" tiles deep-link to the existing
  forms, so all current Apps Script automation (Drive folders, tracker rows) keeps working.
- **The app adds what Sheets can't do:** company-email login, per-agent data isolation,
  role-based access (admins see everything), branding, and an audit trail.

This gives a real launchable product in days, with a clear later path to migrating intake into
the app itself (native forms + Drive API uploads) without any big-bang cutover.

### Technology stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router, TypeScript)** | One deployable unit for UI + API; SSR; mobile-friendly by default; trivially hosted on Vercel or any Node server |
| Auth | **NextAuth v4 + Google provider** | Agents sign in with their existing company Google account; domain allow-list enforced server-side; stateless JWT sessions |
| Data source | **Google Sheets API v4** (`googleapis`) | The five trackers stay the source of truth; read-only service-account scope |
| Database | **Prisma + SQLite (dev) / PostgreSQL (prod)** | Stores only what the sheets can't: login profiles, agent-name aliases, roles, audit log |
| Styling | **Tailwind CSS + CSS variables** | All brand colours/fonts in one place (`globals.css`); fully responsive |
| Validation | **Zod** | API input validation |
| Hosting | Vercel (recommended) or any Node 18+ host | Zero-ops TLS, CDN, autoscaling |

### Component interaction

```
Agent's phone/desktop browser
        │  HTTPS
        ▼
┌──────────────────────────── Next.js app ────────────────────────────┐
│  /login ──► NextAuth ──► Google OAuth (company domain enforced)     │
│  middleware.ts: every other route requires a session (JWT cookie)   │
│                                                                     │
│  Pages (React) ──fetch──► /api/requests/:category                   │
│                              │ 1. session check                     │
│                              │ 2. load agent aliases  ──► Prisma DB │
│                              │ 3. read tracker sheet  ──► Sheets API│
│                              │    (60s in-memory cache)             │
│                              │ 4. filter rows to this agent, sort   │
│                                                                     │
│  Dashboard tiles ──► existing Google Forms (new tab)                │
└─────────────────────────────────────────────────────────────────────┘
         ▲                                        │ read-only
   Google Workspace                               ▼
   (staff accounts)                    5 tracker Google Sheets
                                       (admins keep editing these)
```

### Scalability & performance

- **130 agents is small traffic.** The binding constraint is the Sheets API quota
  (300 reads/min/project). The 60-second server-side cache means each tracker is read **at most
  once per minute regardless of how many agents are browsing** — quota use is O(sheets), not
  O(users).
- Stateless JWT sessions → any number of app instances, no sticky sessions.
- If the company outgrows the per-instance cache (multi-region serverless), swap the in-memory
  Map in `src/lib/sheets.ts` for Redis — call sites don't change.
- The real scale ceiling is Sheets itself; the designed exit is to promote Postgres to the
  system of record and demote the sheets to an export. The `requests.ts` business layer is the
  only module that would change.

### Security

- Server-enforced domain allow-list (`ALLOWED_EMAIL_DOMAINS`); fails **closed** in production.
- Deactivating a staff member (`AgentProfile.active = false`) blocks login immediately.
- Service account has the read-only Sheets scope only; its key never reaches the browser.
- Middleware guards all routes; the portal layout re-checks the session (defence in depth).
- Per-agent data isolation happens **server-side** — an agent's browser never receives other
  agents' rows. Admin role sees all rows.
- Security headers (X-Frame-Options DENY, nosniff, referrer policy), `robots: noindex`,
  Zod-validated route params, audit log of logins.

---

## 2. File structure

```
remax-one-intranet/
├── package.json                  # scripts + dependencies
├── next.config.mjs               # security headers
├── tailwind.config.ts            # maps Tailwind colours to brand CSS vars
├── tsconfig.json / postcss.config.mjs
├── .env.example                  # documented config template (copy to .env)
├── prisma/
│   ├── schema.prisma             # AgentProfile, AgentAlias, AuditLog
│   └── seed.ts                   # example admin + agent seed
├── public/
│   └── logo.svg                  # ← replace with the official logo
└── src/
    ├── middleware.ts             # auth wall for every non-public route
    ├── config/                   # ★ everything a non-dev might need to change
    │   ├── brand.ts              #   company name, tagline, logo path
    │   ├── forms.ts              #   the 6 Google Form links (dashboard tiles)
    │   └── sheets.ts             #   5 tracker sheets: IDs, gids, column maps
    ├── lib/                      # server-only business logic
    │   ├── auth.ts               #   NextAuth config, domain allow-list
    │   ├── prisma.ts             #   DB client singleton
    │   ├── google.ts             #   Sheets API client (service account)
    │   ├── sheets.ts             #   sheet reads + 60s cache + date parsing
    │   ├── agent-match.ts        #   name-normalisation row matching
    │   └── requests.ts           #   rows → per-agent request lists
    ├── types/next-auth.d.ts      # session type augmentation (role)
    ├── components/
    │   ├── PortalShell.tsx       # left menu (drawer on mobile) + top bar
    │   ├── RequestsView.tsx      # fetch/search/refresh/empty/error states
    │   ├── DataTable.tsx         # table (desktop) / cards (mobile)
    │   ├── StatusBadge.tsx       # colour-coded status pills
    │   └── SubmitTile.tsx        # dashboard form tile
    └── app/
        ├── layout.tsx / globals.css   # root layout + BRAND THEME variables
        ├── page.tsx                   # / → redirect to /dashboard
        ├── login/page.tsx             # public sign-in page
        ├── api/
        │   ├── auth/[...nextauth]/route.ts
        │   ├── requests/[category]/route.ts
        │   └── health/route.ts
        └── (portal)/                  # authenticated area, shares the shell
            ├── layout.tsx
            ├── dashboard/page.tsx     # 6 submit tiles
            ├── leases/page.tsx        # My Leases
            ├── billing/page.tsx       # My Billing
            ├── maintenance/page.tsx   # My Maintenance
            ├── deposits/page.tsx      # My Deposit Payouts
            └── renewals/page.tsx      # My Renewals
```

---

## 3. Database schema

Request data lives in the Google Sheets; the DB stores identity/mapping/audit only.
Prisma source: `prisma/schema.prisma` (SQLite in dev). Equivalent PostgreSQL DDL:

```sql
-- Who may log in. Auto-provisioned on first company-domain Google sign-in.
CREATE TABLE agent_profile (
    id         TEXT PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,          -- login identity (lowercased)
    full_name  TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'AGENT', -- 'AGENT' | 'ADMIN' (admin sees all rows)
    active     BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE blocks login instantly
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL
);

-- The sheets identify agents by hand-typed NAME; login is by EMAIL.
-- Aliases bridge the two ("J. Smith", "John Smith", "Smith J").
CREATE TABLE agent_alias (
    id       TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    agent_id TEXT NOT NULL REFERENCES agent_profile(id) ON DELETE CASCADE,
    UNIQUE (agent_id, name)
);
CREATE INDEX agent_alias_name_idx ON agent_alias(name);

-- Login/audit trail.
CREATE TABLE audit_log (
    id         TEXT PRIMARY KEY,
    email      TEXT NOT NULL,
    action     TEXT NOT NULL,                 -- e.g. 'LOGIN'
    detail     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_email_created_idx ON audit_log(email, created_at);
```

### Virtual schema (Google Sheets, read-only)

| Category | Spreadsheet | Columns used |
|---|---|---|
| Leases | `1ng1XK…bc-t8I` (gid 1806694388) | A date, B property, F admin, G status, H invoices, I recon, J outstanding docs |
| Billing | `1ffV7y…Pgmxa` (gid 980897781) | A date, C property, D instruction, E admin, F status |
| Maintenance | `1wUO6o…0hQAk` (gid 1563606667) | A date, C property, D admin, E status, F notes |
| Deposits | `1Gsy5_…qsHY` (gid 1184353808) | A date, B property, D instructions, E admin, F capturing, G payout |
| Renewals | `1r5GHJ…P-7k` (gid 1923552671) | A date, C property, D scope, E instructions, F admin, G status |

> ⚠️ **One assumption to verify:** the requirements never said which column holds the **agent's
> name** in each sheet. Defaults (Leases C, Billing B, Maintenance B, Deposits C, Renewals B)
> live in `src/config/sheets.ts` and can be overridden with `SHEETS_<CATEGORY>_AGENT_COL` env
> vars. Check them against the real sheet headers before launch.

---

## 4. API endpoints

All endpoints are same-origin, JSON, and session-authenticated (JWT cookie) unless noted.

### `GET /api/requests/:category`
`category` ∈ `leases | billing | maintenance | deposits | renewals`

Returns the **logged-in agent's** rows from the matching tracker (admins get all rows),
newest first.

**200 response**
```json
{
  "category": "leases",
  "title": "My Leases",
  "columns": [
    { "key": "submitted", "label": "Date Submitted", "kind": "date" },
    { "key": "property",  "label": "Property", "kind": "text", "primary": true },
    { "key": "admin",     "label": "Admin", "kind": "text" },
    { "key": "status",    "label": "Lease Status", "kind": "status" },
    { "key": "invoices",  "label": "Invoices Sent", "kind": "status" },
    { "key": "recon",     "label": "Recon Status", "kind": "status" },
    { "key": "outstandingDocs", "label": "Outstanding Documents", "kind": "notes" }
  ],
  "rows": [
    { "id": "leases-17", "values": { "submitted": "01/07/2026", "property": "12 Main Rd", "admin": "Thandi", "status": "In Progress", "invoices": "Sent", "recon": "Pending", "outstandingDocs": "FICA docs" } }
  ],
  "total": 1,
  "fetchedAt": "2026-07-04T09:00:00.000Z"
}
```
Errors: `401` not signed in · `404` unknown category · `502` Sheets unreachable.
`Cache-Control: private, max-age=30`. The column metadata is returned with the data, so the UI
renders any future sheet-layout change without a frontend release.

### `GET /api/auth/*` · `POST /api/auth/*`
NextAuth endpoints (Google OAuth sign-in/out, session, CSRF).

### `GET /api/health` *(public)*
Liveness probe: `{ "ok": true, "missingEnv": [] }` — reports missing env var **names** only,
never values. `503` when misconfigured.

---

## 5. UI architecture

- **Routing (App Router):** `/login` (public) → `(portal)` group behind auth: `/dashboard`
  plus the five list pages. The `(portal)/layout.tsx` renders `PortalShell` once, so the left
  menu and top bar persist across navigation.
- **Left menu (the 5 required options + Home):** My Leases, My Billing, My Maintenance,
  My Deposit Payouts, My Renewals. Fixed sidebar ≥768px; hamburger + slide-in drawer with
  overlay below that. Active item highlighted via `usePathname`.
- **Main page body:** the six required submit tiles, each opening the existing Google Form in
  a new tab.
- **State management:** deliberately no Redux/Zustand — server is the source of truth. The one
  shared client component `RequestsView` owns fetch/loading/error/empty/search/refresh state;
  the five pages are 10-line wrappers that pass a `category`. Drawer open/close is local state.
- **Responsive data display:** `DataTable` renders a real table on desktop and stacked cards on
  mobile (property name as card title, label/value pairs beneath) — no horizontal scrolling on
  phones.
- **Branding:** all colours/fonts are CSS variables in `globals.css`, consumed by Tailwind as
  `brand-*` utility colours; name/tagline/logo in `config/brand.ts`; logo file in
  `public/logo.svg`. Re-skinning the whole intranet is a 5-minute, 2-file change.
- **Accessibility:** semantic nav/table/dl markup, `aria-current` on active nav, `role=alert`
  on errors, focus rings, `aria-busy` skeletons.

---

## 6. Complete code

The full, commented source is in this repository (see the file structure above — every file
listed exists). Start reading at `src/config/` (business configuration), then
`src/lib/requests.ts` (the core data flow), then `src/components/`.

## 7. Build & run guide

See [README.md](README.md) for the step-by-step setup, Google Cloud configuration, run and
deployment instructions.
