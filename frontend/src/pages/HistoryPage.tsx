import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  Clock,
  Search,
  Filter,
  ChevronDown,
  MessageSquare,
  Globe,
  Smartphone,
  MessageCircle,
} from "lucide-react"
import { apiFetch, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PostAccount {
  social_account_id: number
  platform_name: string
  platform_username: string
  status: string
  platform_post_id: string | null
  error_message: string | null
}

interface Post {
  id: number
  content: string
  status: "scheduled" | "published" | "draft" | "failed"
  scheduled_at?: string | null
  published_at?: string | null
  created_at: string
  post_accounts: PostAccount[]
}

interface PostsResponse {
  posts: Post[]
  total: number
  offset: number
  limit: number
}

// ---------------------------------------------------------------------------
// Fetch posts with pagination and filters
// ---------------------------------------------------------------------------
async function fetchPosts(params: {
  offset: number
  limit: number
  status?: string
  search?: string
}): Promise<PostsResponse> {
  const searchParams = new URLSearchParams()
  searchParams.set("offset", String(params.offset))
  // Fetch limit+1 to detect if there are more
  searchParams.set("limit", String(params.limit + 1))
  if (params.status && params.status !== "all")
    searchParams.set("status", params.status)
  if (params.search) searchParams.set("search", params.search)
  const data = await apiFetch<Post[]>(`/posts?${searchParams.toString()}`)
  const hasMore = data.length > params.limit
  if (hasMore) data.pop()
  return {
    posts: data,
    total: params.offset + data.length + (hasMore ? 1 : 0),
    offset: params.offset,
    limit: params.limit,
  }
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------
const statusConfig: Record<
  Post["status"],
  { label: string; variant: "info" | "success" | "warning" | "danger" }
> = {
  scheduled: { label: "Scheduled", variant: "info" },
  published: { label: "Published", variant: "success" },
  draft: { label: "Draft", variant: "warning" },
  failed: { label: "Failed", variant: "danger" },
}

// ---------------------------------------------------------------------------
// Platform icon
// ---------------------------------------------------------------------------
function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase()
  if (p.includes("twitter") || p.includes("x"))
    return <MessageCircle className="h-4 w-4 shrink-0" />
  if (p.includes("facebook")) return <Globe className="h-4 w-4 shrink-0" />
  if (p.includes("instagram")) return <Smartphone className="h-4 w-4 shrink-0" />
  return <MessageSquare className="h-4 w-4 shrink-0" />
}

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------
function PostListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <div className="p-4 flex items-center gap-4">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
        </Card>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean
  onClear: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
        <Clock className="h-8 w-8 text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1">
        {hasFilters ? "No posts match your filters" : "No posts yet"}
      </h3>
      <p className="text-sm text-muted max-w-xs mb-6">
        {hasFilters
          ? "Try adjusting your search or filter criteria."
          : "Your published and scheduled posts will appear here."}
      </p>
      {hasFilters && (
        <Button variant="secondary" onClick={onClear}>
          Clear Filters
        </Button>
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------
function FilterBar({
  status,
  search,
  onStatusChange,
  onSearchChange,
  onClear,
}: {
  status: string
  search: string
  onStatusChange: (s: string) => void
  onSearchChange: (s: string) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
      {/* Status dropdown */}
      <div className="relative">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-10 rounded-lg border border-border bg-surface-3 px-3 pr-8 text-sm text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-0"
        >
          <option value="all">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="failed">Failed</option>
        </select>
        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
      </div>

      {/* Search */}
      <div className="relative flex-1 w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <Input
          placeholder="Search posts…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Clear */}
      {(status !== "all" || search) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Post row (desktop) / card (mobile)
// ---------------------------------------------------------------------------
function PostRow({ post }: { post: Post }) {
  const cfg = statusConfig[post.status]
  const date = post.published_at ?? post.scheduled_at ?? post.created_at
  const platforms = post.post_accounts?.map(a => a.platform_name).join(", ") || "unknown"

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.2 }}
    >
      {/* Desktop: table-like row */}
      <div className="hidden md:flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-surface-1 hover:bg-surface-2 transition-colors">
        <PlatformIcon platform={platforms} />
        <p className="flex-1 text-sm text-primary truncate min-w-0">
          {post.content.length > 100
            ? post.content.slice(0, 100) + "..."
            : post.content}
        </p>
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
        <span className="text-xs text-muted whitespace-nowrap shrink-0">
          {formatDate(date)}
        </span>
      </div>

      {/* Mobile: card */}
      <Card className="md:hidden">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-primary flex-1 line-clamp-2">
              {post.content}
            </p>
            <Badge variant={cfg.variant} className="shrink-0">
              {cfg.label}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <PlatformIcon platform={platforms} />
              <span>{platforms}</span>
            </div>
            <span>{formatDate(date)}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// HistoryPage
// ---------------------------------------------------------------------------
export function HistoryPage() {
  const [status, setStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [offset, setOffset] = useState(0)
  const limit = 20
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setOffset(0)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", offset, limit, status, debouncedSearch],
    queryFn: () =>
      fetchPosts({ offset, limit, status, search: debouncedSearch }),
    placeholderData: (prev) => prev,
  })

  const posts = data?.posts ?? []
  const total = data?.total ?? 0
  const hasMore = offset + limit < total

  const handleClear = () => {
    setStatus("all")
    setSearch("")
    setDebouncedSearch("")
    setOffset(0)
  }

  const handleLoadMore = () => {
    setOffset((o) => o + limit)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary tracking-tight">
          Post History
        </h1>
        <p className="text-sm text-muted mt-1">
          Browse and filter all your published, scheduled, and draft posts
        </p>
      </div>

      {/* Filter bar */}
      <FilterBar
        status={status}
        search={search}
        onStatusChange={(s) => {
          setStatus(s)
          setOffset(0)
        }}
        onSearchChange={setSearch}
        onClear={handleClear}
      />

      {/* Content */}
      {isLoading && !data ? (
        <PostListSkeleton />
      ) : error ? (
        <div className="rounded-xl border border-red/20 bg-red/10 p-4 text-sm text-red">
          Failed to load posts. Please try again.
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          hasFilters={status !== "all" || search !== ""}
          onClear={handleClear}
        />
      ) : (
        <>
          {/* Results count */}
          <p className="text-xs text-muted mb-3">
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}{" "}
            posts
          </p>

          {/* Post list */}
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {posts.map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </div>
          </AnimatePresence>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="secondary"
                onClick={handleLoadMore}
                className="gap-2"
              >
                <ChevronDown className="h-4 w-4" />
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
