# SocialPulses — Complete Infrastructure & Frontend Documentation

> **Documentation date:** 2026-05-21
> **Server:** Hetzner VPS (62.238.12.115)
> **Frontend repo:** `/Users/suren/socialpulses-react/`
> **Backend root:** `/var/www/socialpulses/`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Caddy Reverse Proxy Configuration](#2-caddy-reverse-proxy-configuration)
3. [Systemd Services](#3-systemd-services)
4. [Backend Structure](#4-backend-structure)
5. [Database](#5-database)
6. [MCP Server (AI Agent Integration)](#6-mcp-server)
7. [Free Tools API](#7-free-tools-api)
8. [React Frontend — Overview](#8-react-frontend)
9. [Frontend — Page Components (40+)](#9-frontend-page-components)
10. [Frontend — Shared Components (20+)](#10-frontend-shared-components)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [Subscription System](#12-subscription-system)
13. [State Management](#13-state-management)
14. [Build & Deployment Process](#14-build--deployment-process)
15. [Testing](#15-testing)
16. [Directory Layouts](#16-directory-layouts)

---

## 1. Architecture Overview

SocialPulses is a **social media management platform** deployed on a single Hetzner VPS with a Python/FastAPI backend, a React SPA frontend (Vite-built, served by Caddy), PostgreSQL database, Redis cache, and an MCP (Model Context Protocol) server for AI agent integration.

### High-Level Architecture

```
Internet
    │
    ├── socialpulses.io (marketing site)
    │     └── Caddy → /var/www/marketing (static HTML files)
    │
    ├── app.socialpulses.io (main application)
    │     └── Caddy proxy rules:
    │           ├── /mcp*          → localhost:8099   (MCP Server, SSE)
    │           ├── /api/tools/*   → localhost:8010   (Free Tools API)
    │           ├── /api/*         → localhost:8007   (FastAPI Backend)
    │           ├── /assets/*      → /var/www/socialpulses/frontend (static, immutable cache)
    │           ├── /help/*        → /var/www/marketing/help
    │           ├── /media/*       → /var/www/socialpulses (uploaded files)
    │           ├── /privacy*      → SPA (index.html)
    │           ├── /terms*        → SPA (index.html)
    │           └── /*             → SPA catch-all (index.html)
    │
    ├── api.socialpulses.io (API subdomain)
    │     └── Caddy → localhost:8007
    │
    ├── store.socialpulses.io (store)
    │     └── Caddy → localhost:8013
    │
    └── www.socialpulses.io → redirect to socialpulses.io
```

### Server Components

| Component | Technology | Port | Purpose |
|-----------|-----------|------|---------|
| **Caddy** | Caddy 2 | 80/443 (implied) | Reverse proxy, SSL termination, SPA serving |
| **FastAPI Backend** | Python/FastAPI + Uvicorn | 8007 | Core REST API |
| **Free Tools API** | Python/FastAPI | 8010 | Rate-limited free tools |
| **MCP Server** | Python/MCP SDK | 8099 | AI agent integration |
| **Store** | Unknown (Next.js?) | 8013 | store.socialpulses.io |
| **PostgreSQL** | PostgreSQL | 5432 | Database (`socialpulses`) |
| **Redis** | Redis | 6379 | Caching/queueing |

### Users

- **`socialpulses`** — dedicated system user owns most files
- **`root`** — owns systemd services, Caddy config, .env files

---

## 2. Caddy Reverse Proxy Configuration

**File:** `/etc/caddy/Caddyfile`

The Caddyfile defines three primary sites and one redirect:

### `app.socialpulses.io` — Main Application

The most complex site with multiple route handlers:

1. **`/mcp*`** — Direct proxy to MCP Server on port 8099
2. **Security filters** — Blocks access to `.git`, `.env`, `.venv`, and dangerous file extensions (`.bak`, `.pyc`, `.md`, `.sql`, `.log`)
3. **`/assets/*`** — Static file serving from `/var/www/socialpulses/frontend` with **1-year immutable cache** (`Cache-Control: public, max-age=31536000, immutable`)
4. **`/help/*`** — Static file serving from `/var/www/marketing/help`
5. **`/privacy*` and `/terms*`** — SPA routes (serve index.html)
6. **`/api/tools/*`** — Proxied to Free Tools API on port 8010
7. **`/api/*`** — Proxied to FastAPI backend on port 8007
8. **`/media/*`** — Static file serving for uploaded media
9. **Catch-all** — SPA handler: tries path, then falls back to `/index.html`

**Security Headers applied:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- `Content-Security-Policy` (per-site, allows CDN resources)
- Upload limit: **50MB** on `/api/media/upload`

### `api.socialpulses.io` — API Subdomain

Direct proxy to port 8007 with same security filters and headers (slightly relaxed CSP).

### `socialpulses.io` — Marketing Site

Serves static HTML from `/var/www/marketing` with `.html` extension fallback. Has CORS headers for `/api/contact`. Also proxies `/api/tools/*` to port 8010.

### `www.socialpulses.io`

Simple 301 redirect to `https://socialpulses.io`.

### `store.socialpulses.io`

Reverse proxy to port 8013 with basic security headers.

---

## 3. Systemd Services

### 3.1 `socialpulses-api.service` — Main Backend (root-owned)

```ini
Description=SocialPulses FastAPI Backend
ExecStart=.../venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
           --bind 127.0.0.1:8007 --timeout 120
           --error-logfile /var/www/socialpulses/backend/gunicorn_err.log
WorkingDirectory=/var/www/socialpulses/backend
EnvironmentFile=/var/www/socialpulses/.env
Restart=always, RestartSec=5
```

- **4 workers** (UvicornWorker), 120s timeout
- Logs to gunicorn_err.log and systemd journal
- Runs as **root**

### 3.2 `socialpulses.service` — Backend (user-owned)

```ini
Description=SocialPulses FastAPI App
User=socialpulses, Group=socialpulses
ExecStart=.../venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8007 --timeout 120
EnvironmentFile=/var/www/socialpulses/backend/.env
```

- Same as api.service but runs as **socialpulses** user
- Logs to `/var/www/socialpulses/logs/stdout.log` and `stderr.log`

### 3.3 `socialpulses-backend.service` — Dockerized Postiz Backend

```ini
Description=SocialPulses Backend Service
After=docker.service, Requires=docker.service
ExecStart=/opt/socialpulses/apps/backend/start_simplified_backend.sh
Environment=DATABASE_URL=postgresql://postiz-user:***@postiz-postgres:5432/postiz-db
Environment=REDIS_HOST=postiz-redis, TEMPORAL_HOST=temporal
```

- Docker-based service (Postiz fork?) with PostgreSQL + Redis + Temporal
- Runs as **root**

### 3.4 `socialpulses-frontend.service` — Next.js Frontend (legacy)

```ini
Description=SocialPulses Frontend Service
ExecStart=/usr/bin/npx next start -p 4200 --hostname 0.0.0.0
WorkingDirectory=/opt/socialpulses/apps/frontend
```

- Next.js server on port **4200** (not used by current React SPA)
- This appears to be a **legacy** service — the current frontend is the Vite React SPA served by Caddy directly

### 3.5 `socialpulses-mcp.service` — MCP Server

```ini
Description=SocialPulses MCP Server
User=socialpulses, Group=socialpulses
EnvironmentFile=/var/www/socialpulses/mcp.env
ExecStart=.../mcp-venv/bin/python3 .../backend/mcp_server.py --sse
Environment=MCP_PORT=8099, MCP_HOST=127.0.0.1
```

- SSE mode on port **8099**
- Runs as **socialpulses** user

### 3.6 `socialpulses-publisher.service` — Background Publisher

```ini
Description=SocialPulses Publisher - background post scheduler
ExecStart=.../venv/bin/python3 .../backend/run_publisher.py
StandardOutput=append:/var/www/socialpulses/logs/publisher.log
```

- Background process for scheduled post publishing
- Logs to `/var/www/socialpulses/logs/publisher.log`

### 3.7 `socialpulses-tools.service` — Free Tools API

```ini
Description=SocialPulses Free Tools API
User=socialpulses
EnvironmentFile=/var/www/socialpulses/tools.env
ExecStart=.../venv/bin/python3 .../backend/tools_api.py
```

- Runs on port **8010** (configured in tools.env)
- Rate-limited: 20/day per IP, 6/min

### 3.8 `socialpulses-backup.service` — Daily Backup (Oneshot)

```ini
Description=SocialPulses Daily Database Backup
Type=oneshot
ExecStart=/etc/cron.daily/socialpulses-backup
```

### 3.9 `socialpulses-backup.timer` — Timer for Backup

```ini
OnCalendar=daily
Persistent=true
```

Triggers backup service daily at 2am.

---

## 4. Backend Structure

**Root:** `/var/www/socialpulses/`

```
/var/www/socialpulses/
├── .env                  (environment variables — REDACTED values below)
├── mcp.env               (MCP API key)
├── tools.env             (Tools API config)
├── mcp_server.py         (standalone MCP server)
├── mcp-venv/             (MCP Python virtualenv)
├── venv/                 (main backend Python virtualenv)
├── data/
│   └── socialpulses.db   (SQLite database — 675KB)
├── frontend/             (Vite-built React SPA)
│   ├── index.html
│   ├── manifest.json
│   ├── favicon.*
│   ├── logo.svg
│   └── assets/           (bundled JS/CSS)
├── backend/
│   ├── main.py           (~7100 lines — core FastAPI application)
│   ├── models.py         (~900 lines — SQLAlchemy models)
│   ├── schemas.py        (~1500 lines — Pydantic schemas)
│   ├── database.py       (DB engine + session)
│   ├── utils.py          (token creation, encryption helpers)
│   ├── cache.py          (Redis caching layer)
│   ├── rate_limit_utils.py
│   ├── normalization.py
│   ├── media_pipeline.py
│   ├── webhook_utils.py
│   ├── publisher.py
│   ├── run_publisher.py
│   ├── tools_api.py      (Free tools endpoints)
│   ├── mcp_server.py     (MCP server code)
│   ├── auto_reply_worker.py
│   ├── rss_worker.py
│   ├── trending_worker.py
│   ├── cron_rss_worker.sh
│   ├── requirements.txt
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py       (login, signup, OAuth, profile)
│   │   ├── posts.py      (CRUD for posts)
│   │   ├── dashboard.py  (dashboard aggregation)
│   │   ├── billing.py    (Stripe subscriptions)
│   │   ├── media.py      (file uploads)
│   │   └── ai_routes.py  (AI content generation)
│   ├── platform_clients/
│   │   ├── __init__.py
│   │   ├── factory.py    (platform client factory)
│   │   ├── twitter.py, twitter_v1.py
│   │   ├── instagram.py
│   │   ├── linkedin.py
│   │   ├── facebook.py (in oauth/)
│   │   ├── tiktok.py
│   │   ├── youtube.py
│   │   ├── pinterest.py
│   │   ├── bluesky.py
│   │   ├── mastodon.py
│   │   ├── threads.py
│   │   ├── telegram.py
│   │   └── google_business.py
│   ├── oauth/
│   │   ├── base.py, registry.py
│   │   ├── twitter.py, instagram.py, linkedin.py, etc.
│   │   └── credential_loader.py
│   ├── scripts/
│   ├── tests/
│   ├── static/
│   ├── media/
│   └── data/
├── logs/
│   ├── publisher.log      (55KB)
│   ├── stderr.log         (4MB)
│   ├── stdout.log
│   ├── access.log, error.log, token_refresh.log
├── media/                 (user-uploaded media files)
└── uploads/               (upload staging area)
```

### .env Variable Names (values REDACTED)

```
APP_SECRET=87dc10...f343
STRIPE_SECRET_KEY=***
STRIPE_PUBLISHABLE_KEY=pk_live_51T3p5m...
STRIPE_WEBHOOK_SECRET=whsec_...MZUX
RESEND_API_KEY=re_AEW...Ag4h
GOOGLE_CLIENT_ID=619466255742-...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX...RX-u
GOOGLE_REDIRECT_URI=https://api.socialpulses.io/api/auth/google/callback
DATABASE_URL=postgresql://socialpulses:***@localhost:5432/socialpulses
REDIS_URL=redis://localhost:6379
INITIAL_ADMIN_PASSWORD=***
TRIAL_DAYS=14
PINTEREST_APP_ID=1571610
PINTEREST_APP_SECRET=4e96f7...ad98
PINTEREST_REDIRECT_URI=https://app.socialpulses.io/api/auth/pinterest/callback
PINTEREST_CLIENT_ID=1571610
PINTEREST_CLIENT_SECRET=4e96f7...ad98
```

### tools.env

```
TOOLS_API_KEY=***
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
TOOLS_PORT=8010
DAILY_LIMIT_PER_IP=20
RATE_LIMIT_PER_MIN=6
```

### mcp.env

```
SOCIALPULSES_API_KEY=sp_qQQ...DuRQ
```

---

## 5. Database

### Primary Database: PostgreSQL

- **Database name:** `socialpulses`
- **Port:** 5432 (localhost)
- **Connection:** `postgresql://socialpulses:***@localhost:5432/socialpulses`
- **User:** `socialpulses`

### SQLite (fallback/auxiliary)

- **File:** `/var/www/socialpulses/data/socialpulses.db` (675KB)
- **File:** `/var/www/socialpulses/backend/data/socialpulses.db`

### Secondary Database (Docker-based Postiz)

- **Database:** `postiz-db`
- **User:** `postiz-user`
- **Host:** `postiz-postgres` (Docker container)
- **Port:** 5432 (Docker network)

### Key Backend Models (from `models.py`, ~900 lines)

- **Client** — organization/tenant
- **User** — user accounts, linked to Client
- **SocialPlatform** — platform definitions (X, Instagram, LinkedIn, etc.)
- **SocialAccount** — connected social accounts per user
- **Post** — posts with content, scheduling data
- **PostAccount** — many-to-many between Post and SocialAccount
- **PostStatus** — status tracking (draft, scheduled, published, failed, etc.)
- **ApiKey** — API keys for MCP/tools access
- **Subscription** — Stripe subscription info
- **SubscriptionTier** — plan definitions

---

## 6. MCP Server

**File:** `/var/www/socialpulses/mcp_server.py` (~500 lines, also in `/var/www/socialpulses/backend/mcp_server.py`)

The MCP (Model Context Protocol) server lets AI agents interact with SocialPulses. It runs with the `--sse` flag on port 8099.

### Exposed Tools (for AI agents)

| Tool | Description | Input |
|------|------------|-------|
| `list_posts` | List scheduled/published posts | api_key, limit (20), status |
| `create_post` | Create & schedule a post | api_key, content, scheduled_at |
| `list_accounts` | List connected social accounts | api_key |
| `get_analytics` | Get analytics summary | api_key |

### Authentication

API key validation via SHA-256 hash matching against the `ApiKey` database model.

### Lifecycle

- Runs as `socialpulses` user
- Uses its own virtualenv (`/var/www/socialpulses/mcp-venv/`)
- Auto-restarts on failure (RestartSec=5)
- API key stored in `/var/www/socialpulses/mcp.env`: `SOCIALPULSES_API_KEY=sp_qQQ...DuRQ`

---

## 7. Free Tools API

**File:** `/var/www/socialpulses/backend/tools_api.py`

A separate FastAPI application providing rate-limited free tools:

- Port: **8010**
- Rate limits: **20 requests/day per IP**, **6 requests/minute**
- AI model: **Llama 3.3 70B** via Groq API
- Accessible at `/api/tools/*` on both `app.socialpulses.io` and `socialpulses.io`
- Authenticated via `TOOLS_API_KEY`

---

## 8. React Frontend — Overview

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.2.6 |
| Build Tool | Vite | 8.0.13 |
| Language | TypeScript | 6.0.3 |
| Routing | react-router-dom | 7.15.1 |
| Styling | Tailwind CSS | 4.3.0 |
| Animation | Framer Motion | 12.38.0 |
| HTTP | @tanstack/react-query | 5.100.10 |
| Forms | react-hook-form + zod | 5.2.2 / 4.4.3 |
| Icons | lucide-react | 1.16.0 |
| Charts | recharts | 3.8.1 |
| Toasts | sonner | 2.0.7 |
| State | zustand | 5.0.13 |
| CSS utils | clsx + tailwind-merge | 2.1.1 / 3.6.0 |
| UI primitives | @radix-ui/react-* | various |
| Testing | Vitest, Playwright, @testing-library/react | latest |
| Accessibility | axe-core/playwright | 4.11.3 |

### Build Configuration

**`vite.config.ts`:**
- Plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`
- Path alias: `@/` → `./src/`
- Code-split CSS enabled
- **Manual chunk splitting**:
  - `vendor` — react/react-dom
  - `animations` — framer-motion
  - `charts` — recharts
  - `state` — zustand, @tanstack/react-query
  - `ui` — sonner, lucide-react, clsx
  - `date` — date-fns
- Dev server on port **5176**
- Dev proxy: `/api` → `https://app.socialpulses.io`

**TypeScript Config** (`tsconfig.app.json`):
- Target: ES2023
- Module: ESNext (bundler resolution)
- JSX: react-jsx
- Strict linting: noUnusedLocals, noUnusedParameters
- Path mapping: `@/*` → `./src/*`

### Theme System

**File:** `src/theme.tsx`

- Three preferences: `dark`, `light`, `system`
- Persisted in localStorage under `sp-theme`
- Applies `data-theme` attribute on `<html>` element
- Listens for system `prefers-color-scheme` changes
- Provides `useTheme()` hook with `theme`, `preference`, `toggleTheme`, `setTheme`

### CSS / Tailwind Theme

**File:** `src/index.css` — Custom Tailwind v4 theme:

```css
@theme {
  --color-surface-0: #08090a;    /* Darkest background */
  --color-surface-1: #0e0f10;    /* Elevated surfaces */
  --color-surface-2: #141516;
  --color-surface-3: #1a1b1d;
  --color-surface-4: #202224;
  --color-primary: #ededef;      /* Main text */
  --color-secondary: #a1a1aa;    /* Secondary text */
  --color-muted: #6b6b74;        /* Muted text */
  --color-accent: #5e6ad2;       /* Primary accent (blue-purple) */
  --color-accent-soft: rgba(94, 106, 210, 0.12);
  /* Status colors: blue, green, red, amber, purple */
  --color-border: rgba(255,255,255,0.06);
  --color-border-hover: rgba(255,255,255,0.1);
}
```

Light mode overrides surfaces to white/gray, text to dark, borders to black.

### App Entry Point

**`main.tsx`:**
```tsx
<StrictMode>
  <ThemeProvider>
    <App />
  </ThemeProvider>
</StrictMode>
```

### App Root Component

**`App.tsx`** — Sets up:
1. `QueryClientProvider` (30s stale time, 1 retry)
2. `BrowserRouter`
3. `AuthProvider`
4. `SubscriptionProvider`
5. `ErrorBoundary`
6. `Suspense` (with spinner fallback)
7. `Routes` — 40+ routes, all lazily loaded via `React.lazy()`
8. `Toaster` (sonner toast notifications)

**Route architecture:**
- Public: `/login`, `/signup`, `/verify-email`, `/privacy`, `/terms`
- Protected (inside `AppLayout`): Dashboard, Calendar, Compose, Media, History, Kanban, Analytics, Inbox, Accounts, Settings, Profile, Admin, Billing, Reports, PremiumAnalytics, Alerts, Notifications, BulkUpload, SavedReplies, Templates, RSS Feeds, Hashtags, Link-in-Bio, UTM, Auto-Reply, Approvals, Listening, Influencers, Campaigns, Repurpose, Help Center, Affiliate, Growth

**Feature-gated routes** (redirect to `/billing` if locked):
- `/listening` → `social_listening`
- `/influencers` → `social_listening`
- `/campaigns` → `campaigns`
- `/auto-reply` → `auto_reply`
- `/link-in-bio` → `link_in_bio`
- `/idea-board` → `idea_board`
- `/reports` → `advanced_analytics`
- `/premium-analytics` → `advanced_analytics`

---

## 9. Frontend — Page Components (40+)

All pages are lazily loaded via `React.lazy()` with named exports (except GrowthPage which is eagerly imported).

### 🔐 Authentication Pages

| # | Page | File | Purpose |
|---|------|------|---------|
| 1 | **LoginPage** | `pages/LoginPage.tsx` (274 lines) | Email/password login + Google OAuth (redirect & popup). Theme toggle, animated error display. |
| 2 | **SignupPage** | `pages/SignupPage.tsx` (360 lines) | Registration with zod validation, password strength meter, referral code support, Google OAuth. |
| 3 | **VerifyEmailPage** | `pages/VerifyEmailPage.tsx` | Email verification after signup. |

### 📊 Dashboard & Analytics

| # | Page | File | Purpose |
|---|------|------|---------|
| 4 | **DashboardPage** | `pages/DashboardPage.tsx` (382 lines) | Main dashboard with stat cards (scheduled, published, failed, drafts), upcoming posts list, post streak widget, quick-action buttons. Staggered animation. |
| 5 | **AnalyticsPage** | `pages/AnalyticsPage.tsx` (389 lines) | Post performance analytics with Recharts (LineChart, BarChart), monthly data, engagement rate, follower growth. |
| 6 | **PremiumAnalyticsPage** | `pages/PremiumAnalyticsPage.tsx` | Advanced analytics (feature: `advanced_analytics`). |
| 7 | **ReportsPage** | `pages/ReportsPage.tsx` | Custom report generation (feature: `advanced_analytics`). |

### 📝 Content & Publishing

| # | Page | File | Purpose |
|---|------|------|---------|
| 8 | **ComposePage** | `pages/ComposePage.tsx` (712 lines) | Post composer with platform selection, content editor, media upload, scheduling, AI assistant panel, template selector. |
| 9 | **CalendarPage** | `pages/CalendarPage.tsx` (304 lines) | Monthly calendar view of scheduled posts with navigation. |
| 10 | **HistoryPage** | `pages/HistoryPage.tsx` | Post history with filtering and status tracking. |
| 11 | **MediaPage** | `pages/MediaPage.tsx` (317 lines) | Media library with upload, preview dialog, delete functionality. |
| 12 | **BulkUploadPage** | `pages/BulkUploadPage.tsx` | CSV/bulk post upload. |
| 13 | **TemplatesPage** | `pages/TemplatesPage.tsx` | Reusable post templates. |
| 14 | **SavedRepliesPage** | `pages/SavedRepliesPage.tsx` | Pre-saved reply templates for engagement. |

### 📋 Content Organization

| # | Page | File | Purpose |
|---|------|------|---------|
| 15 | **KanbanPage** | `pages/KanbanPage.tsx` (685 lines) | Kanban/idea board with drag-and-drop columns, card CRUD, dialog for editing. Also serves `/idea-board` route. |
| 16 | **HashtagsPage** | `pages/HashtagsPage.tsx` | Hashtag research and management. |
| 17 | **RssFeedsPage** | `pages/RssFeedsPage.tsx` | RSS feed import for content curation. |
| 18 | **RepurposePage** | `pages/RepurposePage.tsx` | Content repurposing across platforms. |
| 19 | **LinkBioPage** | `pages/LinkBioPage.tsx` (328 lines) | Link-in-bio page builder (feature: `link_in_bio`). |
| 20 | **UTMPage** | `pages/UTMPage.tsx` | UTM link builder. |

### 💬 Engagement & Communication

| # | Page | File | Purpose |
|---|------|------|---------|
| 21 | **InboxPage** | `pages/InboxPage.tsx` (612 lines) | Social inbox with conversation list, message detail, reply sending. |
| 22 | **NotificationsPage** | `pages/NotificationsPage.tsx` | Platform notifications feed. |
| 23 | **AutoReplyPage** | `pages/AutoReplyPage.tsx` | Auto-reply rules (feature: `auto_reply`). |
| 24 | **ApprovalsPage** | `pages/ApprovalsPage.tsx` | Post approval workflow for teams. |

### 🔍 Discovery

| # | Page | File | Purpose |
|---|------|------|---------|
| 25 | **ListeningPage** | `pages/ListeningPage.tsx` | Social listening/monitoring (feature: `social_listening`). |
| 26 | **InfluencersPage** | `pages/InfluencersPage.tsx` | Influencer discovery (feature: `social_listening`). |
| 27 | **CampaignsPage** | `pages/CampaignsPage.tsx` | Campaign management (feature: `campaigns`). |

### ⚙️ Settings & Management

| # | Page | File | Purpose |
|---|------|------|---------|
| 28 | **SettingsPage** | `pages/SettingsPage.tsx` (817 lines) | User settings: profile, security (API keys, password), appearance (theme), billing/plan, social accounts. Uses Tabs component. |
| 29 | **ProfilePage** | `pages/ProfilePage.tsx` | User profile display/edit. |
| 30 | **AccountsPage** | `pages/AccountsPage.tsx` (350 lines) | Connected social accounts management, add/remove with platform icons. |
| 31 | **AdminPage** | `pages/AdminPage.tsx` | Admin panel (role-gated). |
| 32 | **BillingPage** | `pages/BillingPage.tsx` (1112 lines) | Subscription plans display (Starter/Professional/Business), Stripe checkout, current plan status, upgrade/downgrade. |
| 33 | **AlertsPage** | `pages/AlertsPage.tsx` | Custom alert configuration. |

### ℹ️ Legal & Public

| # | Page | File | Purpose |
|---|------|------|---------|
| 34 | **PrivacyPage** | `pages/PrivacyPage.tsx` | Privacy policy. Served via SPA at `/privacy*`. |
| 35 | **TermsPage** | `pages/TermsPage.tsx` | Terms of service. Served via SPA at `/terms*`. |

### 🚀 Growth & Monetization

| # | Page | File | Purpose |
|---|------|------|---------|
| 36 | **GrowthPage** | `pages/GrowthPage.tsx` (427 lines) | Growth engine / viral content suggestions, trend analysis. Eagerly imported (not lazy). |
| 37 | **AffiliatePage** | `pages/AffiliatePage.tsx` | Affiliate program dashboard. |

### 🆘 Support

| # | Page | File | Purpose |
|---|------|------|---------|
| 38 | **HelpCenterPage** | `pages/HelpCenterPage.tsx` | Help center / documentation. |

---

## 10. Frontend — Shared Components (20+)

### Reusable Application Components

| # | Component | File | Purpose |
|---|-----------|------|---------|
| 1 | **AppLayout** | `layouts/AppLayout.tsx` (949 lines) | Main application shell: collapsible sidebar, mobile drawer & header, email verification banner, `<Outlet>` for nested routes. |
| 2 | **PlatformIcon** | `components/PlatformIcon.tsx` (218 lines) | SVG icons for 15+ social platforms (Twitter/X, Instagram, LinkedIn, Facebook, TikTok, YouTube, Pinterest, Bluesky, Mastodon, Threads, Telegram, Google Business, etc.) with brand colors. |
| 3 | **ErrorBoundary** | `components/ErrorBoundary.tsx` (41 lines) | React class-based error boundary with fallback UI. |
| 4 | **EmailVerificationBanner** | `components/EmailVerificationBanner.tsx` (97 lines) | Dismissible banner prompting email verification with resend functionality. Auto-dismisses after 4s. |
| 5 | **EmptyState** | `components/EmptyState.tsx` (30 lines) | Reusable empty state with icon, title, description, and action button. |
| 6 | **OnboardingWizard** | `components/OnboardingWizard.tsx` (320 lines) | Multi-step onboarding: role selection, tool selection, channel focus. Uses `useOnboardingStore`. |
| 7 | **ConnectChannelDialog** | `components/ConnectChannelDialog.tsx` | Dialog for connecting social media accounts via OAuth. |
| 8 | **AIAssistantPanel** | `components/AIAssistantPanel.tsx` (473 lines) | AI-powered content ideation, best-time-to-post analysis, content rewriting. Uses Groq API via backend. |
| 9 | **TemplateSelector** | `components/TemplateSelector.tsx` | Post template selection component. |
| 10 | **ContentIdeas** | `components/ContentIdeas.tsx` | AI-generated content ideas display. |
| 11 | **SentimentWidget** | `components/SentimentWidget.tsx` | Sentiment analysis visualization. |
| 12 | **StreakWidget** | `components/StreakWidget.tsx` | Posting streak tracking on dashboard. |

### UI Primitives (Radix-based)

| # | Component | File | Purpose |
|---|-----------|------|---------|
| 13 | **Button** | `components/ui/button.tsx` | Styled button with variants using CVA. |
| 14 | **Card** | `components/ui/card.tsx` | Card container with header, content, footer. |
| 15 | **Input** | `components/ui/input.tsx` | Styled text input. |
| 16 | **Textarea** | `components/ui/textarea.tsx` | Styled textarea. |
| 17 | **Label** | `components/ui/label.tsx` | Form label. |
| 18 | **Badge** | `components/ui/badge.tsx` | Status badge with variants. |
| 19 | **Dialog** | `components/ui/dialog.tsx` | Modal dialog (Radix). |
| 20 | **DropdownMenu** | `components/ui/dropdown-menu.tsx` | Dropdown menu (Radix). |
| 21 | **Select** | `components/ui/select.tsx` | Styled select dropdown (Radix). |
| 22 | **Tabs** | `components/ui/tabs.tsx` | Tab navigation (Radix). |
| 23 | **Separator** | `components/ui/separator.tsx` | Visual divider (Radix). |
| 24 | **ScrollArea** | `components/ui/scroll-area.tsx` | Custom scroll area (Radix). |
| 25 | **Skeleton** | `components/ui/skeleton.tsx` | Loading skeleton placeholder. |
| 26 | **Avatar** | `components/ui/avatar.tsx` | User avatar component (Radix). |
| 27 | **Sonner** | `components/ui/sonner.tsx` | Toast notification wrapper. |

---

## 11. Authentication & Authorization

### AuthProvider (`src/auth/AuthProvider.tsx`)

- Stores token in `localStorage` under `sp-token`
- Stores user data in `localStorage` under `sp-user`
- On mount: checks URL for OAuth callback params (token, username, role, client_id, client_name, onboarding_completed)
- Existing auth check: calls `GET /api/auth/check` with stored token
- **Login flow:** `POST /api/auth/login` → returns token + user data
- **Google OAuth:** Redirects to `https://api.socialpulses.io/api/auth/google/login`, callback returns token via URL params
- **Logout:** Clears localStorage and state

### Backend Auth (`routes/auth.py`)

- Password hashing with **bcrypt**
- JWT token creation/verification using **python-jose**
- Token encryption via **cryptography.fernet** for OAuth tokens
- Rate limiting on login: **5 attempts/minute**
- Google OAuth with config check endpoint

### Route Protection

```
App.tsx: ProtectedRoute → checks auth + subscription → FeatureGuard
  ├── Not authenticated → redirect to /login
  ├── No subscription access → redirect to /billing
  └── Missing feature → redirect to /billing
```

---

## 12. Subscription System

### SubscriptionProvider (`src/auth/SubscriptionProvider.tsx`)

- **API endpoints:**
  - `GET /api/subscription/check` — returns `{ has_access, reason, subscription }`
  - `GET /api/subscription/features` — returns `{ tier, features }`
- Polls every **5 minutes** for subscription changes
- Handles HTTP **402** (Payment Required) globally
- Admins automatically get all features unlocked
- **Default (Free) tier:** 3 accounts, 1 user, no premium features

### Tier Features

| Feature | Type | Description |
|---------|------|-------------|
| `ai_content_generator` | `{enabled, credits}` | AI content credits |
| `social_listening` | boolean | Social listening module |
| `campaigns` | boolean | Campaign management |
| `team_collaboration` | boolean | Team features |
| `auto_reply` | boolean | Auto-reply rules |
| `link_in_bio` | boolean | Link-in-bio builder |
| `idea_board` | boolean | Kanban/idea board |
| `advanced_analytics` | boolean | Premium analytics |
| `api_access` | boolean | API key generation |
| `recurring_content` | boolean | Recurring posts |
| `custom_workflows` | boolean | Custom workflows |
| `max_accounts` | number | Social account limit |
| `max_users` | number | Team member limit |

### Stripe Integration

- Plans: **Starter**, **Professional**, **Business** (prices configured via Stripe)
- Payment links for each plan
- Country-based pricing support
- Trial period: **14 days** (configurable via `TRIAL_DAYS`)

---

## 13. State Management

### Zustand Store

**`store/onboardingStore.ts`** — Persisted onboarding state:

```
- onboardingCompleted (boolean)
- currentStep (number)
- role (string | null)
- tools (string[])
- channelsFocus (string[])
```

Persistence via `zustand/middleware/persist` under `sp-onboarding` key.

### React Query

Global `QueryClient` configured with:
- `staleTime: 30000` (30 seconds)
- `retry: 1`

Used for all API data fetching across pages (dashboard stats, posts, accounts, analytics, inbox conversations, etc.)

---

## 14. Build & Deployment Process

### Local Development

```bash
npm run dev        # Vite dev server on port 5176, proxies /api → app.socialpulses.io
npm run build      # Production build → dist/
```

### Build (`npm run build`)

```bash
npm run supply-chain-safety && vite build
```

1. **Supply chain safety check** — `node scripts/supply-chain-safety.mjs` (runs on postinstall too)
2. **Vite build** — Outputs to `dist/` with:
   - Rollup bundling with manual chunk splitting
   - CSS code splitting
   - Hashing for cache invalidation
   - Modulepreload hints in index.html

### Deployment

The built `dist/` contents are copied to `/var/www/socialpulses/frontend/` on the Hetzner VPS. Caddy serves them directly (no Node server needed in production for the React SPA).

The frontend is deployed as **static files only** — the Vite SPA does not require a Node.js runtime in production. Caddy handles serving, compression (zstd + gzip), and SPA fallback routing.

### Preview

```bash
npm run preview    # Vite preview server (for testing production build locally)
```

---

## 15. Testing

### Test Types

| Command | Framework | Purpose |
|---------|-----------|---------|
| `npm test` | Vitest | Unit tests |
| `npm run test:ui` | Vitest UI | Interactive test runner |
| `npm run test:component` | Vitest | Component unit tests |
| `npm run test:visual` | Playwright | Visual regression screenshots |
| `npm run test:load` | k6 | Load testing (login flow) |
| `npm run test:review` | Playwright | Visual review |
| `npm run lint` | ESLint | Code linting |

### Test Configurations

- **Vitest** — uses jsdom for DOM simulation
- **Playwright** — version 1.60.0, with axe-core for accessibility
- **k6** — load testing with login-flow scenario
- **Visual regression** — pixelmatch + pngjs for image comparison
- **Supply chain safety** — custom script checks for dependency integrity

### Backend Tests

- Located at `/var/www/socialpulses/backend/tests/`
- Uses pytest (`.pytest_cache` present)
- Test database likely uses SQLite

---

## 16. Directory Layouts

### Frontend Source Tree

```
/Users/suren/socialpulses-react/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component with routes
│   ├── App.css                     # Legacy styles
│   ├── index.css                   # Tailwind v4 theme + base styles
│   ├── theme.tsx                   # Dark/light/system theme context
│   ├── auth/
│   │   ├── AuthProvider.tsx        # Auth context + login/logout/OAuth
│   │   └── SubscriptionProvider.tsx # Subscription + feature flags
│   ├── layouts/
│   │   └── AppLayout.tsx           # Main layout: sidebar + content
│   ├── lib/
│   │   └── utils.ts                # cn(), formatDate(), apiFetch()
│   ├── store/
│   │   └── onboardingStore.ts      # Zustand onboarding state
│   ├── types/
│   │   └── framer-motion.d.ts      # Type fix for framer-motion v12
│   ├── pages/                      # 38 page components
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── VerifyEmailPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CalendarPage.tsx
│   │   ├── ComposePage.tsx
│   │   ├── MediaPage.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── KanbanPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── InboxPage.tsx
│   │   ├── AccountsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── AdminPage.tsx
│   │   ├── BillingPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── PremiumAnalyticsPage.tsx
│   │   ├── AlertsPage.tsx
│   │   ├── NotificationsPage.tsx
│   │   ├── BulkUploadPage.tsx
│   │   ├── SavedRepliesPage.tsx
│   │   ├── TemplatesPage.tsx
│   │   ├── RssFeedsPage.tsx
│   │   ├── HashtagsPage.tsx
│   │   ├── LinkBioPage.tsx
│   │   ├── UTMPage.tsx
│   │   ├── AutoReplyPage.tsx
│   │   ├── ApprovalsPage.tsx
│   │   ├── ListeningPage.tsx
│   │   ├── InfluencersPage.tsx
│   │   ├── CampaignsPage.tsx
│   │   ├── RepurposePage.tsx
│   │   ├── HelpCenterPage.tsx
│   │   ├── AffiliatePage.tsx
│   │   ├── GrowthPage.tsx
│   │   ├── PrivacyPage.tsx
│   │   └── TermsPage.tsx
│   └── components/
│       ├── ui/                     # 14 Radix-based UI primitives
│       │   ├── avatar.tsx
│       │   ├── badge.tsx
│       │   ├── button.tsx
│       │   ├── card.tsx
│       │   ├── dialog.tsx
│       │   ├── dropdown-menu.tsx
│       │   ├── input.tsx
│       │   ├── label.tsx
│       │   ├── scroll-area.tsx
│       │   ├── select.tsx
│       │   ├── separator.tsx
│       │   ├── skeleton.tsx
│       │   ├── sonner.tsx
│       │   ├── tabs.tsx
│       │   └── textarea.tsx
│       ├── AIAssistantPanel.tsx
│       ├── ConnectChannelDialog.tsx
│       ├── ContentIdeas.tsx
│       ├── EmailVerificationBanner.tsx
│       ├── EmptyState.tsx
│       ├── ErrorBoundary.tsx
│       ├── OnboardingWizard.tsx
│       ├── PlatformIcon.tsx
│       ├── SentimentWidget.tsx
│       ├── StreakWidget.tsx
│       └── TemplateSelector.tsx
├── scripts/
│   └── supply-chain-safety.mjs
├── tests/                          # Test suites
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── package.json
└── playwright.config.ts
```

---

## Appendix: API Endpoints (Summary)

### Auth Routes (`/api/auth`)
- `POST /auth/login` — Login with username/password
- `POST /auth/signup` — Register new user
- `GET /auth/check` — Validate current token
- `POST /auth/complete-onboarding` — Mark onboarding done
- `POST /auth/resend-verification` — Resend verification email
- `GET /auth/google/login` — Google OAuth login
- `GET /auth/google/callback` — Google OAuth callback
- `GET /auth/google/config` — Check if Google OAuth is configured

### Post Routes (`/api/posts`)
- CRUD for social media posts
- Scheduling, publishing

### Dashboard (`/api/dashboard`)
- Aggregated stats and upcoming posts

### Subscription (`/api/subscription`)
- `GET /subscription/check` — Access check
- `GET /subscription/features` — Feature flags
- Subscription management

### Billing (`/api/billing`)
- Stripe config, checkout, webhook handling
- Country-based pricing

### Media (`/api/media`)
- File upload (50MB limit), list, delete

### AI Routes (`/api/ai`)
- Content generation, best-time posting, rewriting

### MCP Endpoints
- `/mcp/sse` — SSE endpoint for MCP connections
- `/mcp/messages` — Message handling

### Tools API (`/api/tools`)
- Rate-limited free tools using Groq AI
