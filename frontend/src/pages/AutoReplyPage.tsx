import { useState } from "react"
import { motion } from "framer-motion"
import {
  MessageCircle,
  Bot,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Trash2,
  Edit3,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AutoReplyRule {
  id: string
  name: string
  trigger: string
  reply: string
  platform: string
  enabled: boolean
  matchType: "exact" | "contains" | "starts_with"
  created_at: string
  last_triggered: string | null
  trigger_count: number
}

interface ActivityLogEntry {
  id: string
  rule_name: string
  trigger: string
  reply: string
  platform: string
  matched_at: string
  status: "sent" | "failed" | "filtered"
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const initialRules: AutoReplyRule[] = [
  {
    id: "1",
    name: "Welcome Greeting",
    trigger: "hello|hi|hey",
    reply: "Hi there! \U0001f44d Thanks for reaching out. How can I help you today?",
    platform: "twitter",
    enabled: true,
    matchType: "contains",
    created_at: "2026-04-10T10:00:00Z",
    last_triggered: "2026-05-14T15:30:00Z",
    trigger_count: 142,
  },
  {
    id: "2",
    name: "Support Hours",
    trigger: "support hours",
    reply: "Our support team is available Mon-Fri, 9 AM - 6 PM EST. We'll get back to you shortly!",
    platform: "instagram",
    enabled: true,
    matchType: "exact",
    created_at: "2026-04-12T14:00:00Z",
    last_triggered: "2026-05-13T09:15:00Z",
    trigger_count: 58,
  },
  {
    id: "3",
    name: "Thank You",
    trigger: "thank you|thanks|thx",
    reply: "You're very welcome! \U0001f60a Let me know if there's anything else I can help with.",
    platform: "facebook",
    enabled: false,
    matchType: "contains",
    created_at: "2026-04-15T08:00:00Z",
    last_triggered: null,
    trigger_count: 0,
  },
  {
    id: "4",
    name: "Pricing Inquiry",
    trigger: "price|cost|pricing|how much",
    reply: "Thanks for your interest! You can find our full pricing details at https://socialpulses.com/pricing",
    platform: "linkedin",
    enabled: true,
    matchType: "contains",
    created_at: "2026-04-20T11:00:00Z",
    last_triggered: "2026-05-12T16:45:00Z",
    trigger_count: 89,
  },
]

const initialActivityLog: ActivityLogEntry[] = [
  {
    id: "a1",
    rule_name: "Welcome Greeting",
    trigger: "Hey there!",
    reply: "Hi there! \U0001f44d Thanks for reaching out. How can I help you today?",
    platform: "twitter",
    matched_at: "2026-05-14T15:30:00Z",
    status: "sent",
  },
  {
    id: "a2",
    rule_name: "Support Hours",
    trigger: "What are your support hours?",
    reply: "Our support team is available Mon-Fri, 9 AM - 6 PM EST.",
    platform: "instagram",
    matched_at: "2026-05-13T09:15:00Z",
    status: "sent",
  },
  {
    id: "a3",
    rule_name: "Pricing Inquiry",
    trigger: "How much does it cost?",
    reply: "Thanks for your interest! You can find our full pricing details at...",
    platform: "linkedin",
    matched_at: "2026-05-12T16:45:00Z",
    status: "sent",
  },
  {
    id: "a4",
    rule_name: "Welcome Greeting",
    trigger: "Hi",
    reply: "Hi there! \U0001f44d Thanks for reaching out. How can I help you today?",
    platform: "twitter",
    matched_at: "2026-05-11T10:20:00Z",
    status: "failed",
  },
]

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
// Empty state
// ---------------------------------------------------------------------------
function EmptyRules({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
        <Bot className="h-8 w-8 text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1">No auto-reply rules yet</h3>
      <p className="text-sm text-muted max-w-xs mb-6">
        Create your first rule to automatically respond to incoming messages based on keywords.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Rule
      </Button>
    </motion.div>
  )
}

function EmptyActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
        <Clock className="h-8 w-8 text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1">No recent activity</h3>
      <p className="text-sm text-muted max-w-xs">
        Activity log will show when your auto-reply rules are triggered.
      </p>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Add/Edit Rule Dialog
// ---------------------------------------------------------------------------
function RuleDialog({
  open,
  onClose,
  editRule,
}: {
  open: boolean
  onClose: () => void
  editRule: AutoReplyRule | null
}) {
  const [name, setName] = useState(editRule?.name ?? "")
  const [trigger, setTrigger] = useState(editRule?.trigger ?? "")
  const [reply, setReply] = useState(editRule?.reply ?? "")
  const [platform, setPlatform] = useState(editRule?.platform ?? "twitter")
  const [matchType, setMatchType] = useState<"exact" | "contains" | "starts_with">(
    editRule?.matchType ?? "contains"
  )

  const isEditing = !!editRule

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Rule" : "Create Auto-Reply Rule"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modify the auto-reply rule settings below."
              : "Define a trigger keyword and the auto-reply message."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Rule Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Rule Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Greeting"
            />
          </div>

          {/* Trigger */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Trigger Keyword(s)</label>
            <Input
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="e.g., hello|hi|hey"
            />
            <p className="text-xs text-muted">
              Separate multiple keywords with a pipe (|) character.
            </p>
          </div>

          {/* Match Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Match Type</label>
            <div className="flex gap-2">
              {(["exact", "contains", "starts_with"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMatchType(type)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200",
                    matchType === type
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface-1 text-muted hover:border-border-hover hover:text-secondary"
                  )}
                >
                  {type === "exact" ? "Exact Match" : type === "contains" ? "Contains" : "Starts With"}
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="twitter">Twitter / X</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="all">All Platforms</option>
            </select>
          </div>

          {/* Reply Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Reply Message</label>
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type the auto-reply message..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button className="gap-2">
            <Zap className="h-4 w-4" />
            {isEditing ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Rule Card
// ---------------------------------------------------------------------------
function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: AutoReplyRule
  onToggle: (id: string) => void
  onEdit: (rule: AutoReplyRule) => void
  onDelete: (id: string) => void
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className={cn("transition-all duration-200", !rule.enabled && "opacity-60")}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-primary truncate">{rule.name}</h3>
                <Badge
                  variant={rule.enabled ? "success" : "secondary"}
                  className="text-[10px]"
                >
                  {rule.enabled ? "Active" : "Paused"}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {rule.platform}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
                <span className="font-mono bg-surface-2 px-1.5 py-0.5 rounded text-[10px]">
                  {rule.matchType.replace("_", " ")}: {rule.trigger}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className="truncate max-w-[200px]">{rule.reply}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {rule.trigger_count} triggers
                </span>
                {rule.last_triggered && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last: {new Date(rule.last_triggered).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onToggle(rule.id)}
                title={rule.enabled ? "Pause rule" : "Activate rule"}
              >
                {rule.enabled ? (
                  <PauseCircle className="h-4 w-4 text-amber" />
                ) : (
                  <PlayCircle className="h-4 w-4 text-green" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(rule)}
                title="Edit rule"
              >
                <Edit3 className="h-4 w-4 text-muted" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted hover:text-red"
                onClick={() => onDelete(rule.id)}
                title="Delete rule"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Activity Log Entry
// ---------------------------------------------------------------------------
function ActivityEntry({ entry }: { entry: ActivityLogEntry }) {
  return (
    <motion.div variants={itemVariants}>
      <div className="rounded-lg border border-border bg-surface-1 p-4 transition-colors hover:border-border-hover">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-primary">{entry.rule_name}</span>
              <Badge variant="secondary" className="text-[10px]">
                {entry.platform}
              </Badge>
              <Badge
                variant={
                  entry.status === "sent"
                    ? "success"
                    : entry.status === "failed"
                    ? "destructive"
                    : "secondary"
                }
                className="text-[10px]"
              >
                {entry.status === "sent" ? (
                  <CheckCircle2 className="h-3 w-3 mr-0.5" />
                ) : entry.status === "failed" ? (
                  <XCircle className="h-3 w-3 mr-0.5" />
                ) : null}
                {entry.status}
              </Badge>
            </div>
            <p className="text-xs text-muted mb-0.5">
              <span className="font-medium">Trigger:</span> "{entry.trigger}"
            </p>
            <p className="text-xs text-muted">
              <span className="font-medium">Reply:</span> {entry.reply}
            </p>
          </div>
          <span className="text-[10px] text-muted shrink-0">
            {new Date(entry.matched_at).toLocaleString()}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Stats Card
// ---------------------------------------------------------------------------
function StatsCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
            color
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted">{label}</p>
          <p className="text-lg font-bold text-primary">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// AutoReplyPage
// ---------------------------------------------------------------------------
export function AutoReplyPage() {
  const [rules, setRules] = useState<AutoReplyRule[]>(initialRules)
  const [activityLog] = useState<ActivityLogEntry[]>(initialActivityLog)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRule, setEditRule] = useState<AutoReplyRule | null>(null)

  const activeRules = rules.filter((r) => r.enabled)
  const totalTriggers = rules.reduce((sum, r) => sum + r.trigger_count, 0)
  const totalFailed = activityLog.filter((e) => e.status === "failed").length

  const filteredRules = rules.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.trigger.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggle = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    )
  }

  const handleDelete = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const handleEdit = (rule: AutoReplyRule) => {
    setEditRule(rule)
    setDialogOpen(true)
  }

  const handleAdd = () => {
    setEditRule(null)
    setDialogOpen(true)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6 pb-12"
    >
      {/* ── Page Header ── */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Auto-Reply</h1>
        <p className="text-sm text-muted mt-1">
          Set up automated responses to engage with your audience instantly
        </p>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          icon={<Bot className="h-5 w-5 text-accent" />}
          label="Total Rules"
          value={rules.length}
          color="bg-accent/10"
        />
        <StatsCard
          icon={<PlayCircle className="h-5 w-5 text-green" />}
          label="Active Rules"
          value={activeRules.length}
          color="bg-green/10"
        />
        <StatsCard
          icon={<Zap className="h-5 w-5 text-amber" />}
          label="Total Triggers"
          value={totalTriggers.toLocaleString()}
          color="bg-amber/10"
        />
        <StatsCard
          icon={<XCircle className="h-5 w-5 text-red" />}
          label="Failed Replies"
          value={totalFailed}
          color="bg-red/10"
        />
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="rules" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="rules" className="gap-2">
                <Bot className="h-4 w-4" />
                Rules
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Clock className="h-4 w-4" />
                Activity Log
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Rules Tab ── */}
          <TabsContent value="rules" className="mt-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <Input
                  placeholder="Search rules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleAdd} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
            </div>

            {filteredRules.length === 0 ? (
              <EmptyRules onAdd={handleAdd} />
            ) : (
              <div className="space-y-2">
                {filteredRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Activity Log Tab ── */}
          <TabsContent value="activity" className="mt-0">
            {activityLog.length === 0 ? (
              <EmptyActivity />
            ) : (
              <div className="space-y-2">
                {activityLog.map((entry) => (
                  <ActivityEntry key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Add/Edit Dialog ── */}
      <RuleDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditRule(null)
        }}
        editRule={editRule}
      />
    </motion.div>
  )
}
