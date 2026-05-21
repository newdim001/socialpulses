import { useState } from "react"
import { motion } from "framer-motion"
import {
  Link2,
  Plus,
  ExternalLink,
  Edit3,
  Trash2,
  Palette,
  GripVertical,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

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

interface BioLink {
  id: string
  title: string
  url: string
}

interface BioPage {
  id: string
  title: string
  slug: string
  bio: string
  avatar: string
  theme: "light" | "dark" | "auto"
  links: BioLink[]
  isPublished: boolean
  updatedAt: string
}

const defaultBioPages: BioPage[] = [
  {
    id: "1",
    title: "My Links",
    slug: "my-links",
    bio: "Welcome to my link in bio! Follow me on all my social channels.",
    avatar: "",
    theme: "auto",
    links: [
      { id: "l1", title: "Twitter / X", url: "https://twitter.com/username" },
      { id: "l2", title: "Instagram", url: "https://instagram.com/username" },
      { id: "l3", title: "YouTube", url: "https://youtube.com/@username" },
    ],
    isPublished: true,
    updatedAt: "2026-05-14",
  },
]

const themes: ("light" | "dark" | "auto")[] = ["light", "dark", "auto"]

export function LinkBioPage() {
  const [bioPages, setBioPages] = useState<BioPage[]>(defaultBioPages)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<BioPage | null>(null)

  const [formTitle, setFormTitle] = useState("")
  const [formSlug, setFormSlug] = useState("")
  const [formBio, setFormBio] = useState("")
  const [formAvatar, setFormAvatar] = useState("")
  const [formTheme, setFormTheme] = useState<"light" | "dark" | "auto">("auto")
  const [formLinks, setFormLinks] = useState<BioLink[]>([{ id: "new-1", title: "", url: "" }])

  const openNewDialog = () => {
    setEditingPage(null)
    setFormTitle("")
    setFormSlug("")
    setFormBio("")
    setFormAvatar("")
    setFormTheme("auto")
    setFormLinks([{ id: "new-1", title: "", url: "" }])
    setDialogOpen(true)
  }

  const openEditDialog = (page: BioPage) => {
    setEditingPage(page)
    setFormTitle(page.title)
    setFormSlug(page.slug)
    setFormBio(page.bio)
    setFormAvatar(page.avatar)
    setFormTheme(page.theme)
    setFormLinks(page.links.map((l) => ({ ...l })))
    setDialogOpen(true)
  }

  const addLinkField = () => {
    setFormLinks((prev) => [...prev, { id: `new-${Date.now()}`, title: "", url: "" }])
  }

  const removeLinkField = (id: string) => {
    setFormLinks((prev) => prev.filter((l) => l.id !== id))
  }

  const updateLinkField = (id: string, field: "title" | "url", value: string) => {
    setFormLinks((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)))
  }

  const handleSave = () => {
    if (!formTitle.trim() || !formSlug.trim()) return
    const validLinks = formLinks.filter((l) => l.title.trim() && l.url.trim())
    const page: BioPage = {
      id: editingPage?.id ?? String(Date.now()),
      title: formTitle.trim(),
      slug: formSlug.trim(),
      bio: formBio.trim(),
      avatar: formAvatar.trim(),
      theme: formTheme,
      links: validLinks,
      isPublished: editingPage?.isPublished ?? false,
      updatedAt: new Date().toISOString().slice(0, 10),
    }
    if (editingPage) {
      setBioPages((prev) => prev.map((p) => (p.id === editingPage.id ? page : p)))
    } else {
      setBioPages((prev) => [...prev, page])
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setBioPages((prev) => prev.filter((p) => p.id !== id))
  }

  const togglePublish = (id: string) => {
    setBioPages((prev) => prev.map((p) => (p.id === id ? { ...p, isPublished: !p.isPublished } : p)))
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8 p-6 pb-12">
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Link in Bio</h1>
          <p className="text-sm text-muted mt-1">Create and manage your link-in-bio landing pages</p>
        </div>
        <Button onClick={openNewDialog} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New Page
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        {bioPages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-14 w-14 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
                <Link2 className="h-7 w-7 text-muted" />
              </div>
              <p className="text-sm font-medium text-primary mb-1">No bio pages yet</p>
              <p className="text-xs text-muted mb-5">Create your first link-in-bio landing page</p>
              <Button onClick={openNewDialog} variant="secondary" size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Create Page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {bioPages.map((page) => (
              <Card key={page.id} className="transition-colors hover:border-border-hover flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {page.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-sm">{page.title}</CardTitle>
                        <p className="text-xs text-muted">/{page.slug}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3 flex-1">
                  <p className="text-xs text-secondary line-clamp-2 mb-3">{page.bio || "No bio text"}</p>
                  <div className="space-y-1.5">
                    {page.links.slice(0, 3).map((link) => (
                      <div key={link.id} className="flex items-center gap-2 rounded-md bg-surface-2 px-2.5 py-1.5 text-xs">
                        <ExternalLink className="h-3 w-3 text-muted shrink-0" />
                        <span className="text-primary truncate">{link.title}</span>
                      </div>
                    ))}
                    {page.links.length > 3 && (
                      <p className="text-[10px] text-muted pl-1">+{page.links.length - 3} more link{page.links.length - 3 !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-border flex items-center justify-between">
                  <Badge variant={page.isPublished ? "success" : "secondary"} className="text-[10px]">
                    {page.isPublished ? "Published" : "Draft"}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(page)} title="Edit">
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted hover:text-red" onClick={() => handleDelete(page.id)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPage ? "Edit Bio Page" : "New Bio Page"}</DialogTitle>
            <DialogDescription>Configure your link-in-bio landing page</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bio-title">Page Title</Label>
                <Input id="bio-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g., My Links" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio-slug">Slug / Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">/</span>
                  <Input id="bio-slug" value={formSlug} onChange={(e) => setFormSlug(e.target.value.replace(/[^a-z0-9-]/g, ""))} placeholder="my-links" className="pl-6" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio-bio">Bio Text</Label>
              <Textarea id="bio-bio" value={formBio} onChange={(e) => setFormBio(e.target.value)} placeholder="A short description about you..." className="min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio-avatar">Avatar URL (optional)</Label>
              <Input id="bio-avatar" value={formAvatar} onChange={(e) => setFormAvatar(e.target.value)} placeholder="https://example.com/avatar.jpg" />
            </div>
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex items-center gap-3">
                {themes.map((t) => (
                  <button key={t} type="button" onClick={() => setFormTheme(t)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      formTheme === t ? "border-accent bg-accent/5 text-accent" : "border-border bg-surface-2 text-secondary hover:border-border-hover"
                    }`}
                  >
                    <Palette className="h-3.5 w-3.5" />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Links</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addLinkField} className="gap-1.5 text-xs h-7">
                  <Plus className="h-3 w-3" />
                  Add Link
                </Button>
              </div>
              {formLinks.map((link, index) => (
                <div key={link.id} className="flex items-start gap-2 rounded-lg border border-border bg-surface-2/50 p-3">
                  <div className="flex items-center gap-2 pt-1.5 text-muted">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 grid grid-cols-[1fr_1.5fr] gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted">Title</Label>
                      <Input value={link.title} onChange={(e) => updateLinkField(link.id, "title", e.target.value)} placeholder="Link label" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted">URL</Label>
                      <Input value={link.url} onChange={(e) => updateLinkField(link.id, "url", e.target.value)} placeholder="https://..." className="h-8 text-xs" />
                    </div>
                  </div>
                  {formLinks.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted hover:text-red mt-1" onClick={() => removeLinkField(link.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!formTitle.trim() || !formSlug.trim()}>
              {editingPage ? "Save Changes" : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
