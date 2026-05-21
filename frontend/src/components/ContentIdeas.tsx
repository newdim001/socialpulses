import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Loader2, Copy, Check, Globe } from "lucide-react"
import { toast } from "sonner"
import { apiFetch, cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface ContentIdea {
  title: string
  description: string
  platform: string
}

interface ContentIdeasResponse {
  ideas: ContentIdea[]
}

const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
]

export function ContentIdeas() {
  const [industry, setIndustry] = useState("")
  const [platform, setPlatform] = useState("all")
  const [count, setCount] = useState(5)
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleGenerate = async () => {
    if (!industry.trim()) return
    setIsGenerating(true)
    setIdeas([])
    try {
      const data = await apiFetch<ContentIdeasResponse>("/ai/content-ideas", {
        method: "POST",
        body: JSON.stringify({
          industry: industry.trim(),
          count,
          platform: platform === "all" ? undefined : platform,
        }),
      })
      setIdeas(data.ideas)
      toast.success(`Generated ${data.ideas.length} content ideas`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate ideas")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyIdea = (idea: ContentIdea, index: number) => {
    const text = `${idea.title}\n${idea.description}`
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    toast.success("Idea copied to clipboard")
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          AI Content Ideas
        </h2>
        <p className="text-sm text-muted mt-1">
          Generate fresh content ideas tailored to your industry and platforms
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="industry" className="text-xs text-muted">Industry</Label>
          <Input
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., Fintech, Health, SaaS..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleGenerate()
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="platform" className="text-xs text-muted">Platform</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger id="platform">
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="count" className="text-xs text-muted">Number of Ideas: {count}</Label>
          <div className="flex items-center gap-3">
            <input
              id="count"
              type="range"
              min={1}
              max={10}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="flex-1 h-2 rounded-full bg-surface-3 appearance-none cursor-pointer accent-accent"
            />
            <span className="text-sm font-medium text-primary w-6 text-center">{count}</span>
          </div>
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !industry.trim()}
        className="gap-2"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isGenerating ? "Generating..." : "Generate Ideas"}
      </Button>

      <AnimatePresence mode="wait">
        {isGenerating && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm text-muted">Generating content ideas...</p>
            </div>
          </motion.div>
        )}

        {ideas.length > 0 && !isGenerating && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {ideas.map((idea, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Card
                  className="group cursor-pointer transition-all duration-200 hover:border-accent/30 hover:bg-accent/[0.02]"
                  onClick={() => handleCopyIdea(idea, index)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                          {idea.title}
                        </h3>
                        <p className="text-xs text-secondary mt-1 leading-relaxed line-clamp-2">
                          {idea.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyIdea(idea, index)
                        }}
                        className={cn(
                          "h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all",
                          copiedIndex === index
                            ? "bg-green/15 text-green"
                            : "bg-surface-2 text-muted opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-surface-3"
                        )}
                      >
                        {copiedIndex === index ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        <Globe className="h-3 w-3 mr-1" />
                        {idea.platform}
                      </Badge>
                      <span className="text-[10px] text-muted">
                        Click to copy
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
