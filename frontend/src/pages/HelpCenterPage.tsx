import { useState, useMemo, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import * as Icons from "lucide-react"

interface HelpArticle {
  id: string
  title: string
  content: string
  lastUpdated: string
}

interface HelpCategory {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  articles: HelpArticle[]
}

interface ChangelogEntry {
  date: string
  title: string
  description: string
}

const categories: HelpCategory[] = [
  {
    id: "getting-started",
    icon: Icons.Rocket,
    label: "Getting Started",
    description: "Set up your account and start publishing",
    articles: [
      { id: "create-account", title: "Creating Your Account", lastUpdated: "May 12, 2026", content: "Sign up at app.socialpulses.io using your email or Google account. After verification, complete the onboarding wizard to set up your organization, connect your first social channel, and schedule your first post." },
      { id: "connect-channels", title: "Connecting Social Channels", lastUpdated: "May 10, 2026", content: "Go to **Accounts** in the sidebar to connect your social media profiles. Supported platforms: Instagram, Facebook, Twitter/X, LinkedIn, TikTok, YouTube, and more. Each platform uses OAuth \u2014 you will be prompted to log in and grant permissions." },
      { id: "onboarding-wizard", title: "Onboarding Wizard", lastUpdated: "May 8, 2026", content: "The first time you log in, the onboarding wizard walks you through the essentials: setting your display name, connecting your first channel, and creating your first post." },
    ],
  },
  {
    id: "compose",
    icon: Icons.Send,
    label: "Compose & Schedule",
    description: "Create, schedule, and manage posts",
    articles: [
      { id: "create-post", title: "Creating a Post", lastUpdated: "May 12, 2026", content: "Open **Compose** from the sidebar. Write your message, attach media, and select which channels to publish to. Use the AI Assistant to generate or improve content. Save as draft, schedule, or publish immediately." },
      { id: "bulk-upload", title: "Bulk Upload", lastUpdated: "May 10, 2026", content: "Use **Bulk Upload** to schedule multiple posts at once. Upload a CSV file with your post content, dates, and channels. The system validates and lets you review before scheduling." },
      { id: "calendar", title: "Calendar View", lastUpdated: "May 9, 2026", content: "The **Calendar** gives a bird\u2019s-eye view of scheduled content. Drag and drop to reschedule, click to edit, filter by channel. Color-coded by status: draft (yellow), scheduled (blue), published (green)." },
      { id: "media-library", title: "Media Library", lastUpdated: "May 8, 2026", content: "Upload images, videos, and GIFs in **Media**. Organized by date, searchable by filename. Supports JPEG, PNG, GIF, MP4, WebM. Max 50MB." },
      { id: "templates", title: "Post Templates", lastUpdated: "May 7, 2026", content: "Save post formats as **Templates** for consistent branding. Define placeholders for dynamic content. Apply templates when composing." },
    ],
  },
  {
    id: "analytics",
    icon: Icons.BarChart3,
    label: "Analytics & Reports",
    description: "Track performance across all channels",
    articles: [
      { id: "analytics-overview", title: "Analytics Dashboard", lastUpdated: "May 12, 2026", content: "The **Analytics** page shows key metrics: total posts, engagement rate, follower growth, and top-performing content. Filter by date range and channel." },
      { id: "reports", title: "Reports (Premium)", lastUpdated: "May 11, 2026", content: "Generate PDF/CSV reports covering posting activity, engagement trends, and audience growth. Available on paid plans." },
      { id: "premium-analytics", title: "Premium Analytics", lastUpdated: "May 11, 2026", content: "Advanced analytics with sentiment analysis, best posting times, content-type comparison, and benchmarking. Unlock with Growth or Scale plan." },
      { id: "alerts", title: "Alerts & Notifications", lastUpdated: "May 9, 2026", content: "Set custom alerts for unusual engagement spikes, post failures, or approaching scheduled content." },
    ],
  },
  {
    id: "ai-features",
    icon: Icons.Sparkles,
    label: "AI Features",
    description: "AI-powered content creation and optimization",
    articles: [
      { id: "ai-assistant", title: "AI Assistant", lastUpdated: "May 12, 2026", content: "The **AI Assistant** helps write, rewrite, and improve posts. Generate from topic, adjust tone, shorten/expand, or translate." },
      { id: "ai-repurpose", title: "AI Repurpose", lastUpdated: "May 11, 2026", content: "Transform one piece of content into multiple formats. Turn a blog into threads, transcript into posts, or long-form into short variations." },
      { id: "content-ideas", title: "Content Ideas", lastUpdated: "May 10, 2026", content: "Get topic suggestions based on your industry, trends, and past performance." },
      { id: "hashtag-suggestions", title: "Hashtag Suggestions", lastUpdated: "May 8, 2026", content: "Get relevant hashtag recommendations based on your post content." },
    ],
  },
  {
    id: "accounts",
    icon: Icons.Users,
    label: "Connect Accounts",
    description: "Manage social profiles and permissions",
    articles: [
      { id: "add-account", title: "Adding a Social Account", lastUpdated: "May 12, 2026", content: "Go to **Accounts** and click Add Channel. Select platform and authenticate via OAuth." },
      { id: "reconnect", title: "Reconnecting Expired Accounts", lastUpdated: "May 10, 2026", content: "If a channel shows Disconnected, the OAuth token expired. Reconnect from Accounts page." },
      { id: "remove-account", title: "Removing an Account", lastUpdated: "May 9, 2026", content: "To disconnect, go to **Accounts**, find the channel, and click Remove. Cannot be undone." },
    ],
  },
  {
    id: "settings",
    icon: Icons.Settings,
    label: "Settings & Profile",
    description: "Manage your account, team, and preferences",
    articles: [
      { id: "profile-billing", title: "Profile & Billing", lastUpdated: "May 12, 2026", content: "Update display name, avatar, email, and billing address. Email changes require re-verification." },
      { id: "team-members", title: "Team Management", lastUpdated: "May 10, 2026", content: "Invite team members from Settings. Roles: Admin, Editor, Viewer." },
      { id: "notifications", title: "Notification Preferences", lastUpdated: "May 9, 2026", content: "Configure notifications for post events, engagement alerts, team activity. In-app and email." },
      { id: "api-keys", title: "API & Integrations", lastUpdated: "May 8, 2026", content: "Generate API keys from Settings. REST API for posts, analytics, accounts. Webhooks for events." },
    ],
  },
  {
    id: "billing",
    icon: Icons.CreditCard,
    label: "Billing & Plans",
    description: "Plans, payments, and subscription management",
    articles: [
      { id: "plans", title: "Available Plans", lastUpdated: "May 12, 2026", content: "Free (1 channel), Starter $19/mo (3 channels), Growth $49/mo (10, AI), Scale $99/mo (25, team), Enterprise $199/mo (unlimited). 14-day trial." },
      { id: "upgrade", title: "Upgrading Your Plan", lastUpdated: "May 12, 2026", content: "Go to **Billing** to upgrade. Stripe-powered, immediate with prorated charge." },
      { id: "cancel", title: "Cancelling Subscription", lastUpdated: "May 11, 2026", content: "Cancel from **Billing**. Access till end of period, then reverts to Free." },
      { id: "invoices", title: "Invoices & Receipts", lastUpdated: "May 10, 2026", content: "View/download past invoices from **Billing**. Set billing address in Profile." },
    ],
  },
  {
    id: "troubleshooting",
    icon: Icons.HelpCircle,
    label: "Troubleshooting & FAQ",
    description: "Common issues and quick answers",
    articles: [
      { id: "post-failed", title: "Post Failed to Publish", lastUpdated: "May 12, 2026", content: "Check: (1) Account connected. (2) Content meets limits. (3) Time passed. See History for details." },
      { id: "login-issues", title: "Login Issues", lastUpdated: "May 12, 2026", content: "Reset password or use Google login. Contact support if stuck." },
      { id: "email-not-received", title: "Not Receiving Emails", lastUpdated: "May 10, 2026", content: "Check spam. Add notifications@socialpulses.io to contacts." },
      { id: "data-export", title: "How to Export My Data", lastUpdated: "May 9, 2026", content: "Request from Settings > Data. ZIP with posts, analytics, accounts." },
    ],
  },
]

const changelog: ChangelogEntry[] = [
  { date: "May 12, 2026", title: "Help Center Launched", description: "In-app Help Center with 30+ articles, search, keyboard shortcuts, and AI-powered content repurpose." },
  { date: "May 11, 2026", title: "AI Repurpose & Webhooks", description: "Transform content across formats. Webhooks for real-time post event notifications." },
  { date: "May 10, 2026", title: "Advanced Analytics", description: "Sentiment analysis, best posting times, content-type comparison." },
  { date: "May 8, 2026", title: "Team Collaboration", description: "Invite team members with roles. Approvals workflow for content review." },
  { date: "May 5, 2026", title: "Bulk Upload & Templates", description: "Schedule 50+ posts at once with CSV. Save templates with placeholders." },
  { date: "April 28, 2026", title: "Social Listening", description: "Monitor mentions, track competitors, discover trending topics." },
]

const shortcuts = [
  { key: "G then D", label: "Go to Dashboard" },
  { key: "G then C", label: "Go to Compose" },
  { key: "G then H", label: "Go to Calendar" },
  { key: "G then A", label: "Go to Analytics" },
  { key: "G then S", label: "Go to Settings" },
  { key: "G then /", label: "Go to Help Center" },
  { key: "?", label: "Toggle Keyboard Shortcuts" },
  { key: "/", label: "Focus Search" },
  { key: "N", label: "New Post" },
  { key: "Esc", label: "Close modal / Cancel" },
]

const suggestedQuestions = [
  "How do I connect Instagram?",
  "How to schedule a post?",
  "What plans are available?",
  "How to cancel my subscription?",
  "Why did my post fail?",
  "How to invite team members?",
]

export function HelpCenterPage() {
  const [search, setSearch] = useState("")
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null)
  const [showWhatNew, setShowWhatNew] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
      setShowShortcuts((prev) => !prev)
    }
    if (e.key === "Escape") {
      setShowShortcuts(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase()
    return categories
      .map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.articles.length > 0 || cat.label.toLowerCase().includes(q))
  }, [search])

  function toggleCategory(id: string) {
    setExpandedCategory((prev) => (prev === id ? null : id))
    setExpandedArticle(null)
  }

  function toggleArticle(id: string) {
    setExpandedArticle((prev) => (prev === id ? null : id))
  }

  function handleFeedback(helpful: boolean) {
    if (helpful) {
      toast.success("Glad this helped! We are always improving.")
    } else {
      toast.error("Sorry about that. We will review this article.", {
        action: { label: "Contact Support", onClick: () => window.open("mailto:support@socialpulses.io") },
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            {showWhatNew ? "What\u2019s New" : "Help Center"}
          </h1>
          <p className="text-secondary text-sm">
            {showWhatNew ? "Latest updates and improvements" : "Everything you need to know about SocialPulses"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-primary hover:bg-surface-2 transition-colors"
            title="Keyboard shortcuts">
            <Icons.Keyboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>
          <button type="button" onClick={() => { setShowWhatNew((v) => !v); setExpandedCategory(null); setExpandedArticle(null) }}
            className={"flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors " + (showWhatNew ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-primary hover:bg-surface-2")}>
            <Icons.Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">What\u2019s New</span>
          </button>
        </div>
      </div>

      {!showWhatNew && (
        <div className="space-y-3">
          <div className="relative">
            <Icons.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input type="text" placeholder="Search articles..." value={search}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onChange={(e) => { setSearch(e.target.value); setExpandedCategory(null); setExpandedArticle(null) }}
              className="w-full rounded-xl border border-border bg-surface-2 pl-10 pr-10 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all" />
            <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-muted bg-surface-3 rounded px-1.5 py-0.5 border border-border font-mono">/</kbd>
          </div>

          <AnimatePresence>
            {showSuggestions && !search.trim() && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="rounded-xl border border-border bg-surface-1 p-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">Suggested questions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {suggestedQuestions.map((q) => (
                    <button key={q} type="button" onMouseDown={() => { setSearch(q); setShowSuggestions(false) }}
                      className="text-left text-sm text-secondary hover:text-primary hover:bg-surface-2/50 rounded-lg px-2 py-1.5 transition-colors">{q}</button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {showWhatNew ? (
        <div className="space-y-3">
          {changelog.map((entry) => (
            <div key={entry.date + entry.title} className="rounded-xl border border-border bg-surface-1 p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icons.Megaphone className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-primary">{entry.title}</h3>
                    <span className="text-[10px] text-muted bg-surface-3 rounded-full px-2 py-0.5 border border-border">{entry.date}</span>
                  </div>
                  <p className="text-sm text-secondary leading-relaxed">{entry.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {filteredCategories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Icons.FileQuestion className="h-12 w-12 text-muted" />
              <p className="text-lg font-medium text-primary">No results found</p>
              <p className="text-sm text-secondary max-w-sm">Try a different search term or browse the categories below</p>
              <button type="button" onClick={() => setSearch("")} className="text-sm text-accent hover:underline">Clear search</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon
              const isOpen = expandedCategory === cat.id
              const articleCount = cat.articles.length

              return (
                <div key={cat.id} className="rounded-xl border border-border bg-surface-1 overflow-hidden">
                  <button type="button" onClick={() => toggleCategory(cat.id)}
                    className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-surface-2/50 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary">{cat.label}</p>
                      <p className="text-xs text-muted mt-0.5">{cat.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted font-medium">{articleCount} article{articleCount !== 1 ? "s" : ""}</span>
                      <motion.span animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
                        <Icons.ChevronDown className="h-4 w-4 text-muted" />
                      </motion.span>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div key="articles" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden border-t border-border">
                        <div className="divide-y divide-border">
                          {cat.articles.map((article) => {
                            const articleOpen = expandedArticle === article.id
                            const sections = article.content.split("\n\n")

                            return (
                              <div key={article.id}>
                                <button type="button" onClick={() => toggleArticle(article.id)}
                                  className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-surface-2/30 transition-colors">
                                  <Icons.FileText className="h-3.5 w-3.5 text-muted shrink-0" />
                                  <span className="flex-1 text-sm text-secondary">{article.title}</span>
                                  <span className="text-[10px] text-muted shrink-0">{article.lastUpdated}</span>
                                  <Icons.ChevronRight className={"h-3.5 w-3.5 text-muted transition-transform duration-200 shrink-0 " + (articleOpen ? "rotate-90" : "")} />
                                </button>

                                <AnimatePresence initial={false}>
                                  {articleOpen && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
                                      {sections.length > 1 && (
                                        <div className="px-4 pt-2 pb-1">
                                          <div className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">In this article</div>
                                          <div className="space-y-0.5">
                                            {sections.map((s, i) => {
                                              const label = s.replace(/\*\*/g, "").replace(/\n/g, " ").substring(0, 50)
                                              if (!label.trim()) return null
                                              return (
                                                <div key={i} className="text-xs text-secondary hover:text-accent cursor-pointer flex items-center gap-1.5"
                                                  onClick={() => { const el = document.getElementById("section-" + article.id + "-" + i); el?.scrollIntoView({ behavior: "smooth" }) }}>
                                                  <Icons.ChevronRight className="h-2.5 w-2.5 text-muted" />
                                                  {label}{label.length >= 50 ? "..." : ""}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      <div className="px-4 pb-3">
                                        <div className="text-sm text-secondary leading-relaxed bg-surface-2/50 rounded-lg p-3 border border-border/50 space-y-2">
                                          {sections.map((s, i) => (
                                            <p key={i} id={"section-" + article.id + "-" + i} className={i > 0 ? "mt-2" : ""}>{s}</p>
                                          ))}
                                        </div>

                                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted">
                                          <Icons.Clock className="h-3 w-3" />
                                          Last updated {article.lastUpdated}
                                        </div>

                                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                                          <span className="text-xs text-muted">Did this answer your question?</span>
                                          <button type="button" onClick={() => handleFeedback(true)}
                                            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-secondary hover:text-green hover:bg-green/10 border border-border hover:border-green/30 transition-colors">
                                            <Icons.ThumbsUp className="h-3 w-3" /> Yes
                                          </button>
                                          <button type="button" onClick={() => handleFeedback(false)}
                                            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-secondary hover:text-red hover:bg-red/10 border border-border hover:border-red/30 transition-colors">
                                            <Icons.ThumbsDown className="h-3 w-3" /> No
                                          </button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="rounded-xl border border-border bg-surface-1 p-5">
        <h3 className="text-sm font-semibold text-primary mb-3">Still need help?</h3>
        <div className="flex flex-wrap gap-4">
          <a href="mailto:support@socialpulses.io" className="flex items-center gap-2 text-sm text-accent hover:underline">
            <Icons.Mail className="h-4 w-4" /> support@socialpulses.io
          </a>
          <button type="button" onClick={() => setShowWhatNew(true)}
            className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors">
            <Icons.Megaphone className="h-4 w-4" /> What\u2019s New
          </button>
          <button type="button" onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors">
            <Icons.Keyboard className="h-4 w-4" /> Keyboard Shortcuts
          </button>
          <span className="flex items-center gap-2 text-sm text-secondary">
            <Icons.Clock className="h-4 w-4" /> Response within 24 hours
          </span>
        </div>
      </div>

      <AnimatePresence>
        {showShortcuts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowShortcuts(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }} onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl border border-border bg-surface-1 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Icons.Keyboard className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-semibold text-primary">Keyboard Shortcuts</h2>
                </div>
                <button type="button" onClick={() => setShowShortcuts(false)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-surface-2 transition-colors">
                  <Icons.X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-3 max-h-80 overflow-y-auto">
                <div className="space-y-1">
                  {shortcuts.map((s) => (
                    <div key={s.key} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-secondary">{s.label}</span>
                      <kbd className="text-[11px] font-mono text-muted bg-surface-3 rounded px-2 py-0.5 border border-border">{s.key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-border bg-surface-2/50">
                <p className="text-[11px] text-muted flex items-center gap-1">
                  <Icons.Info className="h-3 w-3" />
                  Press <kbd className="text-[11px] font-mono bg-surface-3 rounded px-1 border border-border">?</kbd> anywhere to toggle
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default HelpCenterPage
