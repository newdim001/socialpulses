# SocialPulses — Public Documentation

> **A social media management platform for scheduling, publishing, and analyzing content across multiple platforms.**
> Published: May 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Supported Platforms](#2-supported-platforms)
3. [Features](#3-features)
4. [Pricing Plans](#4-pricing-plans)
5. [API Reference](#5-api-reference)
6. [Frontend App](#6-frontend-app)
7. [Tech Stack](#7-tech-stack)

---

## 1. Overview

SocialPulses is a comprehensive social media management platform that lets users:

- **Schedule & publish** content to 15+ social media platforms
- **Analyze performance** with detailed analytics and reports
- **Manage conversations** through a unified inbox
- **Collaborate** with teams through approval workflows
- **Generate content** with AI assistance
- **Track trends** and listen to social conversations
- **Run campaigns** with influencer marketing tools

---

## 2. Supported Platforms

| Platform | Post Types | Analytics | Auth Method |
|----------|-----------|-----------|-------------|
| **YouTube** | Video shorts, standard upload | Views, likes, comments | Google OAuth |
| **Instagram** | Feed posts, carousels, stories | Engagement, reach | Instagram Business Login |
| **Facebook** | Feed posts, media | Reactions, shares | Facebook OAuth |
| **X / Twitter** | Tweets, threads, media | Impressions, engagement | OAuth 2.0 + PKCE |
| **LinkedIn** | Posts, articles, media | Impressions, clicks | LinkedIn OAuth |
| **Pinterest** | Pins, boards | Saves, clicks | Pinterest OAuth |
| **TikTok** | Video uploads | Views, likes, shares | TikTok OAuth |
| **Telegram** | Channel messages, media | Message stats | Bot Token |
| **Threads** | Thread posts | Basic stats | Threads OAuth |
| **Bluesky** | AT Protocol posts | Basic stats | Session + App Password |
| **Mastodon** | Federation posts | Engagement | Mastodon OAuth |
| **Google Business** | Profile updates | Insights | Google OAuth |
| **LinkedIn** | Company pages | Page analytics | LinkedIn OAuth |

---

## 3. Features

### Content Management
- **Compose Page** — Rich text editor with media embedding, emoji picker, platform preview
- **Bulk Upload** — CSV import for mass content scheduling (up to 50 posts)
- **Post Templates** — Reusable content templates with platform targeting
- **Recurring Schedules** — Automate recurring posts (daily, weekly, custom)
- **First Comment** — Set first comments on posts before publishing
- **Media Library** — Upload, organize, and reuse media across posts

### Publishing & Scheduling
- **Calendar View** — Visual monthly calendar of all scheduled content
- **Best Time Detection** — AI-powered optimal posting time recommendations
- **Approval Workflows** — Multi-step approval with comments and version history
- **Queue Management** — Auto-schedule posts into optimal time slots
- **Post Versions** — Snapshot history with rollback capability

### Analytics & Reporting
- **Dashboard** — Real-time stats: scheduled, published, failed, drafts
- **Posting Streaks** — Track daily/continuous posting activity
- **Analytics Summary** — Platform breakdown, success rates, monthly trends
- **Calendar Heatmap** — Visual publishing frequency heatmap
- **Sentiment Analysis** — AI-powered content sentiment classification
- **Competitive Analysis** — Cross-account and cross-platform comparisons
- **Premium Reports** — Top posts, engagement rates, platform growth
- **Report Templates** — Custom report builders with widget-based config
- **CSV Export** — Download post data for external analysis

### Inbox & Communication
- **Unified Inbox** — All platform conversations in one place
- **Auto-Reply Rules** — AI-powered or keyword-based auto-responses
- **Bot Builder** — Custom bot rules with trigger/reply patterns
- **Saved Replies** — Reusable response templates
- **Conversation Assignment** — Assign conversations to team members
- **Message Spike Alerts** — Detect and alert on message volume spikes

### AI Features
- **Content Generation** — Generate platform-optimized post content
- **Variations** — Multiple content variations from one idea
- **Content Ideas** — AI-suggested industry-specific content ideas
- **Repurposing** — Transform content across formats (blog→thread→caption)
- **Sentiment Analysis** — Analyze text sentiment
- **Reply Suggestions** — Contextual reply recommendations
- **Trending Topics** — AI-scan published content for trending themes

### Marketing Tools
- **Link in Bio** — Custom link landing pages with analytics
- **UTM Tracking** — Automatic UTM parameter appendage to URLs
- **Hashtag Groups** — Organized hashtag collections with copy-to-clipboard
- **Campaign Planner** — Multi-phase campaign management with status tracking
- **Social Listening** — Topic monitoring with sentiment and source breakdown
- **Influencer Marketing** — Influencer discovery, campaign management, content approval

### Team & Collaboration
- **Approval Comments** — Threaded comments with approve/reject decisions
- **Kanban Board** — Idea management with drag-and-drop columns
- **Workspaces** — Organization-level content separation
- **Team Roles** — Admin, manager, contributor permissions

---

## 4. Pricing Plans

| Feature | Free | Starter | Professional | Business | Enterprise |
|---------|------|---------|-------------|----------|------------|
| **Price** | $0 | $19/mo | $49/mo | $99/mo | $199/mo |
| **Social Accounts** | 5 | 15 | 25 | 50 | 999 |
| **Team Members** | 1 | 1 | 3 | 10 | 999 |
| **Post Scheduling** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Calendar View** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Media Library** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Analytics** | Basic | Basic | Advanced | Advanced | Premium |
| **AI Content Gen** | — | ✅ | ✅ | ✅ | ✅ |
| **Approval Workflows** | — | — | ✅ | ✅ | ✅ |
| **Unified Inbox** | — | — | ✅ | ✅ | ✅ |
| **Team Collaboration** | — | — | ✅ | ✅ | ✅ |
| **Campaigns** | — | — | — | ✅ | ✅ |
| **Social Listening** | — | — | — | ✅ | ✅ |
| **API Access** | — | — | — | ✅ | ✅ |
| **Influencer Marketing** | — | — | — | — | ✅ |
| **Premium Reports** | — | — | — | — | ✅ |

*Country-adjusted pricing available for 13 developing markets.*

---

## 5. API Reference

### Authentication

All API requests require a JWT token in the `Authorization: Bearer <token>` header, except for:

- `POST /api/auth/login` — Login
- `POST /api/auth/signup` — Registration
- `GET /api/health` — Health check
- `POST /api/stripe/webhook` — Stripe callbacks
- `GET /api/stripe/config` — Public Stripe config

### Endpoints

#### Auth & Users

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/signup` | Create new account |
| GET | `/api/auth/check` | Verify authentication |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/change-password` | Change password |
| GET | `/api/auth/google/config` | Google OAuth configuration |
| GET | `/api/auth/google/login` | Google OAuth login redirect |
| GET | `/api/profile` | Get full profile |
| PUT | `/api/profile` | Update profile |

#### Social Accounts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/platforms` | List all supported platforms |
| GET | `/api/accounts` | List connected accounts |
| GET | `/api/accounts/{id}` | Get account details |
| POST | `/api/accounts/{id}/disconnect` | Disconnect account |
| GET | `/api/oauth/{platform}/url` | Get OAuth authorization URL |
| GET | `/api/oauth/{platform}/callback` | OAuth callback handler |

#### Posts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts` | List posts (paginated, filterable) |
| POST | `/api/posts` | Create new post |
| GET | `/api/posts/{id}` | Get post details |
| PUT | `/api/posts/{id}` | Update post |
| DELETE | `/api/posts/{id}` | Delete post |
| POST | `/api/posts/{id}/publish-now` | Publish immediately |
| POST | `/api/posts/{id}/duplicate` | Duplicate post |
| GET | `/api/posts/pending-approval` | Pending approval posts |
| PUT | `/api/posts/{id}/approve` | Approve post |
| PUT | `/api/posts/{id}/reject` | Reject post |
| POST | `/api/posts/bulk` | Bulk create posts (max 50) |
| POST | `/api/posts/bulk/csv` | CSV import |
| GET | `/api/posts/{id}/versions` | Post version history |
| POST | `/api/posts/{id}/versions/{vid}/restore` | Restore version |

#### Media

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/media/upload` | Upload media file (max 50MB) |
| GET | `/api/media` | List media library |
| DELETE | `/api/media/{id}` | Delete media |
| GET | `/api/media/folders` | List media folders |
| POST | `/api/media/folders` | Create folder |

#### Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Dashboard statistics |
| GET | `/api/analytics/summary` | Analytics summary |
| GET | `/api/analytics/calendar-heatmap` | Posting frequency heatmap |
| GET | `/api/analytics/best-time` | Optimal posting times |
| GET | `/api/analytics/sentiment` | Sentiment breakdown |
| GET | `/api/analytics/timeline` | Date-bucketed timeline |
| GET | `/api/analytics/extended` | Combined analytics |
| GET | `/api/reports/summary` | Full report |
| GET | `/api/reports/export` | CSV export |
| GET | `/api/reports/premium` | Premium report |
| GET | `/api/reports/premium/chart-data` | Chart data |

#### AI Features

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/generate` | Generate post content |
| POST | `/api/ai/variations` | Generate content variations |
| POST | `/api/ai/content-ideas` | Generate content ideas |
| POST | `/api/ai/best-time` | Best posting time recommendation |
| POST | `/api/ai/sentiment` | Text sentiment analysis |
| POST | `/api/ai/reply-suggestions` | Reply suggestions |
| POST | `/api/ai/repurpose` | Cross-format content repurposing |

#### Inbox

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inbox/conversations` | List conversations |
| GET | `/api/inbox/conversations/{id}` | Get conversation with messages |
| POST | `/api/inbox/conversations/{id}/reply` | Send reply |
| PUT | `/api/inbox/conversations/{id}/archive` | Archive conversation |
| POST | `/api/inbox/conversations` | Create conversation |

#### Billing & Subscriptions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stripe/config` | Stripe configuration |
| POST | `/api/stripe/create-checkout-session` | Create checkout session |
| POST | `/api/stripe/create-portal-session` | Billing portal |
| GET | `/api/subscription` | Current subscription |
| GET | `/api/subscription/features` | Available features |
| GET | `/api/subscription/invoices` | Invoice history |

#### Campaigns & Marketing

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/campaigns` | Campaign CRUD |
| GET/POST | `/api/listening/topics` | Listening topics |
| GET/POST | `/api/influencers` | Influencer management |
| GET/POST | `/api/link-bio` | Link pages |
| GET/POST | `/api/utm-templates` | UTM templates |
| GET/POST | `/api/hashtag-groups` | Hashtag collections |

#### System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/settings` | Platform settings |
| GET | `/api/kanban/columns` | Kanban board columns |

---

## 6. Frontend App

The SocialPulses web application is built as a single-page application with:

### Pages (40+)

**Authentication:** Login, Signup, Email Verification, Privacy Policy, Terms
**Dashboard & Content:** Dashboard, Calendar, Compose, Media Library, History, Bulk Upload
**Management:** Accounts, Settings, Profile, Notifications, Alerts
**Social:** Inbox, Auto-Reply, Approvals, Saved Replies, Templates
**Analytics:** Analytics, Reports, Premium Reports
**Marketing:** Campaigns, Listening, Influencers, Link-in-Bio, UTM Builder, Hashtags, RSS Feeds
**Planning:** Kanban Board, Repurpose, Growth
**Admin:** Admin Dashboard, Billing, Affiliate Program, Help Center

### Design
- Dark/light/system theme with customization
- Responsive layout with sidebar navigation
- Animated transitions (Framer Motion)
- Component-based UI with Radix primitives

---

## 7. Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Framework | Python FastAPI |
| Database | PostgreSQL |
| Cache | Redis |
| Auth | JWT + OAuth 2.0 |
| Deployment | Ubuntu on dedicated server |
| Web Server | Reverse proxy with TLS |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 19 |
| Language | TypeScript |
| Build Tool | Vite |
| Routing | React Router |
| Styling | Tailwind CSS |
| HTTP Client | TanStack React Query |
| Charts | Recharts |
| Animation | Framer Motion |
| UI Primitives | Radix UI |
| Forms | React Hook Form + Zod |
| State | Zustand |
| Icons | Lucide React |

### AI Integration
- **Content Generation** — DeepSeek / OpenAI for post content, variations, repurposing
- **Sentiment Analysis** — AI-powered text classification
- **Trending Detection** — Automated trend extraction
- **Auto-Reply** — AI-generated contextual responses
- **Listening** — Topic monitoring with sentiment analysis

---

*This document is publicly shared for reference. For support, visit app.socialpulses.io*
