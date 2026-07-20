# RE/MAX One Rentals Intranet

Mobile-friendly agent portal: company-email sign-in, live tracking of leases, billing,
maintenance, deposit payouts and renewals straight from the existing Google Sheet workflow
trackers, and one-click access to the existing submission forms.

Architecture and design rationale: see [DESIGN.md](DESIGN.md).

---

## Build & run guide

### 0. Prerequisites

- **Node.js 18.17+** (LTS recommended) and npm
- A **Google Cloud project** you can create credentials in (any Google Workspace admin can)
- Viewer access to the five workflow tracker spreadsheets

### 1. Get the code & install dependencies

```bash
cd remax-one-intranet
npm install
```

### 2. Google Cloud setup (one-time, ~15 minutes)

Do all of this at https://console.cloud.google.com in (or after creating) a project,
e.g. `remax-one-intranet`.

**a) Enable the Sheets API**
APIs & Services → Library → search **Google Sheets API** → Enable.

**b) OAuth consent screen** (for staff sign-in)
APIs & Services → OAuth consent screen → User type **Internal** (this alone limits sign-in to
your Workspace) → fill in app name and support email → Save.

**c) OAuth client** (the login credential)
APIs & Services → Credentials → Create credentials → **OAuth client ID** → type
**Web application**:
- Authorized JavaScript origins: `http://localhost:3000` (add your production URL later)
- Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
  (and later `https://your-domain/api/auth/callback/google`)

Copy the **Client ID** and **Client Secret**.

**d) Service account** (read-only sheet access)
IAM & Admin → Service Accounts → Create (e.g. `intranet-reader`) → no project roles needed →
open it → Keys → Add key → **JSON** → download.

**e) Share the sheets with the service account**
Open each of the 5 tracker spreadsheets → Share → add the service account email
(`intranet-reader@…iam.gserviceaccount.com`) as **Viewer**.

### 3. Configure the environment

```bash
copy .env.example .env      # (cp on macOS/Linux)
```

Fill in `.env`:

| Variable | Value |
|---|---|
| `NEXTAUTH_URL` | `http://localhost:3000` for dev |
| `NEXTAUTH_SECRET` | any long random string (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from step 2c |
| `ALLOWED_EMAIL_DOMAINS` | your company email domain(s), e.g. `remax-one.co.za` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the JSON key (step 2d) |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `private_key` from the JSON key — paste as one line, keeping the `\n` escapes and surrounding quotes |
| `DATABASE_URL` | leave as `file:./dev.db` for dev |

> ⚠️ **Verify the agent-name columns.** The portal filters each sheet to the logged-in agent
> using the column that holds the agent's name. Defaults are in `src/config/sheets.ts`
> (Leases C, Billing B, Maintenance B, Deposits C, Renewals B). Open each sheet, check the
> header row, and correct via the `SHEETS_<CATEGORY>_AGENT_COL` variables in `.env` if needed.

### 4. Create the database

```bash
npm run db:migrate      # creates dev.db and the tables (accept the migration name prompt)
npm run db:seed         # optional: example admin + agent (edit prisma/seed.ts first)
```

### 5. Run in development

```bash
npm run dev
```

Open http://localhost:3000 → you're redirected to the login page → sign in with a company
Google account → dashboard.

**Smoke test:** http://localhost:3000/api/health should return `{"ok":true,"missingEnv":[]}`.

### 6. Give agents access & map their names

- Any company-domain account can sign in; a profile row is created automatically on first login.
- If an agent's tracker rows don't appear, their name in the sheets differs from their Google
  display name. Add aliases (until an admin UI exists, via Prisma Studio):

```bash
npx prisma studio
```

Open **AgentProfile**, find the agent, add **AgentAlias** rows with the exact spellings used in
the sheets. To make someone an admin (sees all rows), set their `role` to `ADMIN`.

### 7. Branding

1. Replace `public/logo.svg` with the official logo (keep the filename, or update
   `logoSrc` in `src/config/brand.ts`).
2. Edit the CSS variables at the top of `src/app/globals.css` (primary/secondary colours,
   font). Defaults are RE/MAX red `#DC1C2E` and blue `#003DA5`.
3. Edit names/tagline/support email in `src/config/brand.ts`.

### 8. Production build & deployment

**Local production build:**

```bash
npm run build
npm start          # serves on port 3000
```

**Recommended host — Vercel:** import the repo, set all `.env` variables in Project Settings
(change `NEXTAUTH_URL` to the real URL), and add the production redirect URI to the OAuth
client (step 2c). For the database, use a managed Postgres (Vercel Postgres/Neon/Supabase):
in `prisma/schema.prisma` change `provider = "sqlite"` to `"postgresql"`, set `DATABASE_URL`,
and run `npm run db:deploy` once against it.

**Self-hosted alternative:** any Node 18+ server or Docker; run `npm run build && npm start`
behind a TLS reverse proxy (Caddy/nginx). SQLite is fine at this scale if the server has a
persistent disk; otherwise use Postgres as above.

**Go-live checklist**

- [ ] `ALLOWED_EMAIL_DOMAINS` set (in production, login **fails closed** without it)
- [ ] Fresh `NEXTAUTH_SECRET`, `NEXTAUTH_URL` = real https URL
- [ ] Production redirect URI added to the OAuth client
- [ ] All 5 sheets shared with the service account (Viewer)
- [ ] Agent-name columns verified per sheet
- [ ] `/api/health` returns `ok: true` on the production URL
- [ ] Logo + colours updated (step 7)

### Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "Please sign in with your company email" | Account domain not in `ALLOWED_EMAIL_DOMAINS`, or profile set `active = false` |
| A page shows "Couldn't load…" | Sheet not shared with the service account, Sheets API not enabled, or private key pasted wrong (must keep `\n` escapes) |
| Agent sees an empty list but has rows in the sheet | Wrong agent-name column (step 3 warning) or name spelling mismatch — add an alias (step 6) |
| `Tab with gid … not found` | The tracker tab was deleted/recreated (new gid) — update the `gid` in `src/config/sheets.ts` |
| Redirect loop on login | `NEXTAUTH_URL` doesn't match the URL in the browser |
