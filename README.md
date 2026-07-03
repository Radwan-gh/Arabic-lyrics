# كلمات — Arabic Lyrics Manager

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
| Viewer | Browse and read lyrics (default role for new sign-ups) |
| Editor | Everything a Viewer can, plus create lyrics and edit/delete their own |
| Admin  | Everything, plus edit/delete any lyrics and manage users (roles, active/inactive, delete) |

The **first account ever registered automatically becomes Admin** — no manual
database editing needed to bootstrap the first admin. Every account after
that starts as a Viewer; promote people from **إدارة المستخدمين** (Admin →
Users).

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

This creates (or updates) the admin account from `ADMIN_EMAIL`/`ADMIN_PASSWORD`
and one sample lyrics entry. You can skip this and just register through the
UI instead — the first registered user becomes Admin automatically.

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

Run `npx prisma migrate deploy` against your production database before
starting the app for the first time (and after every schema change).

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
   - Optional, only needed if you plan to run the seed script:
     `ADMIN_EMAIL`, `ADMIN_PASSWORD`
4. **Deploy.** Railway builds with Nixpacks (`npm install` → `postinstall`
   runs `prisma generate` → `npm run build`) and starts the service with
   `npm run start`, which runs `prisma migrate deploy` against the Postgres
   plugin before booting Next.js — so the schema is applied automatically on
   every deploy, first one included.
5. **Bootstrap an admin.** Either just register through the deployed app (the
   first account becomes Admin automatically), or run the seed script once
   against the deployed database using the [Railway CLI](https://docs.railway.com/guides/cli):
   ```bash
   railway link      # select this project
   railway run npm run db:seed
   ```
6. **Domain.** Settings → Networking → Generate Domain for a free
   `*.up.railway.app` URL, or attach a custom domain from the same screen.

Note: this app was built and pushed from a sandboxed environment with no
network access to Railway, so the steps above have not been run end-to-end —
please flag anything that doesn't match Railway's current UI/CLI.

## Project structure

```
prisma/schema.prisma       Database schema (User, Lyrics)
prisma/seed.ts             Seed script (admin bootstrap + sample lyrics)
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
