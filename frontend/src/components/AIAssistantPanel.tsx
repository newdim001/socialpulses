import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, Loader2, Wand2, Copy, Check, Lightbulb,
  Clock, Globe, ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { apiFetch, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "@/components/ui/select"

interface ContentIdea { title: string; description: string; platform: string }
interface ContentIdeasResponse { ideas: ContentIdea[] }
interface BestTimeResponse { recommendation: string; reasoning: string }

interface AIAssistantPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentContent: string
  selectedPlatforms: string[]
  onInsertContent: (content: string) => void
}

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "humorous", label: "Humorous" },
  { value: "inspirational", label: "Inspirational" },
]

const LENGTHS = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
]

const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
]

const INDUSTRIES = [
  "Fintech", "Healthcare", "SaaS", "E-commerce",
  "Education", "Entertainment", "Real Estate",
  "Hospitality", "Fashion", "Fitness",
]

function VariationCard({ text, index, onSelect, onCopy, copied }: {
  text: string; index: number; onSelect: () => void; onCopy: () => void; copied: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
    >
      <Card className="group transition-all duration-200 hover:border-accent/30 hover:bg-accent/[0.02]">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm text-primary leading-relaxed line-clamp-4">{text}</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onSelect} className="gap-1.5 text-xs">
              <ArrowRight className="h-3 w-3" />
              Use This
            </Button>
            <button
              type="button"
              onClick={onCopy}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                copied ? "bg-green/15 text-green" : "bg-surface-2 text-muted hover:text-primary hover:bg-surface-3"
              )}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function IdeaCard({ idea, index, onCopy, copied }: {
  idea: ContentIdea; index: number; onCopy: () => void; copied: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group transition-all duration-200 hover:border-accent/30 cursor-pointer" onClick={onCopy}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-primary">{idea.title}</h4>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCopy() }}
              className={cn(
                "h-7 w-7 shrink-0 rounded-full flex items-center justify-center transition-all",
                copied ? "bg-green/15 text-green" : "bg-surface-2 text-muted opacity-0 group-hover:opacity-100 hover:text-primary"
              )}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
          <p className="text-xs text-secondary line-clamp-2">{idea.description}</p>
          <Badge variant="secondary" className="text-[10px]">
            <Globe className="h-3 w-3 mr-1" />
            {idea.platform}
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function GenerateTab({ onInsertContent, selectedPlatforms }: {
  onInsertContent: (c: string) => void; selectedPlatforms: string[]
}) {
  const [topic, setTopic] = useState("")
  const [tone, setTone] = useState("professional")
  const [length, setLength] = useState("medium")
  const [platform, setPlatform] = useState("all")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setIsGenerating(true)
    try {
      const result = await apiFetch<{ content: string }>("/ai/generate", {
        method: "POST",
        body: JSON.stringify({ prompt: topic, tone, length, platforms: platform === "all" ? selectedPlatforms : [platform] }),
      })
      onInsertContent(result.content)
      toast.success("Content generated and inserted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-4 py-1">
      <div className="space-y-2">
        <Label className="text-xs text-muted">Topic / Description</Label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Describe what you want to post about..."
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate() } }}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted">Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted">Length</Label>
          <Select value={length} onValueChange={setLength}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LENGTHS.map((l) => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted">Platform</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={handleGenerate} disabled={isGenerating || !topic.trim()} className="w-full gap-2">
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        {isGenerating ? "Generating..." : "Generate "}
      </Button>
    </div>
  )
}

function VariationsTab({ currentContent, onInsertContent }: {
  currentContent: string; onInsertContent: (c: string) => void
}) {
  const [variations, setVariations] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleGenerateVariations = async () => {
    if (!currentContent.trim()) {
      toast.error("Write some content first to generate variations")
      return
    }
    setIsGenerating(true)
    setVariations([])
    try {
      const result = await apiFetch<{ variations: string[] }>("/ai/variations", {
        method: "POST",
        body: JSON.stringify({ content: currentContent }),
      })
      setVariations(result.variations)
      toast.success("Variations generated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate variations")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = (index: number) => {
    navigator.clipboard.writeText(variations[index])
    setCopiedIndex(index)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="space-y-4 py-1">
      <p className="text-xs text-muted">Generate alternative versions of your current content.</p>
      <Button onClick={handleGenerateVariations} disabled={isGenerating || !currentContent.trim()} className="w-full gap-2">
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
        {isGenerating ? "Generating..." : "Generate Variations"}
      </Button>
      <AnimatePresence mode="wait">
        {isGenerating && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </motion.div>
        )}
        {variations.length > 0 && !isGenerating && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {variations.map((text, i) => (
              <VariationCard key={i} text={text} index={i}
                onSelect={() => onInsertContent(text)} onCopy={() => handleCopy(i)} copied={copiedIndex === i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function IdeasTab({ onInsertContent }: { onInsertContent: (c: string) => void }) {
  const [industry, setIndustry] = useState("")
  const [platform, setPlatform] = useState("all")
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedIdea, setCopiedIdea] = useState<number | null>(null)

  const handleGenerate = async () => {
    if (!industry.trim()) return
    setIsGenerating(true)
    setIdeas([])
    try {
      const data = await apiFetch<ContentIdeasResponse>("/ai/content-ideas", {
        method: "POST",
        body: JSON.stringify({ industry: industry.trim(), count: 6, platform: platform === "all" ? undefined : platform }),
      })
      setIdeas(data.ideas)
      toast.success("Generated " + data.ideas.length + " ideas")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate ideas")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyIdea = (idea: ContentIdea, index: number) => {
    navigator.clipboard.writeText(idea.title + ": " + idea.description)
    setCopiedIdea(index)
    toast.success("Idea copied!")
    setTimeout(() => setCopiedIdea(null), 2000)
  }

  return (
    <div className="space-y-4 py-1">
      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs text-muted">Industry</Label>
          <Input value={industry} onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., Fintech, SaaS, Health..." list="industry-suggestions"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGenerate() } }} />
          <datalist id="industry-suggestions">
            {INDUSTRIES.map((ind) => (<option key={ind} value={ind} />))}
          </datalist>
        </div>
        <div className="w-36 space-y-1.5">
          <Label className="text-xs text-muted">Platform</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={handleGenerate} disabled={isGenerating || !industry.trim()} className="w-full gap-2">
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
        {isGenerating ? "Generating..." : "Get Ideas"}
      </Button>
      <AnimatePresence mode="wait">
        {isGenerating && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </motion.div>
        )}
        {ideas.length > 0 && !isGenerating && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {ideas.map((idea, i) => (
              <IdeaCard key={i} idea={idea} index={i} onCopy={() => handleCopyIdea(idea, i)} copied={copiedIdea === i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function BestTimeTab() {
  const [industry, setIndustry] = useState("")
  const [platform, setPlatform] = useState("instagram")
  const [result, setResult] = useState<BestTimeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleFindBestTime = async () => {
    if (!industry.trim()) return
    setIsLoading(true)
    setResult(null)
    try {
      const data = await apiFetch<BestTimeResponse>("/ai/best-time", {
        method: "POST",
        body: JSON.stringify({ industry: industry.trim(), platform }),
      })
      setResult(data)
      toast.success("Best time found!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to find best time")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 py-1">
      <p className="text-xs text-muted">Find the optimal posting time for your industry and platform.</p>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs text-muted">Industry</Label>
          <Input value={industry} onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., Fintech, Health..." list="industry-suggestions-bt"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFindBestTime() } }} />
          <datalist id="industry-suggestions-bt">
            {INDUSTRIES.map((ind) => (<option key={ind} value={ind} />))}
          </datalist>
        </div>
        <div className="w-36 space-y-1.5">
          <Label className="text-xs text-muted">Platform</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORMS.filter((p) => p.value !== "all").map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={handleFindBestTime} disabled={isLoading || !industry.trim()} className="w-full gap-2">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
        {isLoading ? "Finding..." : "Find Best Time"}
      </Button>
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </motion.div>
        )}
        {result && !isLoading && (
          <motion.div key="result" initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3 }}
            className="rounded-lg border border-accent/20 bg-accent/[0.03] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              <h4 className="text-sm font-semibold text-primary">Recommended Time</h4>
            </div>
            <p className="text-base font-bold text-accent">{result.recommendation}</p>
            <Separator className="bg-border/40" />
            <p className="text-xs text-secondary leading-relaxed">{result.reasoning}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AIAssistantPanel({ open, onOpenChange, currentContent, selectedPlatforms, onInsertContent }: AIAssistantPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            AI Assistant
          </DialogTitle>
          <DialogDescription>
            Generate content, get variations, find ideas, and optimize timing
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="generate" className="mt-1">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="generate" className="text-xs gap-1.5">
              <Wand2 className="h-3.5 w-3.5" />Generate
            </TabsTrigger>
            <TabsTrigger value="variations" className="text-xs gap-1.5">
              <Copy className="h-3.5 w-3.5" />Variations
            </TabsTrigger>
            <TabsTrigger value="ideas" className="text-xs gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />Ideas
            </TabsTrigger>
            <TabsTrigger value="besttime" className="text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" />Best Time
            </TabsTrigger>
          </TabsList>
          <ScrollArea className="max-h-[55vh] pr-1">
            <TabsContent value="generate">
              <GenerateTab onInsertContent={onInsertContent} selectedPlatforms={selectedPlatforms} />
            </TabsContent>
            <TabsContent value="variations">
              <VariationsTab currentContent={currentContent} onInsertContent={onInsertContent} />
            </TabsContent>
            <TabsContent value="ideas">
              <IdeasTab onInsertContent={onInsertContent} />
            </TabsContent>
            <TabsContent value="besttime">
              <BestTimeTab />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
