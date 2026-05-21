import { useState } from "react"
import { motion } from "framer-motion"
import {
  Bell,
  BellRing,
  History,
  Plus,
  Trash2,
  Edit3,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Clock,
  Activity,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

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

const sampleRules = [
  {
    id: 1,
    name: "Engagement Drop",
    condition: "Engagement rate drops below 1%",
    status: "active" as const,
    lastTriggered: "2 days ago",
  },
  {
    id: 2,
    name: "Follower Milestone",
    condition: "Follower count exceeds 10,000",
    status: "active" as const,
    lastTriggered: "Last week",
  },
  {
    id: 3,
    name: "Negative Sentiment",
    condition: "More than 5 negative comments in 1 hour",
    status: "paused" as const,
    lastTriggered: "Never",
  },
]

const sampleHistory = [
  {
    id: 1,
    ruleName: "Engagement Drop",
    triggeredAt: "May 13, 2026 at 2:34 PM",
    detail: "Engagement dropped to 0.8% on Instagram",
    severity: "warning" as const,
  },
  {
    id: 2,
    ruleName: "Follower Milestone",
    triggeredAt: "May 8, 2026 at 9:15 AM",
    detail: "Follower count reached 10,042 on Twitter",
    severity: "success" as const,
  },
  {
    id: 3,
    ruleName: "Engagement Drop",
    triggeredAt: "April 29, 2026 at 6:22 PM",
    detail: "Engagement dropped to 0.6% on Facebook",
    severity: "warning" as const,
  },
  {
    id: 4,
    ruleName: "Negative Sentiment",
    triggeredAt: "April 15, 2026 at 11:07 AM",
    detail: "7 negative comments detected on latest post",
    severity: "danger" as const,
  },
]

const severityColors: Record<string, string> = {
  warning: "bg-amber/10 text-amber border border-amber/20",
  success: "bg-green/10 text-green border border-green/20",
  danger: "bg-red/10 text-red border border-red/20",
}

function AlertRulesTab() {
  const [rules, setRules] = useState(sampleRules)

  const toggleRule = (id: number) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "active" ? ("paused" as const) : ("active" as const) }
          : r
      )
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Configure alert rules to monitor your social media performance
        </p>
        <Button variant="default" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BellRing className="h-4 w-4 text-accent" />
            Rule Builder
          </CardTitle>
          <CardDescription>
            Define conditions that trigger alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed border-border p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted mb-1.5">Rule Name</label>
                <Input placeholder="e.g., Engagement Drop Alert" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted mb-1.5">Condition</label>
                <Input placeholder="e.g., engagement_rate < 1.0" />
              </div>
              <div className="flex items-end">
                <Button variant="secondary" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted mt-2">
              Specify conditions using metrics like engagement_rate, follower_count, sentiment_score, etc.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <p className="text-sm font-medium text-primary flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent" />
          Your Alert Rules ({rules.length})
        </p>

        {rules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-8 w-8 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted">No alert rules configured yet</p>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      rule.status === "active" ? "bg-green/10" : "bg-surface-3"
                    }`}
                  >
                    {rule.status === "active" ? (
                      <BellRing className="h-4 w-4 text-green" />
                    ) : (
                      <Bell className="h-4 w-4 text-muted" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">{rule.name}</p>
                    <p className="text-xs text-muted truncate">{rule.condition}</p>
                    <p className="text-[10px] text-muted mt-1">
                      Last triggered: {rule.lastTriggered}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={rule.status === "active" ? "success" : "secondary"}
                    className="text-[10px]"
                  >
                    {rule.status === "active" ? "Active" : "Paused"}
                  </Badge>
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className="text-muted hover:text-primary transition-colors"
                    title={rule.status === "active" ? "Pause rule" : "Activate rule"}
                  >
                    {rule.status === "active" ? (
                      <ToggleRight className="h-5 w-5 text-green" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    className="text-muted hover:text-accent transition-colors"
                    title="Edit rule"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    className="text-muted hover:text-red transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function AlertHistoryTab() {
  const [history] = useState(sampleHistory)

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        View the history of all triggered alerts
      </p>

      {history.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="h-8 w-8 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted">No alerts have been triggered yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="h-4 w-4 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-primary">{entry.ruleName}</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${severityColors[entry.severity]}`}
                    >
                      {entry.severity}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{entry.detail}</p>
                  <p className="text-[10px] text-muted mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {entry.triggeredAt}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function AlertsPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 pb-12"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-primary tracking-tight">Alerts</h1>
          <Badge variant="warning" className="text-[10px] px-2 py-0.5 gap-1">
            <AlertTriangle className="h-3 w-3" />
            2 active
          </Badge>
        </div>
        <p className="text-sm text-muted">
          Monitor your accounts and get notified about important changes
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="rules" className="gap-2">
              <BellRing className="h-4 w-4" />
              Alert Rules
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Alert History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules">
            <AlertRulesTab />
          </TabsContent>
          <TabsContent value="history">
            <AlertHistoryTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
