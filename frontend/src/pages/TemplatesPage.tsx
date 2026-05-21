import { useState } from "react"
import { motion } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { FileText, Plus, Search, Edit3, Trash2, Clock } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiFetch } from "@/lib/utils"

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

interface PostTemplateOut {
  id: number
  client_id: number
  name: string
  content: string
  platform: string | null
  category: string | null
  created_at: string
  updated_at: string
}

const PLATFORMS = ["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube", "threads", "bluesky"]

function TemplatesSkeleton() {
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

export function TemplatesPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PostTemplateOut | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const [formName, setFormName] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formPlatform, setFormPlatform] = useState("")
  const [formCategory, setFormCategory] = useState("")

  const { data: templates, isLoading } = useQuery<PostTemplateOut[]>({
    queryKey: ["post-templates"],
    queryFn: () => apiFetch<PostTemplateOut[]>("/post-templates"),
  })

  const createMutation = useMutation({
    mutationFn: (body: {
      name: string
      content: string
      platform?: string
      category?: string
    }) =>
      apiFetch<PostTemplateOut>("/post-templates", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-templates"] })
      toast.success("Template created")
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
      name: string
      content: string
      platform?: string
      category?: string
    }) =>
      apiFetch<PostTemplateOut>(`/post-templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-templates"] })
      toast.success("Template updated")
      setDialogOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/post-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-templates"] })
      toast.success("Template deleted")
      setDeleteConfirm(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const filteredTemplates = (templates || []).filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openNewDialog = () => {
    setEditingTemplate(null)
    setFormName("")
    setFormContent("")
    setFormPlatform("")
    setFormCategory("")
    setDialogOpen(true)
  }

  const openEditDialog = (tmpl: PostTemplateOut) => {
    setEditingTemplate(tmpl)
    setFormName(tmpl.name)
    setFormContent(tmpl.content)
    setFormPlatform(tmpl.platform || "")
    setFormCategory(tmpl.category || "")
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!formName.trim() || !formContent.trim()) return
    const body: {
      name: string
      content: string
      platform?: string
      category?: string
    } = {
      name: formName.trim(),
      content: formContent.trim(),
    }
    if (formPlatform) body.platform = formPlatform
    if (formCategory.trim()) body.category = formCategory.trim()

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, ...body })
    } else {
      createMutation.mutate(body)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 pb-12"
    >
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Post Templates</h1>
          <p className="text-sm text-muted mt-1">
            Reusable content templates with variables like {'{product}'}, {'{feature}'}, {'{date}'}
          </p>
        </div>
        <Button onClick={openNewDialog} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-10"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        {isLoading ? (
          <TemplatesSkeleton />
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-14 w-14 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-muted" />
              </div>
              <p className="text-sm font-medium text-primary mb-1">
                {searchQuery ? "No templates match your search" : "No templates yet"}
              </p>
              <p className="text-xs text-muted mb-5">
                {searchQuery ? "Try a different search term" : "Create your first post template"}
              </p>
              {!searchQuery && (
                <Button onClick={openNewDialog} variant="secondary" size="sm" className="gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  Create Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map((tmpl) => (
              <Card key={tmpl.id} className="transition-colors hover:border-border-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-primary">{tmpl.name}</h3>
                        {tmpl.platform && (
                          <Badge variant="info" className="text-[10px] capitalize">{tmpl.platform}</Badge>
                        )}
                        {tmpl.category && (
                          <Badge variant="secondary" className="text-[10px]">{tmpl.category}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-secondary leading-relaxed line-clamp-2 font-mono">
                        {tmpl.content}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-muted">
                        <Clock className="h-3 w-3" />
                        Updated {new Date(tmpl.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(tmpl)} title="Edit">
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted hover:text-red" onClick={() => setDeleteConfirm(tmpl.id)} title="Delete">
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
            <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? "Update your template below" : "Create a reusable post template with {'{variable}'} placeholders"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tmpl-name">Name</Label>
              <Input id="tmpl-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Product Launch" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tmpl-content">Content <span className="text-muted text-[10px]">(Use {'{variable}'} for dynamic content)</span></Label>
              <Textarea id="tmpl-content" value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="Excited to announce {'{product}'}! {'{feature}'} is here 🔥" className="min-h-[120px] font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={formPlatform} onValueChange={setFormPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="All platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All platforms</SelectItem>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g., Announcement" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!formName.trim() || !formContent.trim() || isSaving}>
              {isSaving ? "Saving..." : editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-red" /> Delete Template</DialogTitle>
            <DialogDescription>This action cannot be undone. Are you sure?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending} className="gap-2">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
