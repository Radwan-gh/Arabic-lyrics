# نفحات — Arabic Lyrics Manager

A mobile-friendly, right-to-left web app for managing Arabic song lyrics, with
user accounts and role-based permissions.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** for styling — mobile-first, RTL-aware (logical `start`/`end`
  utilities), `dir="rtl" lang="ar"` throughout, Tajawal Arabic font
- **PostgreSQL** via **Prisma ORM**
- Custom cookie-based auth (JWT signed with `jose`, passwords hashed with
  `bcryptjs`) — no external auth provider required

## Roles

| Role   | Can do |
|--------|--------|
| Viewer | Browse and read lyrics (default role for new accounts) |
| Editor | Everything a Viewer can, plus create lyrics and edit/delete their own |
| Admin  | Everything, plus edit/delete any lyrics and manage users — create accounts, set/change passwords, change roles, activate/deactivate, and delete |

Admins create accounts from **إدارة المستخدمين** (Admin → Users), where they
set the new user's name, email, password, and role. Admins can also change any
user's password from the same screen.

### Sign up with Google (admin approval)

When `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set, the login page
shows **المتابعة باستخدام Google**:

- A Google account with no matching user is sent to **إكمال إنشاء الحساب**
  (`/signup/complete`), where the user must type their **full name** (at least
  first and last name, letters only). Only then is a **Viewer** account created,
  **pending approval** — it cannot sign in yet, and the login page tells the
  user their request was received. The verified Google identity is kept in a
  signed, 30-minute cookie between the two steps.
- Pending requests appear at the top of **إدارة المستخدمين** (with a count
  badge on the menu link). The Admin picks a role and approves, or rejects
  (which deletes the request).
- A Google account whose verified email matches an existing user is linked to
  that user and signs straight in (subject to the usual active check).
- Google-only accounts have no password; an Admin can set one later from the
  same screen if needed.

Setup: in Google Cloud Console → APIs & Services → Credentials, create an OAuth
client ID of type **Web application**, add
`<APP_URL>/api/auth/google/callback` as an authorized redirect URI, then set
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `APP_URL` (see `.env.example`).

The first Admin is bootstrapped with the seed script (see below) — there is
no self-service sign-up to create it through the UI.

## Local setup

### Prerequisites

- Node.js 18.18+
- A PostgreSQL database (local install, Docker, or a managed service such as
  Neon/Supabase/RDS)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — a long random string (`openssl rand -base64 48`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — only used by the seed script below

### 3. Create the database schema

```bash
npx prisma migrate dev --name init
```

### 4. Seed an admin account (optional but recommended)

```bash
npm run db:seed
```

This creates (or updates) the admin account from `ADMIN_EMAIL`/`ADMIN_PASSWORD`,
one sample lyrics entry, **and** the bundled collection of ~600 **أناشيد**
(grouped by مقام, with attribution and rhythm tags). Since there is no public
self-registration, run this at least once to bootstrap the first Admin account —
everyone else is created afterwards from **إدارة المستخدمين** in the app.

The whole seed is idempotent — the admin is upserted and anaasheed already
present are skipped — so it is safe to re-run, and it runs automatically on
deploy when `SEED_ON_START=true` (see the `start` script). To seed only the
anaasheed against an existing database, use `npm run db:seed:anaasheed`. The
parsed data lives in `prisma/data/anaasheed.json`; regenerate it from the source
text with `node prisma/data/parse-anaasheed.mjs`.

### 5. Run the dev server

```bash
npm run dev
```

Visit http://localhost:3000.

## Production build

```bash
npm run build
npm run start
```

`npm run start` runs `prisma db push` before booting Next.js, which syncs
`prisma/schema.prisma` straight to the database — no migration files
required. This is intentional for now since the repo doesn't yet have a
`prisma/migrations` history (it was built without a database available to
generate one against). If you want proper tracked migrations going forward,
run `npx prisma migrate dev --name init` locally against a dev database once,
commit the generated `prisma/migrations` folder, and switch the `start`
script back to `prisma migrate deploy`.

## Deploying to Railway

This repo is ready for Railway's Nixpacks builder as-is — `railway.json` pins
the build/deploy config, `npm run start` runs `prisma migrate deploy` before
`next start`, and `.nvmrc` pins Node 20.

1. **Create the project.** On [railway.app](https://railway.app), New Project
   → **Deploy from GitHub repo** → select `Radwan-gh/Arabic-lyrics` → branch
   `claude/arabic-lyrics-web-app-tgofrp` (or `main` once merged).
2. **Add a Postgres database.** In the same project: **+ New** → **Database**
   → **PostgreSQL**. Railway provisions it and exposes its connection info.
3. **Set environment variables** on the web service (Settings → Variables):
   - `DATABASE_URL` → reference the Postgres plugin's variable:
     `${{Postgres.DATABASE_URL}}`
   - `JWT_SECRET` → a long random string, e.g. generate locally with
     `openssl rand -base64 48` and paste it in (Railway variables are secret
     by default)
   - `NODE_ENV` → `production`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` → used by the seed script to bootstrap
     the first Admin account (required, since there is no public sign-up)
4. **Deploy.** Railway builds with Nixpacks (`npm install` → `postinstall`
   runs `prisma generate` → `npm run build`) and starts the service with
   `npm run start`, which runs `prisma migrate deploy` against the Postgres
   plugin before booting Next.js — so the schema is applied automatically on
   every deploy, first one included.
5. **Bootstrap an admin.** There is no public sign-up, so run the seed script
   once against the deployed database using the [Railway CLI](https://docs.railway.com/guides/cli):
   ```bash
   railway link      # select this project
   railway run npm run db:seed
   ```
6. **Domain.** Settings → Networking → Generate Domain for a free
   `*.up.railway.app` URL, or attach a custom domain from the same screen.

Note: this app was built and pushed from a sandboxed environment with no
network access to Railway, so the steps above have not been run end-to-end —
please flag anything that doesn't match Railway's current UI/CLI.

## Offline reading (PWA)

The app is an installable PWA that **works offline with the very same pages** —
there is no separate offline page or offline UI. Reading data lives in an
on-device database, and each page renders from it when there is no connection.

How it works (reading only; creating/editing and sign-in still need a
connection):

- **On-device database** (`src/lib/offline-db.ts`, IndexedDB): all lyrics, plus
  the signed-in user's favorites and playlists.
- **Incremental sync** (`src/lib/offline-sync.ts`): `GET /api/public/lyrics`
  returns everything on first sync and only lyrics changed since the last sync
  afterwards (`?since=`, based on `updatedAt`). Its `order` field (all current
  ids in alphabetical order) drives sorting and removes deleted lyrics.
  `GET /api/offline/me` returns the user's favorites/playlists. Sync runs on
  each app open, when the connection returns, and after any successful edit.
- **One page shell per page type** (`public/sw.js`): the service worker caches
  the HTML of `/`, `/lyrics/[id]`, `/favorites`, `/playlists`,
  `/playlists/[id]` and `/playlists/[id]/view` *without data* (fetched with an
  `x-sw-shell` header, which makes the page skip the database). Offline, any
  URL of that type gets its shell, and the page loads the content for the
  actual URL from the device (`useOfflinePageData` in `src/lib/offline-data.ts`).
  `/discover` is cached as a normal page. Online, every page is still fully
  server-rendered, so search engines and link previews are unaffected.
- Home search, tags, sort and favorites search/sort run locally offline: the URL
  is updated via the History API (`src/lib/use-app-router.ts`) and results are
  computed from the device database.
- Cached shells and private data are tied to the session: sign-in/sign-out
  (including Google sign-in or an expired session) clears and re-saves them.
- The menu shows the save status (`src/components/OfflineStatusLine.tsx`):
  progress, «متاح دون إنترنت» once data and shells are saved, or "incomplete".

Storage, measured locally with 599 lyrics: about 1.9 MB (0.83 MB database +
0.1 MB shells + 0.93 MB static assets), versus about 24 MB when every page was
cached. A full first sync is one request of about 0.2 MB over the network (the
sync responses are compressed with brotli/gzip in `src/lib/compressed-json.ts`,
since Next.js does not compress API route responses; 0.89 MB uncompressed);
later syncs only transfer changed lyrics. Note: viewing a lyric bumps its `updatedAt` (view
counter), so viewed lyrics are included in the next incremental sync.

## MCP server (AI assistants)

The app exposes a [Model Context Protocol](https://modelcontextprotocol.io)
server at **`/api/mcp`** (Streamable HTTP, stateless), so AI assistants such as
Claude can search, read, and manage lyrics directly.

| Tool | Access |
|------|--------|
| `search_lyrics`, `get_lyrics`, `list_tags` | Anyone (no token) |
| `get_playlist` | Owner, or anyone for a public playlist |
| `add_lyrics` | Editor/Admin token |
| `update_lyrics` | Admin token, or the Editor who created the lyric |
| `list_my_playlists`, `create_playlist`, `add_to_playlist` | Any valid token (own playlists only) |

Lyrics text goes in and out as plain text (one line per verse, a blank line
between stanzas, `*bold*` / `_italic_` markers) — the same format as the editor.
Adding or renaming to an existing title is refused with the matching lyrics
unless `allowDuplicate` is set, as in the web UI. Nothing can be deleted
through MCP.

**Access tokens.** Write tools need a personal token, issued from a shell that
has the production `DATABASE_URL` and `JWT_SECRET` (e.g. `railway run`):

```bash
npm run mcp:token -- user@example.com
```

The token is valid for a year and acts as that user. Its role and active state
are read from the database on every request, so deactivating the user (or
changing their role) applies immediately; rotating `JWT_SECRET` revokes every
token (and signs everyone out). A request with an invalid token gets `401` —
it never silently falls back to anonymous access.

**Connecting Claude Code:**

```bash
claude mcp add --transport http nafahat https://<your-app>/api/mcp \
  --header "Authorization: Bearer <token>"
```

Omit `--header` for read-only access. In claude.ai, add it as a custom
connector with the URL only (read-only tools; custom connectors there do not
send static bearer tokens).

## Project structure

```
prisma/schema.prisma       Database schema (User, Lyrics)
prisma/seed.ts             Seed script (admin bootstrap + sample lyrics)
prisma/seed-anaasheed.ts   Idempotent seeder for the أناشيد collection
prisma/data/               أناشيد source text, parsed JSON, and the parser
src/lib/                   Prisma client, JWT/session helpers, password hashing
src/middleware.ts          Route protection for /admin and lyrics create/edit
src/app/                   Pages (App Router) and API routes
src/lib/mcp/server.ts      MCP tools (served by src/app/api/mcp)
prisma/mcp-token.ts        Issues MCP access tokens (npm run mcp:token)
src/components/            Client-side UI components (forms, nav, tables)
```

## Note on this repository's initial commit

This codebase was generated in a sandboxed environment without access to the
npm registry, so `npm install` / `npm run build` could not be executed or
verified before committing. Please run through steps 1–5 above once to
confirm everything installs and builds cleanly, and open an issue/PR for
anything that needs fixing.
