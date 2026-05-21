import { useState } from "react"
import { motion } from "framer-motion"
import { Upload, FileText, Calendar, Info, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

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

export function BulkUploadPage() {
  const [bulkText, setBulkText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    count: number
    message: string
  } | null>(null)

  const parsedPosts = bulkText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const scheduleMatch = line.match(/\|SCHEDULE:(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\|/)
      const content = scheduleMatch ? line.replace(scheduleMatch[0], "").trim() : line
      return {
        content,
        scheduledAt: scheduleMatch ? scheduleMatch[1] : null,
      }
    })

  const handleSubmit = async () => {
    if (!bulkText.trim()) return
    setIsSubmitting(true)
    setResult(null)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    setResult({
      success: true,
      count: parsedPosts.length,
      message: `${parsedPosts.length} post${parsedPosts.length !== 1 ? "s" : ""} queued for publishing.`,
    })
    setIsSubmitting(false)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 pb-12"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Bulk Upload</h1>
        <p className="text-sm text-muted mt-1">
          Draft multiple posts at once with optional scheduling
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-accent" />
              Format Guide
            </CardTitle>
            <CardDescription>
              Enter one post per line. Use{" "}
              <code className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-accent">
                |SCHEDULE:YYYY-MM-DD HH:MM|
              </code>{" "}
              to schedule a specific post.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-surface-2 border border-border p-4 text-xs text-secondary font-mono leading-relaxed">
              <p>Check out our new product launch! 🚀</p>
              <p className="text-muted mt-1">
                Exciting announcement coming next week |SCHEDULE:2026-05-20 09:00|
              </p>
              <p className="text-muted mt-1">
                Behind the scenes look at our team |SCHEDULE:2026-05-22 15:30|
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-accent" />
              Enter Posts
            </CardTitle>
            <CardDescription>
              Paste your bulk content below — one post per line
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Post content here...\n\nOr with scheduling:\nPost text |SCHEDULE:2026-05-20 09:00|`}
              className="min-h-[240px] font-mono text-sm"
            />

            {bulkText.trim() && (
              <div className="rounded-lg border border-border bg-surface-2/50 p-3">
                <p className="text-xs text-muted mb-2">
                  Parsed {parsedPosts.length} post{parsedPosts.length !== 1 ? "s" : ""}:
                </p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {parsedPosts.map((post, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded bg-surface-2 p-2 text-xs"
                    >
                      <span className="shrink-0 w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-primary truncate">{post.content}</p>
                        {post.scheduledAt && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-accent mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {post.scheduledAt}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result && (
              <div
                className={`rounded-lg border p-3 text-xs flex items-center gap-2 ${
                  result.success
                    ? "border-green/20 bg-green/10 text-green"
                    : "border-red/20 bg-red/10 text-red"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {result.message}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!bulkText.trim() || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isSubmitting ? "Uploading..." : "Upload Posts"}
              </Button>
              {parsedPosts.filter((p) => p.scheduledAt).length > 0 && (
                <Badge variant="info" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {parsedPosts.filter((p) => p.scheduledAt).length} scheduled
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
