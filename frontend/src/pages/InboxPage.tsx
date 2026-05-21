import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageSquare,
  Send,
  Search,
  Loader2,
  ChevronLeft,
  Paperclip,
  User,
  Inbox,
  Clock,
  Sparkles,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { apiFetch, cn, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

// ---------------------------------------------------------------------------
// Types (match backend API schema)
// ---------------------------------------------------------------------------
interface Conversation {
  id: number
  platform: string
  participant_name: string
  participant_avatar: string | null
  participant_username: string
  subject: string
  last_message_at: string
  last_message_preview: string
  is_read: boolean
  is_archived: boolean
  message_count: number
  unread_count: number
  created_at: string
}

interface APIMessage {
  id: number
  content: string
  direction: "incoming" | "outgoing"
  author_name: string
  is_read: boolean
  created_at: string
}

interface ConversationDetail {
  id: number
  platform: string
  participant_name: string
  participant_avatar: string | null
  participant_username: string
  subject: string
  is_archived: boolean
  is_assigned: boolean | null
  messages: APIMessage[]
}

interface ReplySuggestion {
  text: string
  tone: string
}

interface ReplySuggestionsResponse {
  suggestions: ReplySuggestion[]
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getPlatformColor(platform: string): string {
  const p = platform.toLowerCase()
  if (p.includes("twitter") || p.includes("x")) return "from-sky-400 to-blue-500"
  if (p.includes("facebook")) return "from-blue-500 to-blue-600"
  if (p.includes("instagram")) return "from-pink-500 to-orange-500"
  if (p.includes("linkedin")) return "from-blue-600 to-blue-700"
  if (p.includes("youtube")) return "from-red-500 to-red-600"
  return "from-accent to-purple"
}

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

function getToneLabel(tone: string): string {
  const map: Record<string, string> = {
    professional: "Professional",
    friendly: "Friendly",
    concise: "Concise",
    casual: "Casual",
    formal: "Formal",
    empathetic: "Empathetic",
  }
  return map[tone] || tone
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function InboxSkeleton() {
  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Conversation list skeleton */}
      <div className="w-full md:w-80 lg:w-96 shrink-0 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-3 w-40 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Messages skeleton */}
      <div className="hidden md:flex flex-1 items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-16 w-16 rounded-2xl mx-auto mb-4" />
          <Skeleton className="h-4 w-48 mx-auto rounded" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyInbox() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
        <Inbox className="h-8 w-8 text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1">Inbox is empty</h3>
      <p className="text-sm text-muted max-w-xs">
        When people reach out to you on your connected platforms, their messages will appear here.
      </p>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
function MessageBubble({ message }: { message: Message }) {
  const isMine = message.direction === "outgoing"
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn("flex", isMine ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] md:max-w-[65%] rounded-2xl px-4 py-2.5",
          isMine
            ? "bg-accent text-white rounded-br-md"
            : "bg-surface-3 text-primary rounded-bl-md"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <p
          className={cn(
            "text-[10px] mt-1",
            isMine ? "text-white/60" : "text-muted"
          )}
        >
          {formatRelativeTime(message.created_at)}
        </p>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Conversation list item
// ---------------------------------------------------------------------------
function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}) {
  const initials = conversation.participant_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <motion.div variants={itemVariants}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-left rounded-xl border p-4 transition-all duration-200",
          isActive
            ? "border-accent/40 bg-accent/5"
            : "border-border bg-surface-1 hover:border-border-hover hover:bg-surface-2"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "h-10 w-10 shrink-0 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold",
              getPlatformColor(conversation.platform)
            )}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-primary truncate">
                {conversation.participant_name}
              </span>
              <span className="text-[10px] text-muted shrink-0">
                {formatRelativeTime(conversation.last_message_at)}
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5 line-clamp-1">
              {conversation.last_message_preview}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {conversation.platform}
              </Badge>
              {!conversation.is_read && (
                <span className="h-2 w-2 rounded-full bg-accent" />
              )}
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// InboxPage
// ---------------------------------------------------------------------------
export function InboxPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["inbox", "conversations"],
    queryFn: () => apiFetch<Conversation[]>("/inbox/conversations"),
  })

  const { data: conversationDetail } = useQuery<ConversationDetail>({
    queryKey: ["inbox", "conversation", selectedId],
    queryFn: () => apiFetch<ConversationDetail>(`/inbox/conversations/${selectedId}`),
    enabled: !!selectedId,
  })

  const replyMutation = useMutation({
    mutationFn: (content: string) =>
      apiFetch(`/inbox/conversations/${selectedId}/reply`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", "conversation", selectedId] })
      queryClient.invalidateQueries({ queryKey: ["inbox", "conversations"] })
      setReplyText("")
    },
  })

  const handleSmartReply = async () => {
    if (!selectedId || !conversationDetail?.messages.length) return
    const lastIncoming = [...conversationDetail.messages]
      .reverse()
      .find((m) => m.direction === "incoming")
    if (!lastIncoming) return

    setIsLoadingSuggestions(true)
    setShowSuggestions(true)
    setSuggestions([])
    try {
      const data = await apiFetch<ReplySuggestionsResponse>("/ai/reply-suggestions", {
        method: "POST",
        body: JSON.stringify({ message: lastIncoming.content, count: 3 }),
      })
      setSuggestions(data.suggestions)
      toast.success("Reply suggestions ready")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to get suggestions")
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  const handleSendReply = () => {
    const text = replyText.trim()
    if (!text || !selectedId) return
    replyMutation.mutate(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendReply()
    }
  }

  const filteredConversations = conversations?.filter((c) =>
    c.participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedConversation = conversations?.find((c) => String(c.id) === selectedId)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-6 pb-12"
    >
      {/* ── Header ── */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl font-bold text-primary tracking-tight">Inbox</h1>
        <p className="text-sm text-muted mt-1">
          Manage conversations across all your platforms
        </p>
      </div>

      {isLoading ? (
        <InboxSkeleton />
      ) : !conversations || conversations.length === 0 ? (
        <EmptyInbox />
      ) : (
        <div className="flex h-[calc(100vh-12rem)] gap-4">
          {/* ── Conversation List ── */}
          <div
            className={cn(
              "w-full md:w-80 lg:w-96 shrink-0 flex flex-col",
              selectedId && "hidden md:flex"
            )}
          >
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Conversation list */}
            <ScrollArea className="flex-1 -mr-2 pr-2">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-2"
              >
                {(filteredConversations ?? conversations).map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === selectedId}
                    onClick={() => setSelectedId(String(conv.id))}
                  />
                ))}
                {filteredConversations && filteredConversations.length === 0 && (
                  <p className="text-sm text-muted text-center py-8">
                    No conversations match your search
                  </p>
                )}
              </motion.div>
            </ScrollArea>
          </div>

          {/* ── Messages Panel ── */}
          <div
            className={cn(
              "flex-1 flex flex-col",
              !selectedId && "hidden md:flex"
            )}
          >
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-8 w-8 text-muted" />
                  </div>
                  <h3 className="text-lg font-semibold text-primary mb-1">
                    Select a conversation
                  </h3>
                  <p className="text-sm text-muted">
                    Choose a conversation from the list to start reading
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Messages header */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedId(null)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold",
                      getPlatformColor(selectedConversation?.platform ?? "")
                    )}
                  >
                    {selectedConversation?.participant_name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">
                      {selectedConversation?.participant_name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted">
                      {selectedConversation?.platform ?? ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedConversation?.platform ?? ""}
                  </Badge>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={handleSmartReply}
                    disabled={isLoadingSuggestions}
                    className="h-8 w-8 shrink-0"
                    title="Smart Reply"
                  >
                    {isLoadingSuggestions ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 -mx-2 px-2">
                  <div className="space-y-3 pb-4">
                    {conversationDetail?.messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full py-12">
                        <p className="text-sm text-muted">
                          No messages in this conversation yet
                        </p>
                      </div>
                    ) : (
                      conversationDetail?.messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Smart Reply Suggestions */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -4, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 pb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3" />
                            Smart Replies
                          </span>
                          <button
                            type="button"
                            onClick={() => { setShowSuggestions(false); setSuggestions([]) }}
                            className="h-5 w-5 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-surface-2 transition-all"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {suggestions.map((s, i) => (
                            <motion.button
                              key={i}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.06 }}
                              type="button"
                              onClick={() => {
                                setReplyText(s.text)
                                setShowSuggestions(false)
                                setSuggestions([])
                                toast.success("Suggestion applied")
                              }}
                              className="text-xs text-left rounded-lg border border-border bg-surface-2 px-3 py-2 hover:border-accent/30 hover:bg-accent/[0.03] transition-all duration-200 max-w-[200px]"
                            >
                              <span className="text-[10px] text-accent font-medium block mb-0.5">
                                {getToneLabel(s.tone)}
                              </span>
                              <span className="text-primary line-clamp-2 leading-snug">
                                {s.text}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Reply bar */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Type your reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-2 bottom-1/2 translate-y-1/2 text-muted hover:text-secondary transition-colors"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                    </div>
                    <Button
                      size="icon"
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || replyMutation.isPending}
                    >
                      {replyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted mt-1.5">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
