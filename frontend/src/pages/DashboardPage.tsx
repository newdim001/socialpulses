import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar,
  BarChart3,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  FileEdit,
  ArrowRight,
  AlertTriangle,
  Ban,
  ChevronDown,
  Users,
  Link,
  Plus,
} from "lucide-react"
import { useAuth } from "@/auth/AuthProvider"
import { useSubscription } from "@/auth/SubscriptionProvider"
import { apiFetch, cn } from "@/lib/utils"
import { PlatformIcon, getPlatformColor } from "@/components/PlatformIcon"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StreakWidget } from "@/components/StreakWidget"


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DashboardData {
  stats: {
    scheduled: number
    published: number
    failed: number
    drafts: number
  }
  upcoming_posts: {
    id: string
    content: string
    platform: string
    scheduled_at: string
    status: string
  }[]
}

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

// ---------------------------------------------------------------------------
// Stat card config
// ---------------------------------------------------------------------------
interface StatConfig {
  label: string
  key: keyof DashboardData["stats"]
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgClass: string
  badgeVariant: "info" | "success" | "danger" | "warning"
}

const statCards: StatConfig[] = [
  {
    label: "Scheduled",
    key: "scheduled",
    icon: Clock,
    color: "text-blue",
    bgClass: "bg-blue/10",
    badgeVariant: "info",
  },
  {
    label: "Published",
    key: "published",
    icon: CheckCircle2,
    color: "text-green",
    bgClass: "bg-green/10",
    badgeVariant: "success",
  },
  {
    label: "Failed",
    key: "failed",
    icon: XCircle,
    color: "text-red",
    bgClass: "bg-red/10",
    badgeVariant: "danger",
  },
  {
    label: "Drafts",
    key: "drafts",
    icon: FileEdit,
    color: "text-amber",
    bgClass: "bg-amber/10",
    badgeVariant: "warning",
  },
]

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------
const quickActions = [
  { label: "New Post", icon: Send, path: "/compose", variant: "default" as const },
  { label: "Calendar", icon: Calendar, path: "/calendar", variant: "secondary" as const },
  { label: "Analytics", icon: BarChart3, path: "/analytics", variant: "secondary" as const },
]

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------
function formatSchedule(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  if (diff < 0) return "Overdue"
  const hours = Math.round(diff / 3600000)
  if (hours < 1) return "Less than 1h"
  if (hours < 24) return `${hours}h remaining`
  const days = Math.round(hours / 24)
  return `${days}d remaining`
}


// ---------------------------------------------------------------------------
// TrialExpiredOverlay -- full page block when trial has ended
// ---------------------------------------------------------------------------
function TrialExpiredOverlay({ reason }: { reason: string | null }) {
  const navigate = useNavigate()
  const title =
    reason === "trial_expired"
      ? "Your trial has ended"
      : "Payment required"

  const description =
    reason === "trial_expired"
      ? "Your 14-day free trial has expired. Upgrade to a paid plan to continue using SocialPulses."
      : "Your subscription requires payment to continue. Please update your billing information."

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="h-20 w-20 rounded-2xl bg-red/10 flex items-center justify-center mb-6">
        <Ban className="h-10 w-10 text-red" />
      </div>
      <h2 className="text-2xl font-bold text-primary mb-2">{title}</h2>
      <p className="text-muted max-w-md mb-8">{description}</p>
      <Button onClick={() => navigate("/billing")} className="gap-2">
        View Plans & Pricing
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}


// ---------------------------------------------------------------------------
// SubscriptionBanner
// ---------------------------------------------------------------------------
function SubscriptionBanner() {
  const navigate = useNavigate()
  const { showTrialWarning, trialDaysLeft, hasAccess } = useSubscription()

  if (!hasAccess) return null // overlay handles this case

  if (showTrialWarning && trialDaysLeft > 0) {
    return (
      <motion.div
        variants={itemVariants}
        className="rounded-lg border border-amber/20 bg-amber/5 px-4 py-3 text-sm text-amber flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Your trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}.
            Upgrade to keep using SocialPulses.
          </span>
        </div>
        <Button
          size="sm"
          variant="default"
          onClick={() => navigate("/billing")}
          className="shrink-0 ml-3"
        >
          Upgrade
        </Button>
      </motion.div>
    )
  }

  return null
}



// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------
export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { hasAccess, expiredReason } = useSubscription()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch("/dashboard"),
  })

  const stats = dashboard?.stats
  const upcomingPosts = dashboard?.upcoming_posts ?? []



  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 pb-12"
    >
{/* Stats Grid */}
      {hasAccess && (
        <>
          {!isLoading && stats && stats.scheduled === 0 && stats.published === 0 && stats.drafts === 0 ? (
            <motion.div variants={itemVariants}>
              <EmptyState
                icon={<LayoutDashboard className="h-8 w-8 text-muted" />}
                title="Welcome to your dashboard"
                description="Your stats and recent posts will appear here. Connect your first social account and create a post to get started."
                action={
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button onClick={() => navigate("/accounts")} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Connect your first account
                    </Button>
                    <Button variant="secondary" onClick={() => navigate("/compose")} className="gap-2">
                      <Send className="h-4 w-4" />
                      Create a post
                    </Button>
                  </div>
                }
              />
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat) => (
                <Card key={stat.key} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted uppercase tracking-wider">
                          {stat.label}
                        </p>
                        {isLoading ? (
                          <Skeleton className="h-8 w-16 mt-2" />
                        ) : (
                          <p className={cn("text-3xl font-bold mt-1", stat.color)}>
                            {stats?.[stat.key] ?? 0}
                          </p>
                        )}
                      </div>
                      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", stat.bgClass)}>
                        <stat.icon className={cn("h-5 w-5", stat.color)} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <Badge variant={stat.badgeVariant} className="text-[10px] px-2 py-0.5">
                        {stat.label} posts
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* Posting Streak */}
      {hasAccess && (
        <motion.div variants={itemVariants}>
          <h2 className="text-sm font-semibold text-primary mb-3">Posting Streak</h2>
          <StreakWidget />
        </motion.div>
      )}

      {/* Quick Actions */}
      {hasAccess && (
        <motion.div variants={itemVariants}>
          <h2 className="text-sm font-semibold text-primary mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.path}
                variant={action.variant}
                onClick={() => navigate(action.path)}
                className="gap-2"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Upcoming Posts */}
      {hasAccess && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-primary">Upcoming Posts</h2>
            {upcomingPosts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/calendar")} className="gap-1 text-xs">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="shrink-0 w-72">
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-4 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : upcomingPosts.length === 0 ? (
            <Card>
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <Send className="h-8 w-8 text-muted mb-3" />
                <p className="text-sm text-muted">No upcoming posts</p>
                <Button variant="secondary" size="sm" onClick={() => navigate("/compose")} className="mt-3">
                  Create your first post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {upcomingPosts.map((post) => (
                <Card key={post.id} className="shrink-0 w-72">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={post.platform} size={16} />
                      <span className="text-xs font-medium text-secondary capitalize">{post.platform}</span>
                      <Badge
                        variant={post.status === "scheduled" ? "info" : post.status === "draft" ? "warning" : "secondary"}
                        className="ml-auto text-[10px]"
                      >
                        {post.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-primary line-clamp-2 leading-relaxed">{post.content}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Clock className="h-3 w-3" />
                      {formatSchedule(post.scheduled_at)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
