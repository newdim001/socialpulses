import { useState, useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { FileText, Search, ArrowLeft, Check, Sparkles, X } from "lucide-react"
import { apiFetch } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { PlatformIcon } from "@/components/PlatformIcon"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

// Types
interface PostTemplate {
  id: number
  name: string
  content: string
  platform: string | null
  category: string | null
  created_at: string
  updated_at: string
}

interface TemplateSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (content: string, platform?: string | null) => void
}

// Available platforms for filter
const PLATFORM_FILTERS = [
  { id: "", label: "All", icon: null },
  { id: "twitter", label: "X", icon: "twitter" },
  { id: "instagram", label: "Instagram", icon: "instagram" },
  { id: "facebook", label: "Facebook", icon: "facebook" },
  { id: "linkedin", label: "LinkedIn", icon: "linkedin" },
]

// ---------------------------------------------------------------------------
// Extract {variable} placeholders from content
// ---------------------------------------------------------------------------
function extractVariables(text: string): string[] {
  const matches = text.match(/\{(\w+)\}/g)
  if (!matches) return []
  return [...new Set(matches.map((m) => m.slice(1, -1)))]
}

// ---------------------------------------------------------------------------
// Build a nice label from a variable name
// ---------------------------------------------------------------------------
function variableLabel(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Fill Variables Dialog
// ---------------------------------------------------------------------------
function FillVariablesDialog({
  template,
  onApply,
  onBack,
}: {
  template: PostTemplate
  onApply: (content: string) => void
  onBack: () => void
}) {
  const variables = useMemo(() => extractVariables(template.content), [template.content])
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const v of variables) init[v] = ""
    return init
  })

  const hasVariables = variables.length > 0

  const filledContent = useMemo(() => {
    let result = template.content
    for (const [key, val] of Object.entries(values)) {
      result = result.replaceAll(`{${key}}`, val || `{${key}}`)
    }
    return result
  }, [template.content, values])

  const allFilled = variables.every((v) => values[v].trim())

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onBack}
          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-3 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4 text-muted" />
        </button>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-primary truncate">{template.name}</h4>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {template.platform && (
              <Badge variant="info" className="text-[10px] capitalize">{template.platform}</Badge>
            )}
            {template.category && (
              <Badge variant="secondary" className="text-[10px]">{template.category}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Variable inputs */}
      {hasVariables && (
        <div className="space-y-3">
          <p className="text-xs text-muted">Fill in the placeholders to customize your post:</p>
          {variables.map((v) => (
            <div key={v} className="space-y-1.5">
              <Label className="text-xs text-muted capitalize">{variableLabel(v)}</Label>
              <Input
                value={values[v]}
                onChange={(e) => setValues((prev) => ({ ...prev, [v]: e.target.value }))}
                placeholder={`Enter ${variableLabel(v).toLowerCase()}...`}
                className="text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {!hasVariables && (
        <p className="text-xs text-muted">No placeholders. Ready to use as-is.</p>
      )}

      {/* Live preview */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted">Preview</Label>
        <div className="p-3 rounded-lg border border-border bg-surface-2 text-xs text-secondary leading-relaxed whitespace-pre-wrap font-mono max-h-[120px] overflow-y-auto">
          {filledContent}
        </div>
      </div>

      {/* Apply */}
      <Button
        className="w-full gap-2"
        onClick={() => onApply(filledContent)}
        disabled={hasVariables && !allFilled}
      >
        <Check className="h-4 w-4" />
        {hasVariables ? (allFilled ? "Apply to Post" : "Fill all fields to continue") : "Use Template"}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Horizontal scrollable filter chips
// ---------------------------------------------------------------------------
function FilterChips({
  options,
  selected,
  onChange,
}: {
  options: { id: string; label: string; icon?: string | null }[]
  selected: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`
            shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
            transition-all duration-200 whitespace-nowrap
            ${
              selected === opt.id
                ? "bg-accent text-white shadow-sm"
                : "bg-surface-3 text-muted hover:bg-surface-4 hover:text-secondary"
            }
          `}
        >
          {opt.icon && <PlatformIcon platform={opt.icon} size={12} />}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TemplateSelector
// ---------------------------------------------------------------------------
export function TemplateSelector({ open, onOpenChange, onSelect }: TemplateSelectorProps) {
  const [search, setSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null)

  const { data: templates, isLoading } = useQuery<PostTemplate[]>({
    queryKey: ["post-templates"],
    queryFn: () => apiFetch<PostTemplate[]>("/post-templates"),
    enabled: open,
  })

  // Derive unique categories from templates
  const allCategories = useMemo(() => {
    if (!templates) return []
    const cats = [...new Set(templates.map((t) => t.category).filter(Boolean))] as string[]
    return cats.sort()
  }, [templates])

  // Filter templates by search + platform + category
  const filtered = useMemo(() => {
    let result = templates || []
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          t.content.toLowerCase().includes(s) ||
          (t.category || "").toLowerCase().includes(s)
      )
    }
    if (platformFilter) {
      result = result.filter((t) => t.platform === platformFilter)
    }
    if (categoryFilter) {
      result = result.filter((t) => t.category === categoryFilter)
    }
    return result
  }, [templates, search, platformFilter, categoryFilter])

  // Group by category for display
  const grouped = useMemo(() => {
    const groups: Record<string, PostTemplate[]> = {}
    for (const t of filtered) {
      const cat = t.category || "Other"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(t)
    }
    return groups
  }, [filtered])

  const handleApply = useCallback(
    (filledContent: string) => {
      onSelect(filledContent, selectedTemplate?.platform)
      setSelectedTemplate(null)
      setSearch("")
      setPlatformFilter("")
      setCategoryFilter("")
      onOpenChange(false)
    },
    [onSelect, selectedTemplate, onOpenChange]
  )

  const handleBack = useCallback(() => {
    setSelectedTemplate(null)
  }, [])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setSelectedTemplate(null)
        setSearch("")
        setPlatformFilter("")
        setCategoryFilter("")
      }
      onOpenChange(open)
    },
    [onOpenChange]
  )

  const hasActiveFilters = platformFilter || categoryFilter || search

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Mobile: full-screen; Desktop: max-w-2xl */}
      <DialogContent className="sm:max-w-2xl w-full h-full sm:h-auto sm:max-h-[85vh] flex flex-col p-0 sm:p-6 gap-0 sm:gap-4 rounded-none sm:rounded-lg">
        {/* Sticky header */}
        <div className="shrink-0 px-4 pt-4 sm:px-0 sm:pt-0 space-y-3">
          <DialogHeader className="px-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {selectedTemplate ? (
                <span>Customize Template</span>
              ) : (
                <>
                  <FileText className="h-5 w-5" />
                  Post Templates
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedTemplate
                ? "Fill in the placeholders and preview before applying"
                : "Choose a template to kickstart your post."}
            </DialogDescription>
          </DialogHeader>

          {!selectedTemplate && (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="pl-10 h-10 text-sm"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted hover:text-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Platform filter chips */}
              <FilterChips
                options={PLATFORM_FILTERS}
                selected={platformFilter}
                onChange={setPlatformFilter}
              />

              {/* Category filter chips (only when templates loaded) */}
              {allCategories.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("")}
                    className={`
                      shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
                      transition-all duration-200 whitespace-nowrap
                      ${!categoryFilter ? "bg-accent text-white shadow-sm" : "bg-surface-3 text-muted hover:bg-surface-4 hover:text-secondary"}
                    `}
                  >
                    All
                  </button>
                  {allCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`
                        shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
                        transition-all duration-200 whitespace-nowrap
                        ${categoryFilter === cat ? "bg-accent text-white shadow-sm" : "bg-surface-3 text-muted hover:bg-surface-4 hover:text-secondary"}
                      `}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {selectedTemplate ? (
          /* Fill variables view */
          <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-0 sm:pb-0">
            <FillVariablesDialog
              template={selectedTemplate}
              onApply={handleApply}
              onBack={handleBack}
            />
          </div>
        ) : (
          /* Browse view - scrollable area */
          <ScrollArea className="flex-1 px-4 sm:px-0 pb-4 sm:pb-0">
            <div className="py-2">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-lg border border-border space-y-2">
                      <Skeleton className="h-4 w-32 rounded" />
                      <Skeleton className="h-3 w-full rounded" />
                      <Skeleton className="h-3 w-24 rounded" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-10 w-10 text-muted mb-3" />
                  <p className="text-sm font-medium text-primary mb-1">
                    {hasActiveFilters ? "No templates match" : "No templates yet"}
                  </p>
                  <p className="text-xs text-muted max-w-[200px]">
                    {hasActiveFilters
                      ? "Try different filters or search terms"
                      : "Create templates from the Templates page"}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2 px-0.5">
                        {category}
                        <span className="font-normal text-[10px] ml-1.5 opacity-60">
                          {items.length}
                        </span>
                      </h4>
                      <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                          {items.map((tmpl) => (
                            <motion.div
                              key={tmpl.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedTemplate(tmpl)}
                                className="w-full text-left p-3.5 sm:p-4 rounded-lg border border-border bg-surface-1 hover:bg-surface-2 hover:border-accent/50 transition-all active:scale-[0.98] group"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="text-sm font-semibold text-primary truncate max-w-[200px] sm:max-w-none">
                                        {tmpl.name}
                                      </h4>
                                      {tmpl.platform && (
                                        <Badge variant="info" className="text-[10px] capitalize shrink-0">
                                          {tmpl.platform}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-secondary leading-relaxed line-clamp-2 font-mono">
                                      {tmpl.content}
                                    </p>
                                    {extractVariables(tmpl.content).length > 0 && (
                                      <div className="flex items-center gap-1 text-[10px] text-accent">
                                        <Sparkles className="h-3 w-3" />
                                        <span>
                                          {extractVariables(tmpl.content).length} variable
                                          {extractVariables(tmpl.content).length > 1 ? "s" : ""}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <span className="hidden sm:inline text-xs text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                    Use →
                                  </span>
                                </div>
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
