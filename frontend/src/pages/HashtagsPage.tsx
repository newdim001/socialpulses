import { useState } from "react"
import { motion } from "framer-motion"
import {
  Hash,
  Plus,
  Search,
  Copy,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
  show: {
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

interface HashtagGroup {
  id: string
  name: string
  tags: string[]
  updatedAt: string
}

const defaultGroups: HashtagGroup[] = [
  {
    id: "1",
    name: "Marketing",
    tags: ["marketing", "digitalmarketing", "socialmedia", "contentmarketing", "branding"],
    updatedAt: "2026-05-10",
  },
  {
    id: "2",
    name: "Tech",
    tags: ["technology", "ai", "software", "dev", "coding", "innovation"],
    updatedAt: "2026-05-12",
  },
  {
    id: "3",
    name: "Business",
    tags: ["business", "entrepreneur", "startup", "growth", "success"],
    updatedAt: "2026-05-14",
  },
]

export function HashtagsPage() {
  const [groups, setGroups] = useState<HashtagGroup[]>(defaultGroups)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<HashtagGroup | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [formName, setFormName] = useState("")
  const [formTags, setFormTags] = useState("")

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const openNewDialog = () => {
    setEditingGroup(null)
    setFormName("")
    setFormTags("")
    setDialogOpen(true)
  }

  const openEditDialog = (group: HashtagGroup) => {
    setEditingGroup(group)
    setFormName(group.name)
    setFormTags(group.tags.join(", "))
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!formName.trim() || !formTags.trim()) return
    const tags = formTags.split(/[,\s]+/).map((t) => t.replace(/^#/, "").trim().toLowerCase()).filter(Boolean)
    if (editingGroup) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === editingGroup.id
            ? { ...g, name: formName.trim(), tags, updatedAt: new Date().toISOString().slice(0, 10) }
            : g
        )
      )
    } else {
      setGroups((prev) => [
        ...prev,
        { id: String(Date.now()), name: formName.trim(), tags, updatedAt: new Date().toISOString().slice(0, 10) },
      ])
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id))
  }

  const handleCopyTags = (tags: string[]) => {
    const text = tags.map((t) => `#${t}`).join(" ")
    navigator.clipboard.writeText(text)
    setCopiedId(text.slice(0, 20))
    setTimeout(() => setCopiedId(null), 2000)
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
          <h1 className="text-2xl font-bold text-primary tracking-tight">Hashtags</h1>
          <p className="text-sm text-muted mt-1">Manage hashtag groups for your posts</p>
        </div>
        <Button onClick={openNewDialog} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New Group
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search hashtag groups..." className="pl-10" />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-14 w-14 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
                <Hash className="h-7 w-7 text-muted" />
              </div>
              <p className="text-sm font-medium text-primary mb-1">
                {searchQuery ? "No groups match your search" : "No hashtag groups yet"}
              </p>
              <p className="text-xs text-muted mb-5">
                {searchQuery ? "Try a different search term" : "Create your first hashtag group"}
              </p>
              {!searchQuery && (
                <Button onClick={openNewDialog} variant="secondary" size="sm" className="gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  Create Group
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((group) => (
              <Card key={group.id} className="transition-colors hover:border-border-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <Layers className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-primary">{group.name}</h3>
                          <p className="text-[10px] text-muted">{group.tags.length} tag{group.tags.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.tags.map((tag) => (
                          <Badge key={tag} variant="default" className="text-[10px]">#{tag}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted">
                        <Clock className="h-3 w-3" />
                        Updated {group.updatedAt}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyTags(group.tags)} title="Copy all tags">
                        {copiedId && group.tags.map((t) => `#${t}`).join(" ").slice(0, 20) === copiedId ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(group)} title="Edit">
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted hover:text-red" onClick={() => handleDelete(group.id)} title="Delete">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Hashtag Group" : "New Hashtag Group"}</DialogTitle>
            <DialogDescription>
              {editingGroup ? "Update your hashtag group" : "Create a reusable set of hashtags"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input id="group-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Marketing, Tech, Business" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-tags">Tags <span className="text-[10px] text-muted font-normal">(comma or space separated)</span></Label>
              <Input id="group-tags" value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="marketing, digitalmarketing, socialmedia" />
              {formTags.trim() && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formTags.split(/[,\s]+/).filter(Boolean).map((t) => (
                    <Badge key={t} variant="default" className="text-[10px]">#{t.replace(/^#/, "").trim().toLowerCase()}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!formName.trim() || !formTags.trim()}>
              {editingGroup ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
