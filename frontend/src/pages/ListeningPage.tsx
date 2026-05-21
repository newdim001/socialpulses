import { useState } from "react"
import { motion } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Radio,
  Hash,
  MessageCircle,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Globe,
  Heart,
  Repeat2,
  MessageSquare,
  BarChart3,
  Trash2,
  Eye,
  ExternalLink,
  Zap,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { apiFetch } from "@/lib/utils"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types matching backend schema
// ---------------------------------------------------------------------------
interface Topic {
  id: number
  name: string
  keywords: string  // JSON string array
  platforms: string | null  // JSON string array or null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Mention {
  id: number
  topic_id: number
  platform: string
  author_name: string | null
  author_handle: string | null
  content: string | null
  url: string | null
  sentiment: string | null
  sentiment_score: number | null
  posted_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseKeywords(raw: string): string[] {
  try {
    return JSON.parse(raw)
  } catch {
    return (raw || "").split(",").map((k) => k.trim()).filter(Boolean)
  }
}

function formatKeywords(raw: string, max = 3): string {
  const keywords = parseKeywords(raw)
  if (keywords.length === 0) return "No keywords"
  const shown = keywords.slice(0, max)
  const rest = keywords.length - max
  return shown.join(", ") + (rest > 0 ? ` +${rest}` : "")
}

function parsePlatforms(raw: string | null): string[] {
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return raw.split(",").map((p) => p.trim()).filter(Boolean)
  }
}

function mentionCountText(count: number) {
  if (count === 0) return "No mentions"
  return `${count.toLocaleString()} mention${count !== 1 ? "s" : ""}`
}

// ---------------------------------------------------------------------------
// API hooks
// ---------------------------------------------------------------------------
function useTopics() {
  return useQuery<Topic[]>({
    queryKey: ["listening-topics"],
    queryFn: () => apiFetch<Topic[]>("/listening/topics"),
  })
}

function useMentions(topicId: number | null) {
  return useQuery<Mention[]>({
    queryKey: ["listening-mentions", topicId],
    queryFn: () => apiFetch<Mention[]>(`/listening/topics/${topicId}/mentions`),
    enabled: topicId !== null,
  })
}

function useScanResult(topicId: number | null) {
  return useQuery<{ scanned: number; created: number }>({
    queryKey: ["listening-scan", topicId],
    queryFn: () => apiFetch<{ scanned: number; created: number }>(`/listening/topics/${topicId}/scan`),
    enabled: !!topicId,
  })
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
// Stats Card
// ---------------------------------------------------------------------------
function StatsCard({
  icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
  loading?: boolean
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
        <div className="flex-1">
          <p className="text-xs text-muted">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-primary">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted" />
              ) : (
                value
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyTopics({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
        <Hash className="h-8 w-8 text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1">No topics yet</h3>
      <p className="text-sm text-muted max-w-xs mb-6">
        Create a topic to start monitoring conversations about your brand, products, or industry.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Topic
      </Button>
    </motion.div>
  )
}

function EmptyMentions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
        <MessageCircle className="h-8 w-8 text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1">No mentions found</h3>
      <p className="text-sm text-muted max-w-xs">
        Mentions will appear here when people talk about your tracked topics.
      </p>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Topic Card
// ---------------------------------------------------------------------------
function TopicCard({ topic, onDelete, onScan, scanning }: {
  topic: Topic
  onDelete: (id: number) => void
  onScan: (id: number) => void
  scanning: boolean
}) {
  const keywords = parseKeywords(topic.keywords)
  const platforms = parsePlatforms(topic.platforms)

  return (
    <motion.div variants={itemVariants}>
      <Card className="transition-all duration-200 hover:border-border-hover">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-primary">{topic.name}</h3>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px]",
                    topic.is_active ? "text-green" : "text-muted"
                  )}
                >
                  {topic.is_active ? "Active" : "Paused"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {keywords.slice(0, 5).map((kw, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-surface-2 text-muted px-1.5 py-0.5 rounded"
                  >
                    {kw}
                  </span>
                ))}
                {keywords.length > 5 && (
                  <span className="text-[10px] text-muted">+{keywords.length - 5}</span>
                )}
              </div>
              <div className="text-[10px] text-muted">
                Created {new Date(topic.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {platforms.length > 0 && (
                <div className="flex -space-x-1">
                  {platforms.slice(0, 3).map((p) => (
                    <div
                      key={p}
                      className="h-7 w-7 rounded-full bg-surface-3 border-2 border-surface-1 flex items-center justify-center"
                      title={p}
                    >
                      <Globe className="h-3 w-3 text-muted" />
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-accent hover:text-accent"
                title="Scan for mentions"
                onClick={() => onScan(topic.id)}
                disabled={scanning}
              >
                <Zap className={cn("h-3.5 w-3.5", scanning && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted hover:text-red"
                onClick={() => onDelete(topic.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Mention Card
// ---------------------------------------------------------------------------
function MentionCard({ mention }: { mention: Mention }) {
  const sentimentColors: Record<string, string> = {
    positive: "text-green",
    negative: "text-red",
    neutral: "text-muted",
  }
  const sentimentBgs: Record<string, string> = {
    positive: "bg-green/10 border-green/20",
    negative: "bg-red/10 border-red/20",
    neutral: "bg-surface-2 border-border",
  }
  const sentiment = mention.sentiment || "neutral"

  return (
    <motion.div variants={itemVariants}>
      <div
        className={cn(
          "rounded-lg border p-4 transition-colors hover:border-border-hover",
          sentimentBgs[sentiment] || sentimentBgs.neutral
        )}
      >
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white text-[10px] font-bold">
            {(mention.author_name || "?")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-medium text-primary">{mention.author_name || "Unknown"}</span>
              {mention.author_handle && (
                <span className="text-[10px] text-muted">{mention.author_handle}</span>
              )}
              {mention.platform && mention.platform !== "manual" && (
                <>
                  <span className="text-[10px] text-muted">·</span>
                  <span className="text-[10px] text-muted">{mention.platform}</span>
                </>
              )}
              <Badge
                variant="secondary"
                className={cn("text-[10px]", sentimentColors[sentiment] || "text-muted")}
              >
                {sentiment}
              </Badge>
            </div>
            <p className="text-xs text-secondary mb-2">{mention.content || "No content"}</p>
            <div className="flex items-center gap-3 text-[10px] text-muted">
              <span>{mention.posted_at ? new Date(mention.posted_at).toLocaleString() : "Recent"}</span>
              {mention.url && (
                <a
                  href={mention.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Add Topic Dialog
// ---------------------------------------------------------------------------
function AddTopicDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [keywordsStr, setKeywordsStr] = useState("")

  const mutation = useMutation({
    mutationFn: (data: { name: string; keywords: string }) =>
      apiFetch("/listening/topics", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setName("")
      setKeywordsStr("")
      onCreated()
      onClose()
    },
  })

  const handleSubmit = () => {
    if (!name.trim()) return
    const keywords = keywordsStr
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
    mutation.mutate({
      name: name.trim(),
      keywords: JSON.stringify(keywords),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Listening Topic</DialogTitle>
          <DialogDescription>
            Define a topic to monitor across social platforms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Topic Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Product Launch"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Keywords</label>
            <Input
              value={keywordsStr}
              onChange={(e) => setKeywordsStr(e.target.value)}
              placeholder="socialpulses, @socialpulses, #socialpulses"
            />
            <p className="text-xs text-muted">
              Separate keywords with commas. After creating, use the Zap icon to scan published posts.
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            className="gap-2"
            onClick={handleSubmit}
            disabled={mutation.isPending || !name.trim()}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {mutation.isPending ? "Creating..." : "Create Topic"}
          </Button>
        </DialogFooter>
        {mutation.isError && (
          <p className="text-xs text-red text-center">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Failed to create topic"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// ListeningPage
// ---------------------------------------------------------------------------
export function ListeningPage() {
  const qc = useQueryClient()
  const [topicDialogOpen, setTopicDialogOpen] = useState(false)
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [scanningTopicId, setScanningTopicId] = useState<number | null>(null)

  const topicsQuery = useTopics()
  const mentionsQuery = useMentions(selectedTopicId)

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/listening/topics/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listening-topics"] })
      if (selectedTopicId) {
        qc.invalidateQueries({ queryKey: ["listening-mentions", selectedTopicId] })
      }
    },
  })

  const scanMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ scanned: number; created: number }>(`/listening/topics/${id}/scan`, { method: "POST" }),
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: ["listening-mentions", id] })
    },
    onSettled: () => {
      setScanningTopicId(null)
    },
  })

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id)
  }

  const handleScan = (id: number) => {
    setScanningTopicId(id)
    scanMutation.mutate(id)
  }

  const topics = topicsQuery.data || []
  const mentions = mentionsQuery.data || []

  const filteredMentions = mentions.filter(
    (m) =>
      (m.content || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.author_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalMentions = mentions.length
  const positiveMentions = mentions.filter((m) => m.sentiment === "positive").length
  const negativeMentions = mentions.filter((m) => m.sentiment === "negative").length

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6 pb-12"
    >
      {/* ── Page Header ── */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Listening</h1>
        <p className="text-sm text-muted mt-1">
          Monitor conversations about your brand across social platforms
        </p>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          icon={<Radio className="h-5 w-5 text-accent" />}
          label="Topics Tracked"
          value={topics.length}
          color="bg-accent/10"
          loading={topicsQuery.isLoading}
        />
        <StatsCard
          icon={<MessageCircle className="h-5 w-5 text-accent" />}
          label="Total Mentions"
          value={mentions.length.toLocaleString()}
          color="bg-accent/10"
          loading={mentionsQuery.isLoading}
        />
        <StatsCard
          icon={<Heart className="h-5 w-5 text-green" />}
          label="Positive"
          value={positiveMentions}
          color="bg-green/10"
        />
        <StatsCard
          icon={<MessageSquare className="h-5 w-5 text-red" />}
          label="Negative"
          value={negativeMentions}
          color="bg-red/10"
        />
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div variants={itemVariants}>
        <Tabs
          defaultValue="topics"
          onValueChange={(val) => {
            if (val === "mentions" && topics.length > 0 && !selectedTopicId) {
              setSelectedTopicId(topics[0].id)
            }
          }}
          className="w-full"
        >
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="topics" className="gap-2">
                <Hash className="h-4 w-4" />
                Topics
              </TabsTrigger>
              <TabsTrigger value="mentions" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Mentions
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Topics Tab ── */}
          <TabsContent value="topics" className="mt-0">
            <div className="flex items-center justify-end mb-4">
              <Button onClick={() => setTopicDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Topic
              </Button>
            </div>

            {topicsQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted" />
              </div>
            ) : topics.length === 0 ? (
              <EmptyTopics onAdd={() => setTopicDialogOpen(true)} />
            ) : (
              <div className="space-y-2">
                {topics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    onDelete={handleDelete}
                    onScan={handleScan}
                    scanning={scanningTopicId === topic.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Mentions Tab ── */}
          <TabsContent value="mentions" className="mt-0">
            {topics.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-muted shrink-0">Topic:</span>
                <select
                  className="text-sm bg-surface-1 border border-border rounded-lg px-3 py-1.5 text-primary"
                  value={selectedTopicId ?? topics[0]?.id ?? ""}
                  onChange={(e) => setSelectedTopicId(Number(e.target.value))}
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <Input
                  placeholder="Search mentions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="secondary" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>

            {mentionsQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted" />
              </div>
            ) : filteredMentions.length === 0 ? (
              <EmptyMentions />
            ) : (
              <div className="space-y-2">
                {filteredMentions.map((mention) => (
                  <MentionCard key={mention.id} mention={mention} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Add Topic Dialog ── */}
      <AddTopicDialog
        open={topicDialogOpen}
        onClose={() => setTopicDialogOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["listening-topics"] })}
      />
    </motion.div>
  )
}
