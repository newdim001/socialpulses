import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Rss, Plus, Trash2, ExternalLink, Globe, RefreshCw, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

interface RssFeed {
  id: number
  name: string
  url: string
  category: string | null
  last_fetched_at: string | null
  is_active: boolean
  item_count: number
  created_at: string
}

interface RssFeedItem {
  id: number
  feed_id: number
  title: string
  link: string
  description: string | null
  pub_date: string | null
  guid: string
  is_read: boolean
  is_posted: boolean
  created_at: string
}

function FeedsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function RssFeedsPage() {
  const [feeds, setFeeds] = useState<RssFeed[]>([])
  const [itemsMap, setItemsMap] = useState<Record<number, RssFeedItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [fetchingFeeds, setFetchingFeeds] = useState<Set<number>>(new Set())
  const [expandedFeed, setExpandedFeed] = useState<number | null>(null)
  const [itemsLoading, setItemsLoading] = useState<Set<number>>(new Set())

  const [formName, setFormName] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formCategory, setFormCategory] = useState("")

  const fetchFeeds = async () => {
    try {
      const data = await apiFetch<RssFeed[]>("/rss-feeds")
      setFeeds(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchFeeds() }, [])

  const openNewDialog = () => {
    setFormName("")
    setFormUrl("")
    setFormCategory("")
    setDialogOpen(true)
  }

  const handleAddFeed = async () => {
    if (!formName.trim() || !formUrl.trim()) return
    try {
      await apiFetch("/rss-feeds", {
        method: "POST",
        body: JSON.stringify({ name: formName.trim(), url: formUrl.trim(), category: formCategory.trim() || null }),
      })
      await fetchFeeds()
      setDialogOpen(false)
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/rss-feeds/${id}`, { method: "DELETE" })
      await fetchFeeds()
      setItemsMap((prev) => { const m = { ...prev }; delete m[id]; return m })
    } catch { /* ignore */ }
    setDeleteConfirm(null)
  }

  const handleFetch = async (feedId: number) => {
    setFetchingFeeds((prev) => new Set(prev).add(feedId))
    try {
      await apiFetch(`/rss-feeds/${feedId}/fetch`, { method: "POST" })
      await fetchFeeds()
      if (expandedFeed === feedId) {
        await loadItems(feedId)
      }
    } catch { /* ignore */ }
    setFetchingFeeds((prev) => { const s = new Set(prev); s.delete(feedId); return s })
  }

  const loadItems = async (feedId: number) => {
    setItemsLoading((prev) => new Set(prev).add(feedId))
    try {
      const data = await apiFetch<RssFeedItem[]>(`/rss-feeds/${feedId}/items`)
      setItemsMap((prev) => ({ ...prev, [feedId]: data }))
    } catch { /* ignore */ }
    setItemsLoading((prev) => { const s = new Set(prev); s.delete(feedId); return s })
  }

  const toggleExpand = (feedId: number) => {
    if (expandedFeed === feedId) {
      setExpandedFeed(null)
    } else {
      setExpandedFeed(feedId)
      if (!itemsMap[feedId]) loadItems(feedId)
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 pb-12"
    >
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">RSS Feeds</h1>
          <p className="text-sm text-muted mt-1">
            Import content from RSS/Atom feeds and turn them into social posts
          </p>
        </div>
        <Button onClick={openNewDialog} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add Feed
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        {loading ? (
          <FeedsSkeleton />
        ) : feeds.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-14 w-14 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
                <Rss className="h-7 w-7 text-muted" />
              </div>
              <p className="text-sm font-medium text-primary mb-1">No RSS feeds yet</p>
              <p className="text-xs text-muted mb-5">
                Add an RSS feed to automatically import articles and create posts
              </p>
              <Button onClick={openNewDialog} variant="secondary" size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Add Your First Feed
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {feeds.map((feed) => (
              <div key={feed.id}>
                <Card
                  className={`transition-colors cursor-pointer hover:border-border-hover ${expandedFeed === feed.id ? "border-accent/40" : ""}`}
                  onClick={() => toggleExpand(feed.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-accent shrink-0" />
                          <h3 className="text-sm font-semibold text-primary truncate">{feed.name}</h3>
                        </div>
                        <p className="text-xs text-muted truncate">{feed.url}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">
                            {feed.item_count} items
                          </Badge>
                          {feed.category && (
                            <Badge variant="info" className="text-[10px]">{feed.category}</Badge>
                          )}
                          {feed.last_fetched_at ? (
                            <span className="text-[10px] text-muted">
                              Fetched {new Date(feed.last_fetched_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber">Not fetched yet</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleFetch(feed.id)}
                          disabled={fetchingFeeds.has(feed.id)}
                          title="Fetch now"
                        >
                          {fetchingFeeds.has(feed.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted hover:text-red"
                          onClick={() => setDeleteConfirm(feed.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded items */}
                    {expandedFeed === feed.id && (
                      <div className="mt-4 pt-4 border-t border-border space-y-2" onClick={(e) => e.stopPropagation()}>
                        {itemsLoading.has(feed.id) ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted" />
                          </div>
                        ) : !itemsMap[feed.id] || itemsMap[feed.id].length === 0 ? (
                          <p className="text-xs text-muted text-center py-4">
                            No items yet. Click refresh to fetch.
                          </p>
                        ) : (
                          itemsMap[feed.id].slice(0, 10).map((item) => (
                            <div key={item.id} className="rounded-lg border border-border bg-surface-2/50 p-3 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-medium text-primary leading-snug flex-1">
                                  {item.title || "Untitled"}
                                </p>
                                <div className="flex items-center gap-1 shrink-0">
                                  {item.link && (
                                    <a
                                      href={item.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-6 w-6 rounded flex items-center justify-center text-muted hover:text-accent transition-colors"
                                      title="Open link"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                              {item.description && (
                                <p className="text-[10px] text-secondary line-clamp-2">{item.description}</p>
                              )}
                              <div className="flex items-center gap-2">
                                {item.pub_date && (
                                  <span className="text-[10px] text-muted">
                                    {new Date(item.pub_date).toLocaleDateString()}
                                  </span>
                                )}
                                {item.is_posted && (
                                  <Badge variant="success" className="text-[10px]">Posted</Badge>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Add Feed Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add RSS Feed</DialogTitle>
            <DialogDescription>Enter an RSS or Atom feed URL to start importing content.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="feed-name">Name</Label>
              <Input id="feed-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., TechCrunch" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feed-url">Feed URL</Label>
              <Input id="feed-url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://example.com/rss" type="url" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feed-category">Category (optional)</Label>
              <Input id="feed-category" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g., Tech News" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddFeed} disabled={!formName.trim() || !formUrl.trim()}>
              Add Feed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-red" /> Delete Feed</DialogTitle>
            <DialogDescription>This will remove the feed and all its items. Are you sure?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="gap-2">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
