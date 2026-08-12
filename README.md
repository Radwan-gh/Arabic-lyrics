# أناشيد — Arabic Lyrics Manager

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

There is **no public self-registration**. Only an Admin can create new
accounts, and they do so from **إدارة المستخدمين** (Admin → Users), where
they set the new user's name, email, password, and role. Admins can also
change any user's password from the same screen.

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

The app is an installable PWA that supports **reading offline**. After you open
it once while online, the whole public **أناشيد** collection — and, if you are
signed in, your **favorites** and **playlists** — are cached on the device and
readable with no internet.

When there is no connection, **the same interfaces keep working**: navigating to
the home page (`/`), a single lyric (`/lyrics/[id]`), your favorites
(`/favorites`), or your playlists (`/playlists`/`/playlists/[id]`) renders that
very screen from the cached snapshot, with a banner noting it is a saved copy.
The dedicated **«دون اتصال»** page (`/offline`) remains available as a full
reader (collection / favorites / playlists tabs with search and cache status).

How it works (all read-only; creating/editing and sign-in still need a
connection):

- `GET /api/public/lyrics` returns the full collection as JSON (used as the
  offline snapshot), and `GET /api/offline/me` returns the signed-in user's
  favorites/playlists as lightweight ID references.
- `public/sw.js` (service worker) caches the app shell, the collection
  snapshot (stale-while-revalidate), and the private user snapshot
  (network-first). It never caches auth or other `/api/*` mutations. For page
  navigations it tries the network first, then the exact cached page, then the
  `/offline` shell — so an offline visit to any route above still loads the app.
- `src/components/OfflineReader.tsx` powers both modes: when served for `/offline`
  it shows the full reader; when the service worker serves it in place of another
  route, it reads `location.pathname` and mirrors that page (home / detail /
  favorites / playlists) from the cache — reusing the same `LyricsCard` and
  client-side Arabic search (`src/lib/arabic-search.ts`). Card and tag links stay
  functional offline because each click loads the shell again for the new route.
- On sign-out the private snapshot is purged from the cache so favorites and
  playlists don't leak to the next user on a shared device.

Note: open the app (and ideally the `/offline` page) once while connected so the
assets and data are cached — that first online visit is what enables offline
use.

## Project structure

```
prisma/schema.prisma       Database schema (User, Lyrics)
prisma/seed.ts             Seed script (admin bootstrap + sample lyrics)
prisma/seed-anaasheed.ts   Idempotent seeder for the أناشيد collection
prisma/data/               أناشيد source text, parsed JSON, and the parser
src/lib/                   Prisma client, JWT/session helpers, password hashing
src/middleware.ts          Route protection for /admin and lyrics create/edit
src/app/                   Pages (App Router) and API routes
src/components/            Client-side UI components (forms, nav, tables)
```

## Note on this repository's initial commit

This codebase was generated in a sandboxed environment without access to the
npm registry, so `npm install` / `npm run build` could not be executed or
verified before committing. Please run through steps 1–5 above once to
confirm everything installs and builds cleanly, and open an issue/PR for
anything that needs fixing.
