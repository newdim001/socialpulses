import { useState, useRef, useCallback, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Send, Sparkles, Image, X, Loader2, Clock, Wand2, FileText } from "lucide-react"
import { toast } from "sonner"
import { apiFetch, cn } from "@/lib/utils"
import { PlatformIcon, PLATFORM_BRAND_COLORS } from "@/components/PlatformIcon"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AIAssistantPanel } from "@/components/AIAssistantPanel"
import { TemplateSelector } from "@/components/TemplateSelector"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Platform {
  id: string
  name: string
  character_limit: number
  media_supported: boolean
}

interface MediaFile {
  file: File
  previewUrl: string
  uploadedId?: number
  uploading?: boolean
  error?: string
}

interface ComposeForm {
  platforms: string[]
  content: string
  media_ids: number[]
  scheduled_at: string | null
}

// ---------------------------------------------------------------------------
// Platform config
// ---------------------------------------------------------------------------
interface PlatformConfig {
  id: string
  label: string
  bgClass: string
}

function platformBgClass(platform: string): string {
  const color = PLATFORM_BRAND_COLORS[platform] ?? "#6b7280"
  return `bg-[${color}]/10`
}

const platformList: PlatformConfig[] = [
  { id: "instagram", label: "Instagram", bgClass: "bg-pink-500/10" },
  { id: "twitter", label: "X (Twitter)", bgClass: "bg-sky-500/10" },
  { id: "linkedin", label: "LinkedIn", bgClass: "bg-blue-500/10" },
  { id: "linkedin_page", label: "LinkedIn Page", bgClass: "bg-blue-500/10" },
  { id: "facebook", label: "Facebook", bgClass: "bg-blue-600/10" },
  { id: "tiktok", label: "TikTok", bgClass: "bg-purple-500/10" },
  { id: "youtube", label: "YouTube", bgClass: "bg-red-500/10" },
  { id: "pinterest", label: "Pinterest", bgClass: "bg-red-600/10" },
  { id: "threads", label: "Threads", bgClass: "bg-gray-500/10" },
  { id: "bluesky", label: "Bluesky", bgClass: "bg-blue-400/10" },
  { id: "mastodon", label: "Mastodon", bgClass: "bg-indigo-500/10" },
  { id: "google_business", label: "Google Business", bgClass: "bg-blue-500/10" },
  { id: "reddit", label: "Reddit", bgClass: "bg-orange-500/10" },
  { id: "discord", label: "Discord", bgClass: "bg-indigo-600/10" },
  { id: "telegram", label: "Telegram", bgClass: "bg-sky-400/10" },
  { id: "medium", label: "Medium", bgClass: "bg-gray-800/10" },
  { id: "wordpress", label: "WordPress", bgClass: "bg-blue-800/10" },
  { id: "slack", label: "Slack", bgClass: "bg-purple-700/10" },
  { id: "shopify", label: "Shopify", bgClass: "bg-green-500/10" },
  { id: "substack", label: "Substack", bgClass: "bg-orange-600/10" },
  { id: "mewe", label: "MeWe", bgClass: "bg-blue-500/10" },
  { id: "farcaster", label: "Farcaster", bgClass: "bg-purple-500/10" },
  { id: "dribbble", label: "Dribbble", bgClass: "bg-pink-400/10" },
  { id: "skool", label: "Skool", bgClass: "bg-green-800/10" },
  { id: "whop", label: "Whop", bgClass: "bg-yellow-700/10" },
  { id: "lemmy", label: "Lemmy", bgClass: "bg-blue-400/10" },
  { id: "nostr", label: "Nostr", bgClass: "bg-purple-500/10" },
  { id: "vk", label: "VK", bgClass: "bg-blue-600/10" },
  { id: "devto", label: "DEV Community", bgClass: "bg-gray-900/10" },
  { id: "hashnode", label: "Hashnode", bgClass: "bg-blue-600/10" },
]

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

// ---------------------------------------------------------------------------
// ComposePage
// ---------------------------------------------------------------------------
export function ComposePage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [content, setContent] = useState("")
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { data: platformsData, isLoading: platformsLoading } = useQuery<Platform[]>({
    queryKey: ["platforms"],
    queryFn: () => apiFetch<Platform[]>("/platforms"),
  })

  // Fetch connected accounts to show only active platforms
  const { data: accounts } = useQuery<{ id: number; platform_name: string }[]>({
    queryKey: ["accounts"],
    queryFn: () => apiFetch("/accounts"),
  })

  // Derive connected platform names from active accounts
  const connectedPlatforms = useMemo(() => {
    if (!accounts) return []
    return [...new Set(accounts.map((a) => a.platform_name))]
  }, [accounts])

  // Filter platformList to only connected platforms
  const availablePlatforms = useMemo(
    () => platformList.filter((p) => connectedPlatforms.includes(p.id)),
    [connectedPlatforms]
  )

  // Toggle platform selection
  const togglePlatform = useCallback((id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }, [])

  // Handle file selection — just store files + create preview URLs
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newFiles: MediaFile[] = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setMediaFiles((prev) => [...prev, ...newFiles])
    e.target.value = ""
  }, [])

  const removeMedia = useCallback((previewUrl: string) => {
    setMediaFiles((prev) => prev.filter((m) => m.previewUrl !== previewUrl))
    URL.revokeObjectURL(previewUrl)
  }, [])

  // Upload a single file to the server, return media_id
  const uploadSingleFile = useCallback(async (mf: MediaFile): Promise<number> => {
    const formData = new FormData()
    formData.append("file", mf.file)
    const res = await apiFetch<{ id: number }>("/media/upload", {
      method: "POST",
      body: formData,
      headers: {}, // let browser set multipart boundary
    })
    return res.id
  }, [])

  // AI Generate
  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return
    setIsGenerating(true)
    try {
      const result = await apiFetch<{ content: string }>("/ai/generate", {
        method: "POST",
        body: JSON.stringify({ prompt: aiPrompt, platforms: selectedPlatforms }),
      })
      setContent(result.content)
      setAiPrompt("")
    } catch (err) {
      console.error("AI generate error:", err)
    } finally {
      setIsGenerating(false)
    }
  }, [aiPrompt, selectedPlatforms])

  // Submit
  const handleSubmit = useCallback(async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform to publish to")
      return
    }
    setIsPublishing(true)
    try {
      // 1. Upload any un-uploaded files
      const notUploaded = mediaFiles.filter((m) => m.uploadedId === undefined)
      if (notUploaded.length > 0) {
        setIsUploading(true)
        const ids = await Promise.all(
          notUploaded.map((mf) => uploadSingleFile(mf))
        )
        // Mark all files as uploaded
        setMediaFiles((prev) =>
          prev.map((m) => {
            const idx = notUploaded.indexOf(m)
            return idx >= 0 ? { ...m, uploadedId: ids[idx] } : m
          })
        )
        setIsUploading(false)
      }

      // 2. Collect all media_ids
      const allMediaIds = mediaFiles
        .map((m) => m.uploadedId)
        .filter((id): id is number => id !== undefined)

      const scheduledAt =
        scheduleDate && scheduleTime
          ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
          : null

      // 3. Create the post with media_ids
      await apiFetch("/posts", {
        method: "POST",
        body: JSON.stringify({
          platforms: selectedPlatforms,
          content,
          media_ids: allMediaIds,
          scheduled_at: scheduledAt,
        } satisfies ComposeForm),
      })

      // Reset form on success
      setContent("")
      // Revoke all object URLs
      mediaFiles.forEach((mf) => URL.revokeObjectURL(mf.previewUrl))
      setMediaFiles([])
      setSelectedPlatforms([])
      setScheduleDate("")
      setScheduleTime("")
      toast.success("Post created successfully!", {
        action: {
          label: "View in History",
          onClick: () => navigate("/history"),
        },
      })
    } catch (err) {
      console.error("Publish error:", err)
      toast.error("Failed to create post. Please try again.")
    } finally {
      setIsPublishing(false)
      setIsUploading(false)
    }
  }, [selectedPlatforms, content, mediaFiles, uploadSingleFile, scheduleDate, scheduleTime])

  // Find character limit from the smallest selected platform
  const charLimit = platformsData
    ? Math.min(
        ...selectedPlatforms.map(
          (p) => platformsData.find((pf) => pf.id === p)?.character_limit ?? 280
        )
      )
    : 280

  const charCount = content.length
  const charProgress = Math.min((charCount / charLimit) * 100, 100)
  const isOverLimit = charCount > charLimit

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6 pb-12"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Compose Post</h1>
        <p className="text-sm text-muted mt-1">Create and schedule posts for your social platforms.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left Column: Editor ── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Platform Selector */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {platformsLoading ? (
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-24 rounded-full" />
                      ))}
                    </div>
                  ) : availablePlatforms.length === 0 ? (
                    <div className="w-full py-4 text-center">
                      <p className="text-sm text-muted">No platforms connected yet.</p>
                      <a
                        href="/accounts"
                        className="text-xs text-accent hover:underline mt-1 inline-block"
                      >
                        Connect a platform →
                      </a>
                    </div>
                  ) : (
                    availablePlatforms.map((platform) => {
                      const isSelected = selectedPlatforms.includes(platform.id)
                      const brandColor = PLATFORM_BRAND_COLORS[platform.id] ?? "#6b7280"
                      return (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => togglePlatform(platform.id)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-200",
                            isSelected
                              ? cn(platform.bgClass, "ring-1 ring-inset", `ring-[${brandColor}]/40`)
                              : "bg-surface-3 text-muted hover:text-secondary hover:bg-surface-4"
                          )}
                        >
                          <PlatformIcon platform={platform.id} size={14} />
                          {platform.label}
                        </button>
                      )
                    })
                  )}
                </div>
                {selectedPlatforms.length === 0 && (
                  <p className="text-xs text-muted mt-3">Select at least one platform to continue</p>
                )}
                {selectedPlatforms.length > 0 && (
                  <p className="text-xs text-muted mt-3">
                    {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? "s" : ""} selected
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Content Editor */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What would you like to share?"
                  className="min-h-[160px] resize-y"
                />
                {/* Character counter — only show when platform selected */}
                <div className="flex items-center gap-3">
                  {selectedPlatforms.length > 0 && (
                    <>
                      <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            charProgress > 90
                              ? "bg-red"
                              : charProgress > 75
                                ? "bg-amber"
                                : "bg-accent"
                          )}
                          style={{ width: `${Math.min(charProgress, 100)}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium shrink-0",
                          isOverLimit ? "text-red" : "text-muted"
                        )}
                      >
                        {charCount}/{charLimit}
                      </span>
                    </>
                  )}
                </div>

                {/* Templates + AI Tools */}
                <Separator />
                <div className="space-y-3">
                  {/* Templates */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted">Templates</Label>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setTemplateSelectorOpen(true)}
                      className="gap-1.5 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Browse Templates
                    </Button>
                  </div>
                  <p className="text-xs text-muted">
                    Choose from reusable post templates with {"{"}variable{"}"} placeholders
                  </p>

                  <Separator />

                  {/* AI Assistant */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted">AI Tools</Label>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setAiAssistantOpen(true)}
                        className="gap-1.5 text-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Open AI Assistant
                      </Button>
                    </div>
                    <p className="text-xs text-muted">
                      Generate content, create variations, get ideas, and find the best time to post
                    </p>
                  </div>

                  {/* Template Selector Dialog */}
                  <TemplateSelector
                    open={templateSelectorOpen}
                    onOpenChange={setTemplateSelectorOpen}
                    onSelect={(content, platform) => {
                      setContent(content)
                      if (platform && !selectedPlatforms.includes(platform)) {
                        setSelectedPlatforms((prev) => [...prev, platform])
                      }
                      setTemplateSelectorOpen(false)
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Media Upload */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Image className="h-4 w-4" />
                  Upload Media
                </Button>

                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {mediaFiles.map((mf, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-surface-3">
                        {mf.file.type.startsWith('video/') ? (
                          <video
                            src={mf.previewUrl}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <img
                            src={mf.previewUrl}
                            alt={`Upload ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {mf.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 text-white animate-spin" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(mf.previewUrl)}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Schedule */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label htmlFor="schedule-date" className="text-xs text-muted mb-1.5 block">
                      Date
                    </Label>
                    <Input
                      id="schedule-date"
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="schedule-time" className="text-xs text-muted mb-1.5 block">
                      Time
                    </Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
                {scheduleDate && scheduleTime && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted">
                    <Clock className="h-3 w-3" />
                    Scheduled for{" "}
                    {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                )}
                {!scheduleDate && (
                  <p className="text-xs text-muted mt-2">Leave blank to publish immediately</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit */}
          <motion.div variants={itemVariants}>
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isPublishing || isUploading || selectedPlatforms.length === 0 || !content.trim()}
              className="w-full gap-2"
              title={
                selectedPlatforms.length === 0
                  ? "Select at least one platform"
                  : !content.trim()
                    ? "Write some content first"
                    : ""
              }
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading Media...
                </>
              ) : isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isUploading ? "" : scheduleDate ? "Schedule Post" : "Publish Now"}
            </Button>
          </motion.div>
        </div>

        {/* ── Right Column: Preview ── */}
        <div className="lg:col-span-2">
          <motion.div variants={itemVariants} className="sticky top-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPlatforms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Send className="h-8 w-8 text-muted mb-3" />
                    <p className="text-sm text-muted">Select platforms to see preview</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[600px]">
                    <div className="space-y-4">
                      {selectedPlatforms.map((pid) => {
                        const platform = platformList.find((p) => p.id === pid)
                        if (!platform) return null
                        const apiPlatform = platformsData?.find((p) => p.id === pid)
                        const limit = apiPlatform?.character_limit ?? 280
                        const truncated =
                          content.length > limit
                            ? content.slice(0, limit) + "..."
                            : content

                        return (
                          <Card key={pid} className="bg-surface-2 border-border/50 overflow-hidden">
                            <CardContent className="p-4 space-y-3">
                              {/* Platform header */}
                              <div className="flex items-center gap-2">
                                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", platform.bgClass)}>
                                  <PlatformIcon platform={platform.id} size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-primary">{platform.label}</p>
                                  <p className="text-[10px] text-muted">@{platform.label.toLowerCase().replace(/[^a-z]/g, "")}</p>
                                </div>
                                <Badge variant="secondary" className="text-[10px]">
                                  {limit} chars
                                </Badge>
                              </div>

                              {/* Content preview */}
                              <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">
                                {truncated || <span className="text-muted italic">No content yet</span>}
                              </p>

                              {/* Media preview */}
                              {mediaFiles.length > 0 && (
                                <div className="rounded-lg overflow-hidden bg-surface-3">
                                  {mediaFiles[0].file.type.startsWith('video/') ? (
                                    <video
                                      src={mediaFiles[0].previewUrl}
                                      className="w-full h-40 object-cover"
                                      muted
                                    />
                                  ) : (
                                    <img
                                      src={mediaFiles[0].previewUrl}
                                      alt="Preview media"
                                      className="w-full h-40 object-cover"
                                    />
                                  )}
                                  {mediaFiles.length > 1 && (
                                    <div className="p-2 text-xs text-muted text-center border-t border-border/30">
                                      +{mediaFiles.length - 1} more image{mediaFiles.length > 2 ? "s" : ""}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Schedule indicator */}
                              {scheduleDate && scheduleTime && (
                                <div className="flex items-center gap-1.5 text-[10px] text-muted">
                                  <Clock className="h-3 w-3" />
                                  Scheduled:{" "}
                                  {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString("en-US", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })}
                                </div>
                              )}

                              {/* Publish now indicator */}
                              {!scheduleDate && (
                                <div className="flex items-center gap-1.5 text-[10px] text-green">
                                  <Send className="h-3 w-3" />
                                  Will publish immediately
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* AI Assistant Panel */}
      <AIAssistantPanel
        open={aiAssistantOpen}
        onOpenChange={setAiAssistantOpen}
        currentContent={content}
        selectedPlatforms={selectedPlatforms}
        onInsertContent={(newContent) => {
          setContent(newContent)
          toast.success("Content inserted")
        }}
      />
    </motion.div>
  )
}
