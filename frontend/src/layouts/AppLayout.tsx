import { useState, useEffect, useRef, type ReactNode } from "react"
import { useTheme } from "@/theme"
import { Outlet, NavLink, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn, apiFetch } from "@/lib/utils"
import { useAuth } from "@/auth/AuthProvider"
import { useSubscription } from "@/auth/SubscriptionProvider"
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner"
import * as Icons from "lucide-react"

// Force unique component references to prevent minifier name collision
// Using inline SVG to bypass esbuild variable name mangling
const _TemplateIconForSidebarOnly = ({ className, ...p }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...p}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)
const _RssFeedIconForSidebarOnly = ({ className, ...p }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...p}>
    <path d="M4 11a9 9 0 0 1 9 9" />
    <path d="M4 4a16 16 0 0 1 16 16" />
    <circle cx="5" cy="19" r="1" />
  </svg>
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  featureKey?: string
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

// ---------------------------------------------------------------------------
// Navigation data
// ---------------------------------------------------------------------------
const FEATURE_KEY_MAP: Record<string, string> = {
  listening: "social_listening",
  influencers: "social_listening",
  campaigns: "campaigns",
  "auto-reply": "auto_reply",
  "link-in-bio": "link_in_bio",
  "idea-board": "idea_board",
  reports: "advanced_analytics",
  "premium-analytics": "advanced_analytics",
}

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [{ label: "Dashboard", icon: Icons.LayoutDashboard, path: "/" }],
  },
  {
    label: "Publish",
    items: [
      { label: "Compose", icon: Icons.Send, path: "/compose" },
      { label: "Calendar", icon: Icons.Calendar, path: "/calendar" },
      { label: "Bulk Upload", icon: Icons.Upload, path: "/bulk-upload" },
      { label: "Media", icon: Icons.Image, path: "/media" },
      { label: "History", icon: Icons.History, path: "/history" },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Saved Replies", icon: Icons.MessageSquare, path: "/saved-replies" },
      { label: "Templates", icon: _TemplateIconForSidebarOnly, path: "/templates" },
      { label: "Repurpose", icon: Icons.Shuffle, path: "/repurpose" },
      { label: "RSS Feeds", icon: _RssFeedIconForSidebarOnly, path: "/rss-feeds" },
      { label: "Hashtags", icon: Icons.Hash, path: "/hashtags" },
      { label: "Link in Bio", icon: Icons.Link, path: "/link-in-bio", featureKey: "link_in_bio" },
      { label: "UTM", icon: Icons.Lightbulb, path: "/utm" },
      { label: "Idea Board", icon: Icons.Lightbulb, path: "/idea-board", featureKey: "idea_board" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Analytics", icon: Icons.BarChart3, path: "/analytics" },
      { label: "Reports", icon: _TemplateIconForSidebarOnly, path: "/reports", featureKey: "advanced_analytics" },
      { label: "Premium Analytics", icon: Icons.Sparkles, path: "/premium-analytics", featureKey: "advanced_analytics" },
      { label: "Alerts", icon: Icons.Bell, path: "/alerts" },
    ],
  },
  {
    label: "Engage",
    items: [
      { label: "Inbox", icon: Icons.MessageSquare, path: "/inbox" },
      { label: "Notifications", icon: Icons.Bell, path: "/notifications" },
      { label: "Auto-Reply", icon: Icons.Reply, path: "/auto-reply", featureKey: "auto_reply" },
      { label: "Approvals", icon: Icons.CheckCircle, path: "/approvals" },
    ],
  },
  {
    label: "Discovery",
    items: [
      { label: "Listening", icon: Icons.Radio, path: "/listening", featureKey: "social_listening" },
      { label: "Influencers", icon: Icons.Users, path: "/influencers", featureKey: "social_listening" },
      { label: "Campaigns", icon: Icons.Megaphone, path: "/campaigns", featureKey: "campaigns" },
    ],
  },
  {
    label: null,
    items: [{ label: "Accounts", icon: Icons.Users, path: "/accounts" }],
  },
  {
    label: null,
    items: [{ label: "Help Center", icon: Icons.HelpCircle, path: "/help" }],
  },
  {
    label: null,
    items: [{ label: "Affiliate", icon: Icons.Percent, path: "/affiliate" }, { label: "Growth Engine", icon: Icons.TrendingUp, path: "/growth" }],
  },
]


// ---------------------------------------------------------------------------
// Sidebar sub-components
// ---------------------------------------------------------------------------
function NavItemLink({
  item,
  collapsed,
  onClick,
  locked,
  tooltip,
}: {
  item: NavItem
  collapsed: boolean
  onClick?: () => void
  locked?: boolean
  tooltip?: string
}) {
  const Icon = item.icon

  if (locked) {
    return (
      <div
        title={tooltip}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 opacity-40 cursor-not-allowed select-none",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            <Icons.Lock className="h-3 w-3 shrink-0 text-muted" />
          </>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-accent/15 text-accent"
            : "text-secondary hover:bg-surface-3 hover:text-primary",
          collapsed && "justify-center px-2"
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )
}

function NavGroupSection({
  group,
  collapsed,
  defaultOpen,
  onClickItem,
  hasFeature,
}: {
  group: NavGroup
  collapsed: boolean
  defaultOpen?: boolean
  onClickItem?: () => void
  hasFeature?: (featureKey: string) => boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  const location = useLocation()
  const isActiveGroup = group.items.some((i) => {
    if (i.path === "/") return location.pathname === "/"
    return location.pathname.startsWith(i.path)
  })

  // Auto-open if active item inside and currently closed
  useEffect(() => {
    if (isActiveGroup && !open) setOpen(true)
  }, [isActiveGroup, open])

  // No group label → render items flat
  if (!group.label) {
    return (
      <div className="space-y-0.5">
        {group.items.map((item) => {
          const locked = item.featureKey ? !(hasFeature?.(item.featureKey) ?? true) : false
          return (
            <NavItemLink
              key={item.path}
              item={item}
              collapsed={collapsed}
              onClick={onClickItem}
              locked={locked}
              tooltip={locked ? "Upgrade to access this feature" : undefined}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
          collapsed
            ? "justify-center text-muted"
            : "text-muted hover:text-secondary",
          isActiveGroup && !collapsed && "text-accent"
        )}
      >
        {collapsed ? (
          <span className="block h-px w-4 bg-border" />
        ) : (
          <>
            <span className="flex-1 text-left">{group.label}</span>
            <motion.span
              animate={{ rotate: open ? 0 : -90 }}
              transition={{ duration: 0.2 }}
            >
              <Icons.ChevronDown className="h-3 w-3" />
            </motion.span>
          </>
        )}
      </button>

      {/* Sub-items */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className={cn("space-y-0.5", !collapsed && "ml-3")}>
              {group.items.map((item) => {
                const locked = item.featureKey ? !(hasFeature?.(item.featureKey) ?? true) : false
                return (
                  <NavItemLink
                    key={item.path}
                    item={item}
                    collapsed={collapsed}
                    onClick={onClickItem}
                    locked={locked}
                    tooltip={locked ? "Upgrade to access this feature" : undefined}
                  />
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------
function Sidebar({
  collapsed,
  onToggleCollapse,
  onMobileClose,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
  onMobileClose?: () => void
}) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { tierFeatures } = useSubscription()

  const hasFeature = (key: string) => {
    const value = (tierFeatures as any)[key]
    if (typeof value === "boolean") return value
    if (typeof value === "object" && value !== null) return value.enabled ?? false
    return false
  }

  return (
    <aside
      id="sidebar"
      className={cn(
        "flex flex-col bg-surface-1 border-r border-border z-40",
        // Desktop: fixed left, full height
        "fixed left-0 top-0 h-full",
        // Transitions
        "transition-all duration-300 ease-in-out",
        // Mobile: full width of drawer container
        "w-full md:w-auto"
      )}
      style={{ width: collapsed ? 60 : 260 }}
    >
      {/* Logo area */}
      <div
        className={cn(
          "flex items-center border-b border-border shrink-0 h-14",
          collapsed ? "justify-center px-2" : "px-4 gap-3"
        )}
      >
        <img src="/icon.svg" alt="SocialPulses" className="h-7 w-7 shrink-0 logo-icon" />
        {!collapsed && (
          <span className="text-sm font-semibold text-primary tracking-tight">
            SocialPulses
          </span>
        )}
      </div>

      {/* Scrollable nav area */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-3 scrollbar-thin">
        {navGroups.map((group, idx) => (
          <NavGroupSection
            key={group.label ?? `flat-${idx}`}
            group={group}
            collapsed={collapsed}
            onClickItem={onMobileClose}
            hasFeature={hasFeature}
          />
        ))}
      </nav>

      {/* Connect channels section */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Connect channels</p>
          <a
            href="/accounts"
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-surface-3 transition-colors"
          >
            <Icons.Plus className="h-4 w-4" />
            Add Channel
          </a>
        </div>
      )}

      {/* User/Org popover at bottom */}
      <OrgPopover collapsed={collapsed} user={user} logout={logout} theme={theme} toggleTheme={toggleTheme} />

      {/* Collapse toggle button at very bottom */}
      <div
        className={cn(
          "shrink-0 border-t border-border py-2",
          collapsed ? "px-2" : "px-3"
        )}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "flex items-center justify-center w-full rounded-lg py-2 text-muted hover:text-primary hover:bg-surface-3 transition-colors",
            collapsed ? "px-0" : "gap-2"
          )}
        >
          {collapsed ? (
            <Icons.ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <Icons.ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Mobile header
// ---------------------------------------------------------------------------
function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-surface-1 border-b border-border flex items-center justify-between px-4 z-30">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex items-center justify-center h-9 w-9 rounded-lg text-secondary hover:text-primary hover:bg-surface-3 transition-colors"
      >
        <Icons.Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <img src="/icon.svg" alt="SocialPulses" className="h-6 w-6 shrink-0 logo-icon" />
        <span className="text-sm font-semibold text-primary">SocialPulses</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-center h-9 w-9 rounded-lg text-secondary hover:text-primary hover:bg-surface-3 transition-colors"
        >
          {theme === "dark" ? <Icons.Moon className="h-4 w-4" /> : <Icons.Sun className="h-4 w-4" />}
        </button>
        <UserDropdown />
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Mobile drawer overlay
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// OrgPopover — desktop sidebar user/org popover (Buffer-style)
// ---------------------------------------------------------------------------
function OrgPopover({
  collapsed,
  user,
  logout,
  theme,
  toggleTheme,
}: {
  collapsed: boolean
  user: { username?: string; role?: string; client_name?: string; email_verified?: boolean; avatar_url?: string; display_name?: string } | null
  logout: () => void
  theme: string
  toggleTheme: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "SP"
  const orgName = user?.display_name || user?.client_name || user?.username || "My Organization"
  const email = user?.username ?? ""
  const avatarUrl = user?.avatar_url || null

  // Avatar element (shared between button and popover)
  const AvatarElement = ({ size = "sm" }: { size?: "sm" | "lg" }) => {
    const dims = size === "lg" ? "h-10 w-10" : "h-8 w-8"
    const fontS = size === "lg" ? "text-sm" : "text-xs"
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={orgName}
          className={`${dims} rounded-full object-cover shrink-0`}
          referrerPolicy="no-referrer"
        />
      )
    }
    return (
      <div className={`${dims} rounded-full bg-accent/20 flex items-center justify-center shrink-0`}>
        <span className={`${fontS} font-bold text-accent`}>{initials}</span>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative shrink-0 border-t border-border py-3">
      {/* Avatar button */}
      <div className={cn(collapsed ? "px-2" : "px-3")}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex items-center gap-3 rounded-lg w-full transition-colors",
            collapsed ? "justify-center" : "px-2 py-1 hover:bg-surface-3"
          )}
        >
          <AvatarElement size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-primary truncate leading-tight">
                {orgName}
              </p>
              <p className="text-[11px] text-muted truncate">{email}</p>
            </div>
          )}
        </button>
      </div>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute bottom-full mb-2 bg-surface-1 border border-border rounded-xl shadow-lg z-50 overflow-hidden",
              collapsed ? "left-2 w-56" : "left-3 right-3"
            )}
          >
            {/* Org header */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={orgName} className="h-10 w-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-accent">{initials}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate leading-tight">
                    {orgName}
                  </p>
                  <p className="text-[11px] text-muted truncate">{email}</p>
                  {user?.role && (
                    <span className="inline-block mt-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="py-1">
              <NavLink
                to="/settings"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-secondary hover:bg-surface-3 hover:text-primary"
                  )
                }
              >
                <Icons.Settings className="h-4 w-4" />
                Settings
              </NavLink>

              <NavLink
                to="/profile"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-secondary hover:bg-surface-3 hover:text-primary"
                  )
                }
              >
                <Icons.User className="h-4 w-4" />
                Profile & Billing
              </NavLink>

              <NavLink
                to="/billing"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-secondary hover:bg-surface-3 hover:text-primary"
                  )
                }
              >
                <Icons.CreditCard className="h-4 w-4" />
                Billing
              </NavLink>

              <NavLink
                to="/affiliate"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-secondary hover:bg-surface-3 hover:text-primary"
                  )
                }
              >
                <Icons.Percent className="h-4 w-4" />
                Affiliate
              </NavLink>

              {user?.role === "admin" && (
                <NavLink
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-secondary hover:bg-surface-3 hover:text-primary"
                    )
                  }
                >
                  <Icons.Shield className="h-4 w-4" />
                  Admin
                </NavLink>
              )}

              {/* Theme toggle inline */}
              <button
                type="button"
                onClick={() => { toggleTheme(); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary hover:bg-surface-3 hover:text-primary transition-colors"
              >
                {theme === "dark" ? <Icons.Moon className="h-4 w-4" /> : <Icons.Sun className="h-4 w-4" />}
                Switch to {theme === "dark" ? "Light" : "Dark"} Mode
              </button>
            </div>

            {/* Sign out */}
            <div className="border-t border-border py-1">
              <button
                onClick={() => { logout(); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-red hover:bg-red/5 transition-colors"
              >
                <Icons.LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// User dropdown menu for mobile header (org info + sign out)
// ---------------------------------------------------------------------------
function UserDropdown() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "SP"
  const orgName = user?.display_name || user?.client_name || user?.username || "My Organization"
  const email = user?.username ?? ""
  const avatarUrl = user?.avatar_url || null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-8 w-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={orgName} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-[11px] font-bold text-accent">{initials}</span>
          </div>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 bg-surface-1 border border-border rounded-xl shadow-lg z-50 overflow-hidden"
          >
            {/* Org header */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={orgName} className="h-10 w-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-accent">{initials}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate leading-tight">
                    {orgName}
                  </p>
                  <p className="text-[11px] text-muted truncate">{email}</p>
                  {user?.role && (
                    <span className="inline-block mt-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="py-1">
              <NavLink
                to="/settings"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-secondary hover:bg-surface-3 hover:text-primary"
                  )
                }
              >
                <Icons.Settings className="h-4 w-4" />
                Settings
              </NavLink>

              <NavLink
                to="/profile"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-secondary hover:bg-surface-3 hover:text-primary"
                  )
                }
              >
                <Icons.User className="h-4 w-4" />
                Profile & Billing
              </NavLink>

              <NavLink
                to="/billing"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-secondary hover:bg-surface-3 hover:text-primary"
                  )
                }
              >
                <Icons.CreditCard className="h-4 w-4" />
                Billing
              </NavLink>

              <NavLink
                to="/affiliate"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-secondary hover:bg-surface-3 hover:text-primary"
                  )
                }
              >
                <Icons.Percent className="h-4 w-4" />
                Affiliate
              </NavLink>

              {user?.role === "admin" && (
                <NavLink
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-secondary hover:bg-surface-3 hover:text-primary"
                    )
                  }
                >
                  <Icons.Shield className="h-4 w-4" />
                  Admin
                </NavLink>
              )}
            </div>

            {/* Sign out */}
            <div className="border-t border-border py-1">
              <button
                onClick={() => { logout(); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-red hover:bg-red/5 transition-colors"
              >
                <Icons.LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-[85vw] max-w-sm"
          >
            <Sidebar
              collapsed={false}
              onToggleCollapse={() => {}}
              onMobileClose={onClose}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// AppLayout — main export
// ---------------------------------------------------------------------------
export function AppLayout() {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile drawer on route change
  const location = useLocation()
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
      <div className="min-h-screen bg-surface-0">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </div>

      {/* Mobile drawer */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Mobile header */}
      <MobileHeader onMenuClick={() => setMobileOpen(true)} />

      {/* Content area */}
      <main
        className={cn(
          "transition-all duration-300 ease-in-out min-h-screen",
          // Desktop: margin-left matches sidebar width
          "md:ml-[60px]",
          collapsed && "md:ml-[60px]",
          !collapsed && "md:ml-[260px]",
          // Mobile: no margin, header offset
          "pt-0 md:pt-0"
        )}
      >
        {/* Mobile header spacer */}
        <div className="md:hidden h-14" />

        {/* Email verification banner */}
        {user && !(user.email_verified ?? false) && (
          <EmailVerificationBanner
            email={user.username || ""}
            emailVerified={user.email_verified ?? false}
          />
        )}

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AppLayout
