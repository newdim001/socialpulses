import { useState, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Image, Upload, Trash2, X } from "lucide-react"
import { apiFetch, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MediaItem {
  id: string
  filename: string
  url: string
  thumbnail_url?: string
  mime_type: string
  size: number
  created_at: string
}

// ---------------------------------------------------------------------------
// Fetch media
// ---------------------------------------------------------------------------
async function fetchMedia(): Promise<MediaItem[]> {
  return apiFetch<MediaItem[]>("/media")
}

async function uploadMedia(file: File): Promise<MediaItem> {
  const formData = new FormData()
  formData.append("file", file)
  return apiFetch<MediaItem>("/media/upload", {
    method: "POST",
    body: formData,
    headers: {},
  })
}

async function deleteMedia(id: string): Promise<void> {
  return apiFetch<void>(`/media/${id}`, { method: "DELETE" })
}

// ---------------------------------------------------------------------------
// Container stagger animation
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
}

// ---------------------------------------------------------------------------
// Skeleton grid
// ---------------------------------------------------------------------------
function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
        <Image className="h-8 w-8 text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1">No media yet</h3>
      <p className="text-sm text-muted max-w-xs mb-6">
        Upload images and videos to use in your posts. Supported formats include
        JPG, PNG, GIF, and MP4.
      </p>
      <Button onClick={onUpload}>
        <Upload className="h-4 w-4" />
        Upload Media
      </Button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// MediaPage
// ---------------------------------------------------------------------------
export function MediaPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)

  const { data: media, isLoading, error } = useQuery({
    queryKey: ["media"],
    queryFn: fetchMedia,
  })

  const uploadMutation = useMutation({
    mutationFn: uploadMedia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMedia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] })
      if (previewItem) {
        setPreviewUrl(null)
        setPreviewItem(null)
      }
    },
  })

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        uploadMutation.mutate(file)
      }
      e.target.value = ""
    },
    [uploadMutation]
  )

  const openPreview = useCallback((item: MediaItem) => {
    setPreviewItem(item)
    setPreviewUrl(item.url)
  }, [])

  const closePreview = useCallback(() => {
    setPreviewUrl(null)
    setPreviewItem(null)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            Media Library
          </h1>
          <p className="text-sm text-muted mt-1">
            Upload and manage your images and videos
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <MediaGridSkeleton />
      ) : error ? (
        <div className="rounded-xl border border-red/20 bg-red/10 p-4 text-sm text-red">
          Failed to load media. Please try again.
        </div>
      ) : !media || media.length === 0 ? (
        <EmptyState onUpload={() => fileInputRef.current?.click()} />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {media.map((item) => (
            <motion.div key={item.id} variants={itemVariants}>
              <Card className="group relative overflow-hidden cursor-pointer hover:border-border-hover transition-colors">
                <div
                  className="aspect-square relative"
                  onClick={() => openPreview(item)}
                >
                  <img
                    src={item.thumbnail_url ?? item.url}
                    alt={item.filename}
                    className="absolute inset-0 w-full h-full object-cover rounded-t-xl"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                    <Button
                      variant="danger"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMutation.mutate(item.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-xs text-secondary truncate">
                    {item.filename}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    {formatDate(item.created_at)}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Upload progress indicator */}
      {uploadMutation.isPending && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-border bg-surface-1 px-4 py-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-sm text-secondary">Uploading…</span>
          </div>
        </div>
      )}

      {/* Preview dialog */}
      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => !open && closePreview()}
      >
        <DialogContent className="max-w-3xl w-[90vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-4 w-4 text-accent" />
              {previewItem?.filename ?? "Preview"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={previewItem?.filename ?? "Preview"}
                className="w-full max-h-[65vh] object-contain rounded-lg"
              />
            )}
          </div>
          {previewItem && (
            <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-border">
              <span>
                {((previewItem.size ?? 0) / 1024).toFixed(1)} KB
              </span>
              <span>{previewItem.mime_type}</span>
              <span>{formatDate(previewItem.created_at)}</span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (previewItem) deleteMutation.mutate(previewItem.id)
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <DialogClose asChild>
              <Button variant="secondary" size="sm">
                <X className="h-3.5 w-3.5" />
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
