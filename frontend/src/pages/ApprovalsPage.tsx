import { useState } from "react"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  FileEdit,
  User,
  CalendarDays,
  MessageSquare,
  Globe,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Send,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ApprovalRequest {
  id: string
  title: string
  content_preview: string
  author: string
  author_avatar?: string
  platform: string
  status: "pending" | "approved" | "rejected"
  submitted_at: string
  reviewed_at?: string
  reviewer?: string
  scheduled_at?: string
  feedback?: string
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const initialRequests: ApprovalRequest[] = [
  {
    id: "1",
    title: "Product Launch Announcement",
    content_preview: "We're thrilled to announce the launch of our new AI-powered analytics platform! 🚀...",
    author: "Sarah Johnson",
    platform: "twitter",
    status: "pending",
    submitted_at: "2026-05-15T09:00:00Z",
    scheduled_at: "2026-05-18T10:00:00Z",
  },
  {
    id: "2",
    title: "Weekly Tips Thread",
    content_preview: "This week's tips for maximizing your social media engagement: 1. Post consistently...",
    author: "Mike Chen",
    platform: "linkedin",
    status: "pending",
    submitted_at: "2026-05-14T14:30:00Z",
    scheduled_at: "2026-05-17T12:00:00Z",
  },
  {
    id: "3",
    title: "Customer Spotlight: TechCorp",
    content_preview: "We're proud to feature TechCorp this month! Their team has achieved outstanding...",
    author: "Emily Davis",
    platform: "instagram",
    status: "pending",
    submitted_at: "2026-05-14T11:00:00Z",
  },
  {
    id: "4",
    title: "Hiring Announcement",
    content_preview: "We're looking for a Senior React Developer to join our growing team! If you're...",
    author: "Sarah Johnson",
    platform: "linkedin",
    status: "approved",
    submitted_at: "2026-05-12T16:00:00Z",
    reviewed_at: "2026-05-13T09:30:00Z",
    reviewer: "Alex Turner",
    scheduled_at: "2026-05-16T09:00:00Z",
  },
  {
    id: "5",
    title: "Industry Report Share",
    content_preview: "Our latest industry report is out! Key findings show that video content continues...",
    author: "Mike Chen",
    platform: "facebook",
    status: "rejected",
    submitted_at: "2026-05-11T08:00:00Z",
    reviewed_at: "2026-05-12T10:00:00Z",
    reviewer: "Alex Turner",
    feedback: "Please update the statistics with the latest numbers from Q2 report.",
  },
]

const approvalHistory: ApprovalRequest[] = [
  {
    id: "4",
    title: "Hiring Announcement",
    content_preview: "We're looking for a Senior React Developer...",
    author: "Sarah Johnson",
    platform: "linkedin",
    status: "approved",
    submitted_at: "2026-05-12T16:00:00Z",
    reviewed_at: "2026-05-13T09:30:00Z",
    reviewer: "Alex Turner",
    scheduled_at: "2026-05-16T09:00:00Z",
  },
  {
    id: "5",
    title: "Industry Report Share",
    content_preview: "Our latest industry report is out!...",
    author: "Mike Chen",
    platform: "facebook",
    status: "rejected",
    submitted_at: "2026-05-11T08:00:00Z",
    reviewed_at: "2026-05-12T10:00:00Z",
    reviewer: "Alex Turner",
    feedback: "Please update the statistics with the latest numbers from Q2 report.",
  },
  {
    id: "6",
    title: "Weekend Engagement Post",
    content_preview: "Happy Friday! What's your favorite social media tool? Tell us in the comments...",
    author: "Emily Davis",
    platform: "instagram",
    status: "approved",
    submitted_at: "2026-05-09T13:00:00Z",
    reviewed_at: "2026-05-10T08:00:00Z",
    reviewer: "Alex Turner",
    scheduled_at: "2026-05-12T17:00:00Z",
  },
  {
    id: "7",
    title: "Partnership Announcement Draft",
    content_preview: "We're excited to announce our strategic partnership with DataFlow Inc...",
    author: "Sarah Johnson",
    platform: "twitter",
    status: "rejected",
    submitted_at: "2026-05-07T10:00:00Z",
    reviewed_at: "2026-05-08T11:00:00Z",
    reviewer: "Alex Turner",
    feedback: "Legal team needs to review the partnership wording before publishing.",
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
// Helpers
// ---------------------------------------------------------------------------
function getPlatformBadge(platform: string) {
  const map: Record<string, string> = {
    twitter: "from-sky-400 to-blue-500",
    facebook: "from-blue-500 to-blue-600",
    instagram: "from-pink-500 to-orange-500",
    linkedin: "from-blue-600 to-blue-700",
  }
  return map[platform.toLowerCase()] ?? "from-accent to-purple"
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyPending() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
        <CheckCircle2 className="h-8 w-8 text-green" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1">All caught up!</h3>
      <p className="text-sm text-muted max-w-xs">
        There are no pending approval requests. New submissions will appear here.
      </p>
    </motion.div>
  )
}

function EmptyHistory() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
        <Clock className="h-8 w-8 text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1">No approval history</h3>
      <p className="text-sm text-muted max-w-xs">
        Approved and rejected submissions will appear here.
      </p>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Approval Card
// ---------------------------------------------------------------------------
function ApprovalCard({
  request,
  onApprove,
  onReject,
  showActions,
}: {
  request: ApprovalRequest
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  showActions: boolean
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="transition-all duration-200 hover:border-border-hover">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-sm font-semibold text-primary">{request.title}</h3>
                <Badge
                  variant={
                    request.status === "approved"
                      ? "success"
                      : request.status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  {request.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-0.5" />}
                  {request.status === "rejected" && <XCircle className="h-3 w-3 mr-0.5" />}
                  {request.status}
                </Badge>
              </div>
              <p className="text-xs text-secondary line-clamp-2 mb-3">{request.content_preview}</p>
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {request.author}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {request.platform}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(request.submitted_at).toLocaleDateString()}
                </span>
                {request.scheduled_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Scheduled: {new Date(request.scheduled_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              {request.feedback && (
                <div className="mt-3 rounded-lg border border-amber/20 bg-amber/5 p-2.5 text-xs text-amber flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{request.feedback}</span>
                </div>
              )}
              {request.reviewer && request.reviewed_at && (
                <p className="mt-2 text-[10px] text-muted">
                  Reviewed by {request.reviewer} on {new Date(request.reviewed_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <div
              className={cn(
                "h-10 w-10 shrink-0 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold",
                getPlatformBadge(request.platform)
              )}
            >
              {getInitials(request.author)}
            </div>
          </div>

          {showActions && request.status === "pending" && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-red border-red/30 hover:bg-red/10 hover:text-red"
                  onClick={() => onReject?.(request.id)}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onApprove?.(request.id)}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Approve
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
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
// ApprovalsPage
// ---------------------------------------------------------------------------
export function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(initialRequests)
  const [searchQuery, setSearchQuery] = useState("")

  const pendingRequests = requests.filter((r) => r.status === "pending")
  const approvedCount = requests.filter((r) => r.status === "approved").length
  const rejectedCount = requests.filter((r) => r.status === "rejected").length

  const filteredPending = pendingRequests.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "approved" as const, reviewed_at: new Date().toISOString(), reviewer: "You" }
          : r
      )
    )
  }

  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "rejected" as const, reviewed_at: new Date().toISOString(), reviewer: "You" }
          : r
      )
    )
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
        <h1 className="text-2xl font-bold text-primary tracking-tight">Approvals</h1>
        <p className="text-sm text-muted mt-1">
          Review and approve content before it goes live
        </p>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          icon={<Clock className="h-5 w-5 text-amber" />}
          label="Pending"
          value={pendingRequests.length}
          color="bg-amber/10"
        />
        <StatsCard
          icon={<CheckCircle2 className="h-5 w-5 text-green" />}
          label="Approved"
          value={approvedCount}
          color="bg-green/10"
        />
        <StatsCard
          icon={<XCircle className="h-5 w-5 text-red" />}
          label="Rejected"
          value={rejectedCount}
          color="bg-red/10"
        />
        <StatsCard
          icon={<FileEdit className="h-5 w-5 text-accent" />}
          label="Total Submissions"
          value={requests.length}
          color="bg-accent/10"
        />
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="pending" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending Approvals
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Approval History
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Pending Tab ── */}
          <TabsContent value="pending" className="mt-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <Input
                  placeholder="Search pending requests..."
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

            {filteredPending.length === 0 ? (
              <EmptyPending />
            ) : (
              <div className="space-y-3">
                {filteredPending.map((req) => (
                  <ApprovalCard
                    key={req.id}
                    request={req}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    showActions
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── History Tab ── */}
          <TabsContent value="history" className="mt-0">
            {approvalHistory.length === 0 ? (
              <EmptyHistory />
            ) : (
              <div className="space-y-3">
                {approvalHistory.map((req) => (
                  <ApprovalCard
                    key={req.id}
                    request={req}
                    showActions={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
