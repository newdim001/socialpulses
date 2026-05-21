import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  Plus,
  GripVertical,
  Trash2,
  Lightbulb,
  Columns3,
} from "lucide-react"
import { apiFetch } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface KanbanColumn {
  id: number
  name: string
  position: number
  color: string | null
  card_count: number
}

interface KanbanCard {
  id: number
  column_id: number
  title: string
  description?: string
  content?: string
  tags: string[]
  labels?: string[]
  position: number
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------
async function fetchColumns(): Promise<KanbanColumn[]> {
  return apiFetch<KanbanColumn[]>("/kanban/columns")
}

async function fetchCards(): Promise<KanbanCard[]> {
  return apiFetch<KanbanCard[]>("/kanban/cards")
}

async function createColumn(data: {
  name: string
  position?: number
  color?: string
}): Promise<KanbanColumn> {
  return apiFetch<KanbanColumn>("/kanban/columns", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

async function deleteColumn(id: number): Promise<void> {
  return apiFetch<void>(`/kanban/columns/${id}`, { method: "DELETE" })
}

async function createCard(data: {
  column_id: number
  title: string
  description?: string
  tags?: string[]
}): Promise<KanbanCard> {
  return apiFetch<KanbanCard>("/kanban/cards", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

async function deleteCard(id: number): Promise<void> {
  return apiFetch<void>(`/kanban/cards/${id}`, { method: "DELETE" })
}

async function updateCard(
  id: number,
  data: { column_id?: number; position?: number }
): Promise<KanbanCard> {
  return apiFetch<KanbanCard>(`/kanban/cards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

// ---------------------------------------------------------------------------
// Tag color map
// ---------------------------------------------------------------------------
const tagColors: Record<
  string,
  "info" | "success" | "warning" | "danger" | "purple" | "secondary"
> = {
  idea: "purple",
  bug: "danger",
  feature: "info",
  content: "success",
  urgent: "warning",
  design: "purple",
  marketing: "info",
}

function getTagVariant(tag: string) {
  const key = tag.toLowerCase()
  return tagColors[key] ?? "secondary"
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-72 space-y-3">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Column Dialog
// ---------------------------------------------------------------------------
function AddColumnDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")

  const createMutation = useMutation({
    mutationFn: createColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-columns"] })
      setName("")
      onOpenChange(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({ name: name.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Column</DialogTitle>
          <DialogDescription>
            Create a new column for your idea board.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary">
              Column Name *
            </label>
            <Input
              placeholder='e.g. "Ideas", "In Progress", "Done"'
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Adding…" : "Add Column"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Add Card Dialog
// ---------------------------------------------------------------------------
function AddCardDialog({
  open,
  onOpenChange,
  columnId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  columnId: number
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tagsInput, setTagsInput] = useState("")

  const createMutation = useMutation({
    mutationFn: createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-cards"] })
      setTitle("")
      setDescription("")
      setTagsInput("")
      onOpenChange(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    createMutation.mutate({
      column_id: columnId,
      title: title.trim(),
      description: description.trim() || undefined,
      tags,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Card</DialogTitle>
          <DialogDescription>
            Create a new idea or task in this column.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary">
              Title *
            </label>
            <Input
              placeholder="Card title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary">
              Description
            </label>
            <Textarea
              placeholder="Optional description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary">
              Tags
            </label>
            <Input
              placeholder="idea, feature, urgent (comma-separated)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Adding…" : "Add Card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Column component
// ---------------------------------------------------------------------------
function KanbanColumn({
  column,
  cards,
  onAddCard,
  onDeleteColumn,
  onDeleteCard,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  column: KanbanColumn
  cards: KanbanCard[]
  onAddCard: (columnId: number) => void
  onDeleteColumn: (id: number) => void
  onDeleteCard: (id: number) => void
  onDragStart: (e: React.DragEvent, cardId: number, sourceColumnId: number) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetColumnId: number) => void
}) {
  const handleDragStart = (e: React.DragEvent, cardId: number) => {
    onDragStart(e, cardId, column.id)
  }

  return (
    <div
      className="flex-shrink-0 w-72 flex flex-col"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-primary truncate">
            {column.name}
          </h3>
          <span className="text-xs text-muted bg-surface-3 rounded-full px-2 py-0.5 flex-shrink-0">
            {cards.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7"
            onClick={() => onAddCard(column.id)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 text-muted hover:text-red"
            onClick={() => onDeleteColumn(column.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Cards list */}
      <div className="space-y-2 flex-1 min-h-[120px]">
        {cards.length === 0 ? (
          <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-border bg-surface-1/50">
            <p className="text-xs text-muted">Drop cards here</p>
          </div>
        ) : (
          cards.map((card) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              draggable
              onDragStart={(e) => handleDragStart(e, card.id)}
            >
              <Card className="group cursor-grab active:cursor-grabbing hover:border-border-hover transition-colors">
                <CardContent className="p-3 space-y-2">
                  {/* Drag handle + delete */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 text-muted">
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteCard(card.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-red transition-all duration-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Title */}
                  <p className="text-sm font-medium text-primary leading-snug">
                    {card.title}
                  </p>

                  {/* Description snippet */}
                  {(card.description || card.content) && (
                    <p className="text-xs text-secondary line-clamp-2">
                      {card.description || card.content}
                    </p>
                  )}

                  {/* Tags / labels */}
                  {(card.tags?.length > 0 || card.labels?.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(card.tags || card.labels || []).map((tag) => (
                        <Badge
                          key={tag}
                          variant={getTagVariant(tag)}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function KanbanEmptyState({
  onCreateColumn,
}: {
  onCreateColumn: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
        <Lightbulb className="h-8 w-8 text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1">
        No columns yet
      </h3>
      <p className="text-sm text-muted max-w-xs mb-6">
        Create columns to organize your content ideas and tasks. Start with
        columns like "Ideas," "In Progress," and "Done."
      </p>
      <Button
        onClick={onCreateColumn}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Create First Column
      </Button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// KanbanPage
// ---------------------------------------------------------------------------
export function KanbanPage() {
  const queryClient = useQueryClient()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)
  const [addColumnId, setAddColumnId] = useState<number | null>(null)
  const dragRef = useRef<{
    cardId: number
    sourceColumnId: number
  } | null>(null)

  const {
    data: columns,
    isLoading: columnsLoading,
    error: columnsError,
  } = useQuery({
    queryKey: ["kanban-columns"],
    queryFn: fetchColumns,
  })

  const {
    data: cards,
    isLoading: cardsLoading,
    error: cardsError,
  } = useQuery({
    queryKey: ["kanban-cards"],
    queryFn: fetchCards,
  })

  const deleteColumnMutation = useMutation({
    mutationFn: deleteColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-columns"] })
      queryClient.invalidateQueries({ queryKey: ["kanban-cards"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-cards"] })
    },
  })

  const moveMutation = useMutation({
    mutationFn: ({
      cardId,
      columnId,
      position,
    }: {
      cardId: number
      columnId: number
      position: number
    }) => updateCard(cardId, { column_id: columnId, position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-cards"] })
    },
  })

  const handleAddCard = (columnId: number) => {
    setAddColumnId(columnId)
    setAddDialogOpen(true)
  }

  const handleDeleteCard = (id: number) => {
    deleteMutation.mutate(id)
  }

  const handleDeleteColumn = (id: number) => {
    deleteColumnMutation.mutate(id)
  }

  const handleDragStart = (
    e: React.DragEvent,
    cardId: number,
    sourceColumnId: number
  ) => {
    dragRef.current = { cardId, sourceColumnId }
    e.dataTransfer.effectAllowed = "move"
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5"
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetColumnId: number) => {
    e.preventDefault()
    const drag = dragRef.current
    if (!drag) return

    if (e.currentTarget instanceof HTMLElement) {
      const dragged = document.querySelector(
        `[draggable="true"][style*="opacity: 0.5"]`
      ) as HTMLElement | null
      if (dragged) dragged.style.opacity = "1"
    }

    if (drag.sourceColumnId !== targetColumnId) {
      const targetCards = (cards ?? []).filter(
        (c) => c.column_id === targetColumnId
      )
      moveMutation.mutate({
        cardId: drag.cardId,
        columnId: targetColumnId,
        position: targetCards.length,
      })
    }
    dragRef.current = null
  }

  const isLoading = columnsLoading || cardsLoading
  const error = columnsError || cardsError

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
    >
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            Idea Board
          </h1>
          <p className="text-sm text-muted mt-1">
            Organize your content ideas with a drag-and-drop Kanban board
          </p>
        </div>
        {columns && columns.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setColumnDialogOpen(true)}
          >
            <Columns3 className="h-4 w-4" />
            Add Column
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <KanbanSkeleton />
      ) : error ? (
        <div className="rounded-xl border border-red/20 bg-red/10 p-4 text-sm text-red">
          Failed to load the board. Please try again.
        </div>
      ) : !columns || columns.length === 0 ? (
        <KanbanEmptyState onCreateColumn={() => setColumnDialogOpen(true)} />
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-4 flex-1 min-h-0 scrollbar-thin">
          {columns
            .sort((a, b) => a.position - b.position)
            .map((column) => {
              const columnCards = (cards ?? [])
                .filter((c) => c.column_id === column.id)
                .sort((a, b) => a.position - b.position)
              return (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={columnCards}
                  onAddCard={handleAddCard}
                  onDeleteColumn={handleDeleteColumn}
                  onDeleteCard={handleDeleteCard}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              )
            })}
        </div>
      )}

      {/* Add card dialog */}
      {addColumnId !== null && (
        <AddCardDialog
          key={addColumnId}
          open={addDialogOpen}
          onOpenChange={(open) => {
            setAddDialogOpen(open)
            if (!open) setAddColumnId(null)
          }}
          columnId={addColumnId}
        />
      )}

      {/* Add column dialog */}
      <AddColumnDialog
        open={columnDialogOpen}
        onOpenChange={setColumnDialogOpen}
      />
    </motion.div>
  )
}
