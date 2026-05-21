import { useState } from "react"
import { motion } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  MessageSquare,
  Plus,
  Search,
  Copy,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Hash,
} from "lucide-react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { apiFetch } from "@/lib/utils"

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

interface SavedReplyOut {
  id: number
  client_id: number
  title: string
  content: string
  shortcut: string | null
  category: string | null
  created_at: string
  updated_at: string
}

const categories = ["General", "Support", "Sales", "Feedback", "Other"]

function SavedRepliesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function SavedRepliesPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReply, setEditingReply] = useState<SavedReplyOut | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const [formTitle, setFormTitle] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formShortcut, setFormShortcut] = useState("")
  const [formCategory, setFormCategory] = useState("General")

  const { data: replies, isLoading } = useQuery<SavedReplyOut[]>({
    queryKey: ["saved-replies"],
    queryFn: () => apiFetch<SavedReplyOut[]>("/saved-replies"),
  })

  const createMutation = useMutation({
    mutationFn: (body: {
      title: string
      content: string
      shortcut?: string
      category?: string
    }) =>
      apiFetch<SavedReplyOut>("/saved-replies", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-replies"] })
      toast.success("Saved reply created")
      setDialogOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number
      title: string
      content: string
      shortcut?: string
      category?: string
    }) =>
      apiFetch<SavedReplyOut>(`/saved-replies/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-replies"] })
      toast.success("Saved reply updated")
      setDialogOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/saved-replies/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-replies"] })
      toast.success("Saved reply deleted")
      setDeleteConfirm(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const filteredReplies = (replies || []).filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.shortcut || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openNewDialog = () => {
    setEditingReply(null)
    setFormTitle("")
    setFormContent("")
    setFormShortcut("")
    setFormCategory("General")
    setDialogOpen(true)
  }

  const openEditDialog = (reply: SavedReplyOut) => {
    setEditingReply(reply)
    setFormTitle(reply.title)
    setFormContent(reply.content)
    setFormShortcut(reply.shortcut || "")
    setFormCategory(reply.category || "General")
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!formTitle.trim() || !formContent.trim()) return
    const body: {
      title: string
      content: string
      shortcut?: string
      category?: string
    } = {
      title: formTitle.trim(),
      content: formContent.trim(),
    }
    if (formShortcut.trim()) body.shortcut = formShortcut.trim()
    if (formCategory) body.category = formCategory

    if (editingReply) {
      updateMutation.mutate({ id: editingReply.id, ...body })
    } else {
      createMutation.mutate(body)
    }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(content.slice(0, 20))
    setTimeout(() => setCopiedId(null), 2000)
    toast.success("Copied to clipboard")
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 pb-12"
    >
      <motion.div
        variants={itemVariants}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            Saved Replies
          </h1>
          <p className="text-sm text-muted mt-1">
            Reusable reply templates for quick responses
          </p>
        </div>
        <Button onClick={openNewDialog} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New Reply
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search replies..."
            className="pl-10"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        {isLoading ? (
          <SavedRepliesSkeleton />
        ) : filteredReplies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-14 w-14 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
                <MessageSquare className="h-7 w-7 text-muted" />
              </div>
              <p className="text-sm font-medium text-primary mb-1">
                {searchQuery
                  ? "No replies match your search"
                  : "No saved replies yet"}
              </p>
              <p className="text-xs text-muted mb-5">
                {searchQuery
                  ? "Try a different search term"
                  : "Create your first saved reply template"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={openNewDialog}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Reply
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredReplies.map((reply) => (
              <Card
                key={reply.id}
                className="transition-colors hover:border-border-hover"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-primary">
                          {reply.title}
                        </h3>
                        {reply.shortcut && (
                          <Badge variant="secondary" className="text-[10px]">
                            /{reply.shortcut}
                          </Badge>
                        )}
                        {reply.category && (
                          <Badge variant="purple" className="text-[10px]">
                            {reply.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-secondary leading-relaxed line-clamp-2">
                        {reply.content}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-muted">
                        <Clock className="h-3 w-3" />
                        Updated{" "}
                        {new Date(reply.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopy(reply.content)}
                        title="Copy to clipboard"
                      >
                        {copiedId === reply.content.slice(0, 20) ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(reply)}
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted hover:text-red"
                        onClick={() => setDeleteConfirm(reply.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReply ? "Edit Saved Reply" : "New Saved Reply"}
            </DialogTitle>
            <DialogDescription>
              {editingReply
                ? "Update your reply template below"
                : "Create a reusable reply template"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reply-title">Title</Label>
              <Input
                id="reply-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Thank you response"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply-content">Content</Label>
              <Textarea
                id="reply-content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Type your reply template here..."
                className="min-h-[120px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reply-shortcut">Shortcut</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <Input
                    id="reply-shortcut"
                    value={formShortcut}
                    onChange={(e) => setFormShortcut(e.target.value)}
                    placeholder="e.g., ty"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reply-category">Category</Label>
                <select
                  id="reply-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border bg-surface-3 px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={!formTitle.trim() || !formContent.trim() || isSaving}
            >
              {isSaving
                ? "Saving..."
                : editingReply
                  ? "Save Changes"
                  : "Create Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red" /> Delete Saved Reply
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                deleteConfirm && deleteMutation.mutate(deleteConfirm)
              }
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
