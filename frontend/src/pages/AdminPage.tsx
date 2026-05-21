import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Users,
  Building2,
  Activity,
  CreditCard,
  ShieldAlert,
  UserCheck,
  UserX,
  Calendar,
  Mail,
  ArrowLeft,
} from "lucide-react"
import { useAuth } from "@/auth/AuthProvider"
import { apiFetch, cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Client {
  id: number
  name: string
  email: string
  company: string | null
  is_active: boolean
  created_at: string
  subscription_tier: string
  subscription_status: string
  account_count: number
  post_count: number
  user_count: number
}

interface AdminStats {
  total_clients: number
  total_active_subscriptions: number
  clients_per_plan: Record<string, number>
}

interface ActivityEntry {
  date: string
  posts_created: number
}

interface AdminDashboardData {
  clients: Client[]
  stats: AdminStats
  recent_activity: ActivityEntry[]
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
interface StatCardProps {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgClass: string
  loading?: boolean
}

function StatCard({ label, value, icon: Icon, color, bgClass, loading }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className={cn("text-3xl font-bold mt-1", color)}>{value}</p>
            )}
          </div>
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", bgClass)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Plan breakdown
// ---------------------------------------------------------------------------
function PlanBreakdown({ plans, loading }: { plans?: Record<string, number>; loading: boolean }) {
  if (loading) return <Skeleton className="h-24 w-full" />
  if (!plans) return null
  const entries = Object.entries(plans).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-primary">Subscriptions by Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map(([plan, count]) => (
          <div key={plan} className="flex items-center justify-between text-sm">
            <span className="capitalize text-muted">{plan || "Unknown"}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-primary font-medium w-8 text-right">{count}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Clients table
// ---------------------------------------------------------------------------
function ClientsTable({ clients, loading }: { clients?: Client[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No clients found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-muted/20 text-left">
            <th className="pb-3 font-semibold text-muted text-xs uppercase tracking-wider">Client</th>
            <th className="pb-3 font-semibold text-muted text-xs uppercase tracking-wider hidden md:table-cell">Email</th>
            <th className="pb-3 font-semibold text-muted text-xs uppercase tracking-wider hidden lg:table-cell">Plan</th>
            <th className="pb-3 font-semibold text-muted text-xs uppercase tracking-wider">Status</th>
            <th className="pb-3 font-semibold text-muted text-xs uppercase tracking-wider text-right">Posts</th>
            <th className="pb-3 font-semibold text-muted text-xs uppercase tracking-wider text-right hidden md:table-cell">Accounts</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-muted/10 hover:bg-muted/5 transition-colors">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <Building2 className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">{client.name}</p>
                    <p className="text-xs text-muted hidden sm:block">{client.company || "—"}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 text-muted hidden md:table-cell">
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[180px]">{client.email}</span>
                </div>
              </td>
              <td className="py-3 hidden lg:table-cell">
                <Badge variant={client.subscription_tier === "free" ? "warning" : "info"} className="capitalize text-[10px]">
                  {client.subscription_tier}
                </Badge>
              </td>
              <td className="py-3">
                {client.is_active ? (
                  <div className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-green-500" />
                    <span className="text-green-500 text-xs">Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <UserX className="h-3 w-3 text-red-500" />
                    <span className="text-red-500 text-xs">Inactive</span>
                  </div>
                )}
              </td>
              <td className="py-3 text-right text-primary font-medium">{client.post_count}</td>
              <td className="py-3 text-right text-muted hidden md:table-cell">{client.account_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent activity chart
// ---------------------------------------------------------------------------
function RecentActivity({ activity, loading }: { activity?: ActivityEntry[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-32 w-full" />
  if (!activity || activity.length === 0) {
    return <p className="text-sm text-muted py-8 text-center">No recent activity</p>
  }

  const maxPosts = Math.max(...activity.map((a) => a.posts_created), 1)

  return (
    <div className="space-y-3">
      {activity.map((entry) => (
        <div key={entry.date} className="flex items-center gap-3">
          <span className="text-xs text-muted w-24 shrink-0">
            {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <div className="flex-1 h-8 rounded-md bg-muted/20 overflow-hidden flex items-center">
            <div
              className="h-full rounded-md bg-gradient-to-r from-accent/60 to-accent transition-all flex items-center px-2"
              style={{ width: `${(entry.posts_created / maxPosts) * 100}%`, minWidth: entry.posts_created > 0 ? "2rem" : "0" }}
            >
              <span className="text-xs font-medium text-white drop-shadow-sm">
                {entry.posts_created}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AdminPage
// ---------------------------------------------------------------------------
export function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery<AdminDashboardData>({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiFetch<AdminDashboardData>("/admin/dashboard"),
    retry: false,
  })

  // Non-admin users
  if (user?.role !== "admin") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6 p-6 pb-12"
      >
        <motion.div variants={itemVariants} className="text-center py-20">
          <ShieldAlert className="h-12 w-12 mx-auto text-muted mb-4" />
          <h2 className="text-lg font-semibold text-primary">Access Denied</h2>
          <p className="text-sm text-muted mt-1 mb-4">
            You don't have admin privileges to access this page.
          </p>
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </motion.div>
      </motion.div>
    )
  }

  // API error
  if (error && !isLoading) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6 p-6 pb-12"
      >
        <motion.div variants={itemVariants} className="text-center py-20">
          <ShieldAlert className="h-12 w-12 mx-auto text-red-400 mb-4" />
          <h2 className="text-lg font-semibold text-primary">Error Loading Admin Data</h2>
          <p className="text-sm text-muted mt-1 mb-4">
            {error instanceof Error ? error.message : "An unknown error occurred"}
          </p>
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </motion.div>
      </motion.div>
    )
  }

  const clients = data?.clients ?? []
  const stats = data?.stats
  const activity = data?.recent_activity ?? []

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6 pb-12"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted mt-1">System overview and client management</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={stats?.total_clients ?? 0} icon={Users} color="text-blue" bgClass="bg-blue/10" loading={isLoading} />
        <StatCard label="Active Subs" value={stats?.total_active_subscriptions ?? 0} icon={CreditCard} color="text-green" bgClass="bg-green/10" loading={isLoading} />
        <StatCard label="Total Posts" value={clients.reduce((s, c) => s + c.post_count, 0)} icon={Activity} color="text-purple" bgClass="bg-purple/10" loading={isLoading} />
        <StatCard label="Total Users" value={clients.reduce((s, c) => s + c.user_count, 0)} icon={UserCheck} color="text-orange" bgClass="bg-orange/10" loading={isLoading} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <PlanBreakdown plans={stats?.clients_per_plan} loading={isLoading} />
        </motion.div>
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Recent Activity (Posts Created)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentActivity activity={activity} loading={isLoading} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
              <Building2 className="h-4 w-4" /> All Clients ({clients.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClientsTable clients={clients} loading={isLoading} />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
