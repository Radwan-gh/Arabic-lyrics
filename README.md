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
