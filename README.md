# SocialPulses

A comprehensive social media management platform for scheduling, publishing, and analyzing content across 15+ platforms.

## Features

- **Multi-Platform Scheduling** — Schedule posts to YouTube, Instagram, Facebook, X/Twitter, LinkedIn, Pinterest, TikTok, Telegram, Threads, Bluesky, Mastodon, Google Business, and more
- **Calendar View** — Visual monthly calendar of all scheduled content
- **AI Content Generation** — Generate platform-optimized posts, variations, and content ideas
- **Analytics & Reports** — Track performance with detailed analytics, heatmaps, and exportable reports
- **Unified Inbox** — Manage conversations across all platforms in one place
- **Auto-Reply** — AI-powered or keyword-based automated responses
- **Campaign Planner** — Multi-phase campaign management with status tracking
- **Social Listening** — Monitor topics with sentiment analysis
- **Influencer Marketing** — Discover, manage, and collaborate with influencers
- **Link in Bio** — Custom link landing pages
- **Approval Workflows** — Team collaboration with threaded comments and version history
- **Media Library** — Upload, organize, and reuse media assets
- **Kanban Board** — Drag-and-drop content ideation

## Tech Stack

### Backend
- **Framework:** Python FastAPI (single-file app)
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Cache:** Redis
- **Auth:** JWT + OAuth 2.0 (15+ social platforms)
- **AI:** DeepSeek / OpenAI API

### Frontend
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Animation:** Framer Motion
- **UI:** Radix UI primitives

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 20+
- PostgreSQL
- Redis (optional, for caching)

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
# Then run:
python3 -m uvicorn main:app --reload --port 8007
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies API requests to the backend.

## Project Structure

```
socialpulses/
├── backend/               # FastAPI backend
│   ├── main.py           # Main application (~7K lines)
│   ├── models.py         # SQLAlchemy ORM models
│   ├── schemas.py        # Pydantic request/response schemas
│   ├── database.py       # Database connection setup
│   ├── publisher.py      # Post publishing engine
│   ├── auto_reply_worker.py  # AI auto-reply worker
│   ├── trending_worker.py    # Trending topics scanner
│   ├── rss_worker.py     # RSS feed importer
│   ├── mcp_server.py     # MCP protocol server for AI agents
│   ├── oauth/            # OAuth providers (13+ platforms)
│   ├── platform_clients/ # Platform API clients
│   ├── scripts/          # Utility scripts
│   └── tests/            # pytest test suite
├── frontend/             # React SPA
│   └── src/
│       ├── pages/        # 40+ page components
│       ├── components/   # Shared UI components
│       ├── auth/         # Auth context providers
│       └── layouts/      # App layout
├── infra/                # Infrastructure configs (example)
├── docs/                 # Documentation
└── .env.example          # Environment template
```

## API Reference

Full API documentation is available in `docs/public-documentation.md`.

Key endpoints:

| Area | Endpoints |
|------|-----------|
| Auth | `/api/auth/login`, `/api/auth/signup`, `/api/auth/google/*` |
| Posts | `/api/posts` (CRUD, bulk, CSV, publish, approve) |
| Analytics | `/api/analytics/*`, `/api/reports/*` |
| AI | `/api/ai/generate`, `/api/ai/variations`, `/api/ai/repurpose` |
| Media | `/api/media/upload`, `/api/media` |
| Inbox | `/api/inbox/conversations` |
| Billing | `/api/stripe/*`, `/api/subscription` |

## License

Private — All rights reserved.
