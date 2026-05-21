import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  BarChart3,
  FileEdit,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { apiFetch, cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface AnalyticsSummary {
  total_posts: number
  published: number
  scheduled: number
  failed: number
  drafts: number
  engagement_rate: number
  followers_growth: number
  monthly_data: { month: string; posts: number; engagement: number; followers: number }[]
  platform_breakdown: { platform: string; posts: number; engagement: number }[]
}

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

interface StatConfig {
  label: string
  key: keyof Pick<AnalyticsSummary, "total_posts" | "published" | "scheduled" | "failed" | "drafts">
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgClass: string
}

const statCards: StatConfig[] = [
  {
    label: "Total Posts",
    key: "total_posts",
    icon: BarChart3,
    color: "text-accent",
    bgClass: "bg-accent/10",
  },
  {
    label: "Published",
    key: "published",
    icon: CheckCircle2,
    color: "text-green",
    bgClass: "bg-green/10",
  },
  {
    label: "Scheduled",
    key: "scheduled",
    icon: Clock,
    color: "text-blue",
    bgClass: "bg-blue/10",
  },
  {
    label: "Failed",
    key: "failed",
    icon: XCircle,
    color: "text-red",
    bgClass: "bg-red/10",
  },
  {
    label: "Drafts",
    key: "drafts",
    icon: FileEdit,
    color: "text-amber",
    bgClass: "bg-amber/10",
  },
]

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-surface-1 px-3 py-2 shadow-lg text-xs">
      <p className="text-secondary font-medium mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

function TrendingBadge({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green">
        <TrendingUp className="h-3 w-3" />
        +{value.toFixed(1)}%
      </span>
    )
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-red">
        <TrendingDown className="h-3 w-3" />
        {value.toFixed(1)}%
      </span>
    )
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted">
      <Minus className="h-3 w-3" />
      0%
    </span>
  )
}

export function AnalyticsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState<string>("all")

  const { data: analytics, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["analytics", "summary"],
    queryFn: () => apiFetch<AnalyticsSummary>("/analytics/summary"),
  })

  const months = [
    { value: "all", label: "All Months" },
    { value: "01", label: "Jan" },
    { value: "02", label: "Feb" },
    { value: "03", label: "Mar" },
    { value: "04", label: "Apr" },
    { value: "05", label: "May" },
    { value: "06", label: "Jun" },
    { value: "07", label: "Jul" },
    { value: "08", label: "Aug" },
    { value: "09", label: "Sep" },
    { value: "10", label: "Oct" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dec" },
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const chartData = analytics?.monthly_data ?? []
  const platformData = analytics?.platform_breakdown ?? []

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 pb-12"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Analytics</h1>
          <p className="text-sm text-muted mt-1">
            Track your social media performance and engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface-3 px-3 text-sm text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-0"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-border bg-surface-3 px-3 text-sm text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-0"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
                      {analytics?.[stat.key] ?? 0}
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                    stat.bgClass
                  )}
                >
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </div>
              <div className="mt-3">
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  {stat.label.toLowerCase()} count
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-secondary">Engagement Rate</p>
              {!isLoading && (
                <TrendingBadge value={analytics?.engagement_rate ?? 0} />
              )}
            </div>
            {isLoading ? (
              <Skeleton className="h-10 w-24 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-primary mt-1">
                {(analytics?.engagement_rate ?? 0).toFixed(2)}%
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-secondary">Followers Growth</p>
              {!isLoading && (
                <TrendingBadge value={analytics?.followers_growth ?? 0} />
              )}
            </div>
            {isLoading ? (
              <Skeleton className="h-10 w-24 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-primary mt-1">
                {analytics?.followers_growth != null
                  ? `${analytics.followers_growth > 0 ? "+" : ""}${analytics.followers_growth.toFixed(1)}%`
                  : "0%"}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Monthly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted">
                No monthly data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
                  <Line
                    type="monotone"
                    dataKey="posts"
                    stroke="#5e6ad2"
                    strokeWidth={2}
                    dot={{ fill: "#5e6ad2", r: 3 }}
                    name="Posts"
                  />
                  <Line
                    type="monotone"
                    dataKey="engagement"
                    stroke="#4ade80"
                    strokeWidth={2}
                    dot={{ fill: "#4ade80", r: 3 }}
                    name="Engagement"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-accent" />
              Platform Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : platformData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted">
                No platform data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={platformData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="platform"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
                  <Bar
                    dataKey="posts"
                    fill="#5e6ad2"
                    radius={[4, 4, 0, 0]}
                    name="Posts"
                  />
                  <Bar
                    dataKey="engagement"
                    fill="#38bdf8"
                    radius={[4, 4, 0, 0]}
                    name="Engagement"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
