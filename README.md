# Novantis CRM

A clinic management system built for **Novantis Sağlık & Güzellik**, a medical aesthetics clinic. It replaces paper patient files, manual stock ledgers, and printed consent forms with a single web app that works from desktop, tablet, and phone — installable as a PWA so it feels like a native app without an app-store release.

Built with Next.js 16 (App Router), Prisma 7, PostgreSQL (via Supabase), and a two-way Google Calendar sync.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Google Calendar Integration Setup](#google-calendar-integration-setup)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Security Notes](#security-notes)

## Features

### Patient Management
- Full patient records: contact info, date of birth, gender, allergies/sensitivities, free-form notes.
- Add a patient directly (no consent flow required) — for migrating existing patients who already have a paper-signed consent on file.
- Attach scanned/photographed copies of old paper consent forms (image or PDF) directly to a patient's profile.
- Searchable patient list with treatment history at a glance.
- One-click, single-page PDF summary of a patient's full treatment history for printing or record-keeping.

### Digital Consent ("Onam") Signing
- Staff starts a session for a treatment type (filler, Botox, mesotherapy, each with its own consent form template) and gets a QR code.
- The patient scans the code on a tablet, answers the medical questionnaire, and signs with a touch signature — no witness or doctor signature required, per clinic policy.
- The signature and answers are stamped onto the real PDF template (via `pdf-lib`) and stored privately.

### Treatments & Inventory
- Every treatment can record one or more products used, with quantity, and automatically deducts stock (independent of the consent flow above — recording a treatment never requires a new signature).
- Product catalog with category, unit (ml / unit / piece), package size, and a low-stock threshold that flags critical items in red.
- Full inventory ledger (`InventoryMovement`) for stock in/out/returns, with automatic stock return when a treatment is deleted.
- Searchable product table with quick "+ / −" stock actions.

### Appointments & Calendar
- Day-timeline scheduling view (08:00–20:00, 30-minute slots) with a compact month-view date picker.
- Drag-and-drop rescheduling directly on the timeline.
- Color-coded appointment status: first visit, follow-up/control, attended, and no-show each get a distinct color, using **Google Calendar's own color IDs** so the two systems agree by construction.
- One-click WhatsApp reminder messages to patients.

### Two-Way Google Calendar Sync
- Appointments created in the CRM automatically appear on a connected Google Calendar (title, time, and color).
- Dragging an appointment's time in Google Calendar updates the CRM record to match.
- Recoloring an event in Google Calendar to *Tomato* or *Flamingo* flips the CRM appointment's status to "no-show" or "attended" respectively.
- A Google-side event with no CRM counterpart is not dropped — it creates an unassigned CRM appointment so nothing is lost.
- Implemented via OAuth2 + `events.watch` push notifications + `syncToken` delta sync, with a daily Vercel Cron job (plus an opportunistic check on every page load) to keep the watch channel alive.

### Daily Notes & Dashboard
- A home dashboard with today's/tomorrow's schedule, key stats, and a running log of daily clinic notes.

### Installable PWA
- Custom app icon and manifest so the CRM can be added to a phone or tablet home screen like a native app.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| Language | JavaScript (React 19) |
| Database | PostgreSQL, hosted on [Supabase](https://supabase.com) |
| ORM | [Prisma 7](https://www.prisma.io) with the `@prisma/adapter-pg` driver adapter (no Rust query engine) |
| File storage | Supabase Storage (private bucket, served via short-lived signed URLs) |
| Auth | Custom HMAC-signed session cookie — no third-party auth provider, single admin account |
| Calendar integration | Google Calendar API (`googleapis`), OAuth2, push notifications |
| PDF generation | [pdf-lib](https://pdf-lib.js.org) (consent forms, patient summaries), [pdfjs-dist](https://mozilla.github.io/pdf.js/) (in-browser template preview) |
| Deployment target | [Vercel](https://vercel.com) (Vercel Cron for calendar watch renewal) |

## Architecture

- **`proxy.js`** — Next 16's middleware successor. Gates every `/admin/*` page and `/api/*` route behind the admin session cookie, except an explicit allowlist (login, the patient-facing signing link, Google's OAuth callback, and the two webhook/cron endpoints, which authenticate themselves independently).
- **`lib/auth.js`** — HMAC token generation/verification for the single admin session (no database-backed sessions).
- **`lib/prisma.js`** — Shared Prisma client using the Postgres driver adapter against the pooled Supabase connection string.
- **`lib/storage.js` / `lib/supabase-admin.js`** — Server-only wrapper around Supabase Storage. Uploads go to a **private** bucket; nothing is ever served from a public URL. Reads go through `app/api/files/[...path]`, an admin-gated proxy that mints a fresh short-lived signed URL per request.
- **`lib/google-calendar.js`** — OAuth client/token refresh, event create/update/delete, watch-channel registration and renewal, and the inbound delta-sync logic. Outbound sync failures never block a CRM write (Google Calendar is treated as a secondary system); inbound sync writes directly to the database and never calls back out to Google, which is what keeps the two-way sync loop-free by construction.
- **`lib/appointment-colors.js`** — The single source of truth mapping appointment type/status to Google Calendar's numeric `colorId` values, shared by the CRM UI and the sync logic.

## Data Model

Defined in [`prisma/schema.prisma`](prisma/schema.prisma):

- `Patient` — core patient record, with `PatientDocument[]` for attached scans/photos.
- `Treatment` — a performed procedure, linked to `TreatmentProductUsage[]` (stock deducted) and `SignSession[]` (consent PDFs).
- `Product` / `InventoryMovement` — stock catalog and ledger.
- `Appointment` — schedule entries, with `googleEventId` and `colorId` for calendar sync.
- `GoogleCalendarConnection` — a single-row table holding the clinic's one persistent OAuth connection and webhook watch-channel state (there is one practitioner, so this isn't a per-user table).
- `SignSession` — one consent-signing session per treatment (QR link, answers, signed PDF reference).
- `DailyNote` — free-form daily clinic notes shown on the dashboard.

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (Postgres database + Storage)
- (Optional, for calendar sync) A [Google Cloud](https://console.cloud.google.com) project with the Calendar API enabled

### Installation

```bash
git clone <this-repo>
cd mediconsent
npm install
```

### Environment Variables

Create a `.env` file in the project root:

| Variable | Description |
|---|---|
| `ADMIN_USER` | Admin login username |
| `ADMIN_PASS` | Admin login password |
| `DATABASE_URL` | Pooled Postgres connection string (used by the app at runtime — Supabase's connection pooler, port 6543, with `?pgbouncer=true`) |
| `DIRECT_URL` | Direct (non-pooled) Postgres connection string (used by the Prisma CLI for migrations — port 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — **server-only**, bypasses RLS, used for Storage uploads |
| `SESSION_SECRET` | Random secret used to HMAC-sign the admin session cookie |
| `CRON_SECRET` | Random secret used to authenticate the Google Calendar watch-renewal cron endpoint |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID (only needed for calendar sync) |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret (only needed for calendar sync) |

Generate random secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database Setup

```bash
npx prisma migrate deploy
npx prisma generate
```

In your Supabase project, create a **private** Storage bucket named `patient-media` (used for uploaded photos, scanned consent documents, and signed consent PDFs).

### Running Locally

```bash
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000) (bound to `0.0.0.0` so it's reachable from other devices on the same network, e.g. a phone or tablet for testing).

## Google Calendar Integration Setup

1. In [Google Cloud Console](https://console.cloud.google.com), create a project and enable the **Google Calendar API**.
2. Create an **OAuth 2.0 Client ID** (type: Web application).
3. Add authorized redirect URIs for every environment you'll use, e.g.:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://<your-production-domain>/api/auth/google/callback`
4. Add the resulting Client ID/Secret to `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
5. Log into the CRM as admin, go to **Ajanda** (Appointments), and click **"Google Takvim'i Bağla"** to complete the OAuth consent flow.

Note: Google's push notifications require a public HTTPS address — the webhook subscription cannot be tested from `localhost`. Outbound sync (CRM → Google) and the OAuth connection itself work locally; the inbound webhook only works once deployed.

## Deployment

The app is designed for [Vercel](https://vercel.com):

1. Import the repository into Vercel and set all the environment variables above in the project settings.
2. `vercel.json` already defines a daily cron job (`/api/cron/renew-google-watch`) that keeps the Google Calendar webhook subscription alive — no extra setup needed beyond deploying.
3. Vercel provides a free `*.vercel.app` HTTPS subdomain immediately, which is enough to fully test the app, including the Google Calendar webhook. A custom domain can be attached later at any time without any code changes.
4. Run `npx prisma migrate deploy` against the production database (via Vercel's build step or manually) before or during the first deploy.

## Project Structure

```
app/
  admin/                 Admin UI (dashboard, patients, appointments, inventory)
  api/
    auth/                Admin login/logout + Google OAuth connect/callback/status
    appointments/        Appointment CRUD + outbound Google Calendar sync
    cron/                Google Calendar watch-channel renewal (Vercel Cron)
    files/[...path]/     Admin-gated proxy that mints signed Supabase Storage URLs
    inventory/           Product & stock movement endpoints
    patients/            Patient CRUD, documents, PDF summary
    sessions/            Consent-signing session lifecycle
    sign-pdf/            Stamps a patient's answers/signature onto the consent PDF
    treatments/          Treatment CRUD with stock deduction
    webhooks/
      google-calendar/   Inbound Google Calendar push-notification handler
  login/                 Admin login page
  sign/[sessionId]/      Patient-facing consent signing page (public, QR-linked)
components/              Shared UI (Drawer, PhoneInput)
lib/                     Server-side logic (auth, prisma, storage, google-calendar, theme, ...)
prisma/                  Schema and migrations
public/                  Static assets, consent form templates, PWA icons/manifest
proxy.js                 Global route-protection middleware
vercel.json              Cron configuration
```

## Security Notes

- Single hardcoded admin account with an HMAC-signed, timing-safe-compared session token (see `lib/auth.js`) — there is no database-backed session store or password hashing library involved by design, since there is exactly one operator account.
- All uploaded files (patient photos, scanned consent documents, signed consent PDFs) live in a **private** Supabase Storage bucket. They are never served from a public URL; every read goes through an admin-gated route that generates a signed URL valid for a few minutes.
- The Google Calendar webhook and cron-renewal endpoints are public routes (Google and Vercel Cron can't send the admin cookie) but authenticate themselves independently — the webhook checks a shared per-channel token against the stored connection, and the cron route requires a bearer token matching `CRON_SECRET`.
- The `/coord-picker` and `/api/debug-grid` routes are internal developer tools for calibrating PDF form coordinates. They are disabled entirely in production and require an admin session otherwise.
