import { useState } from "react"
import { motion } from "framer-motion"
import {
  Download,
  BarChart3,
  TrendingUp,
  Users,
  CalendarDays,
  Filter,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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

export function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState("all")

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 pb-12"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Reports</h1>
          <p className="text-sm text-muted mt-1">
            Generate and export detailed performance reports
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button variant="default" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Engagement Report
            </CardTitle>
            <CardDescription>
              Track likes, comments, shares, and overall engagement over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-accent/60" />
              </div>
              <p className="text-sm font-medium text-primary">No engagement data yet</p>
              <p className="text-xs text-muted mt-1 max-w-xs">
                Engagement charts will appear here once you have enough activity data to report on.
              </p>
              <Badge variant="secondary" className="mt-3 text-[10px]">
                coming with data
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              Followers Report
            </CardTitle>
            <CardDescription>
              Analyze follower growth, demographics, and retention trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-xl bg-blue/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-blue/60" />
              </div>
              <p className="text-sm font-medium text-primary">No follower data yet</p>
              <p className="text-xs text-muted mt-1 max-w-xs">
                Follower charts and demographic breakdowns will appear here once data is collected.
              </p>
              <Badge variant="info" className="mt-3 text-[10px]">
                coming with data
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-accent" />
              Best Posting Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <Filter className="h-6 w-6 text-muted mb-2" />
              <p className="text-xs text-muted">Insufficient data to determine optimal times</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Top Performing Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <Filter className="h-6 w-6 text-muted mb-2" />
              <p className="text-xs text-muted">No content performance data available yet</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Platform Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <Filter className="h-6 w-6 text-muted mb-2" />
              <p className="text-xs text-muted">Connect multiple platforms to see comparison data</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
