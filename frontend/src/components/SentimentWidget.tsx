import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Loader2, BarChart3, Smile, Frown, Meh } from "lucide-react"
import { toast } from "sonner"
import { apiFetch, cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral"
  score: number
  analysis: string
}

export function SentimentWidget() {
  const [text, setText] = useState("")
  const [result, setResult] = useState<SentimentResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setIsAnalyzing(true)
    setResult(null)
    try {
      const data = await apiFetch<SentimentResult>("/ai/sentiment", {
        method: "POST",
        body: JSON.stringify({ text: text.trim() }),
      })
      setResult(data)
      toast.success("Sentiment analysis complete")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const sentimentConfig = {
    positive: {
      icon: Smile,
      label: "Positive",
      color: "text-green",
      bg: "bg-green/10 border-green/20",
      badgeBg: "bg-green/15 text-green border-green/20",
      barColor: "bg-green",
    },
    negative: {
      icon: Frown,
      label: "Negative",
      color: "text-red",
      bg: "bg-red/10 border-red/20",
      badgeBg: "bg-red/15 text-red border-red/20",
      barColor: "bg-red",
    },
    neutral: {
      icon: Meh,
      label: "Neutral",
      color: "text-amber",
      bg: "bg-amber/10 border-amber/20",
      badgeBg: "bg-amber/15 text-amber border-amber/20",
      barColor: "bg-amber",
    },
  }

  const sent = result ? sentimentConfig[result.sentiment] : null

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Sentiment Analyzer
            </CardTitle>
            <CardDescription>
              Analyze the sentiment of any text with AI
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type text to analyze its sentiment..."
            className="min-h-[100px] resize-y"
          />
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !text.trim()}
          className="w-full gap-2"
        >
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isAnalyzing ? "Analyzing..." : "Analyze Sentiment"}
        </Button>

        <AnimatePresence mode="wait">
          {isAnalyzing && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-center py-8"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="text-sm text-muted">Analyzing sentiment...</p>
              </div>
            </motion.div>
          )}

          {result && sent && !isAnalyzing && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={cn("rounded-lg border p-5 space-y-4", sent.bg)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", sent.bg)}>
                    <sent.icon className={cn("h-5 w-5", sent.color)} />
                  </div>
                  <div>
                    <Badge variant="outline" className={cn("text-xs font-medium", sent.badgeBg)}>
                      {sent.label}
                    </Badge>
                    <p className="text-xs text-muted mt-1">
                      Confidence: {Math.round(Math.abs(result.score - 0.5) * 200)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Negative</span>
                  <span className="text-muted">Positive</span>
                </div>
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden relative">
                  <motion.div
                    initial={{ width: `${result.score * 100}%` }}
                    animate={{ width: `${result.score * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn("h-full rounded-full", sent.barColor)}
                    style={{ width: `${result.score * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">0.0</span>
                  <span className="text-muted">0.5</span>
                  <span className="text-muted">1.0</span>
                </div>
              </div>

              {result.analysis && (
                <div className="border-t border-border/50 pt-3">
                  <p className="text-xs text-secondary leading-relaxed">
                    {result.analysis}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
