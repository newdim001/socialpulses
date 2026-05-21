import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/utils"

const EXAMPLE_CONTENT = "I just launched my new social media management tool! 🚀\n\nAfter months of development, SocialPulses is finally here. Schedule posts across Instagram, Twitter, LinkedIn, and more - all from one dashboard.\n\nKey features:\n- Multi-platform scheduling\n- AI-powered content repurposing\n- Smart analytics \u0026 reporting\n- Team collaboration\n\nTry it free at app.socialpulses.io\n\n#SocialMedia #ProductLaunch #SaaS"

const FORMAT_NAMES: Record<string, string> = {
  blog_post: "Blog Post",
  tweet_thread: "Tweet Thread",
  linkedin_post: "LinkedIn Post",
  instagram_caption: "Instagram Caption",
  youtube_transcript: "YouTube Script",
  newsletter: "Newsletter",
}

const VALID_FORMATS = Object.keys(FORMAT_NAMES)

const FORMAT_ICONS: Record<string, string> = {
  blog_post: "📝",
  tweet_thread: "🐦",
  linkedin_post: "💼",
  instagram_caption: "📸",
  youtube_transcript: "🎬",
  newsletter: "📫",
}

export function RepurposePage() {
  const [sourceFormat, setSourceFormat] = useState("blog_post")
  const [content, setContent] = useState("")
  const [targetFormats, setTargetFormats] = useState<string[]>(["tweet_thread", "linkedin_post"])
  const [results, setResults] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)

  const toggleFormat = (fmt: string) => {
    setTargetFormats(prev =>
      prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]
    )
  }

  const handleRepurpose = async () => {
    if (!content.trim()) return
    setLoading(true)
    setError("")
    setResults(null)
    try {
      const data = await apiFetch<{ results: Record<string, string> }>("/ai/repurpose", {
        method: "POST",
        body: JSON.stringify({
          content: content.trim(),
          source_format: sourceFormat,
          target_formats: targetFormats,
        }),
      })
      setResults(data.results)
    } catch (e: any) {
      setError(e.message || "Request failed")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (fmt: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedFormat(fmt)
      setTimeout(() => setCopiedFormat(null), 2000)
    } catch {}
  }

  const availableTargets = VALID_FORMATS.filter(f => f !== sourceFormat)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Repurposer</h1>
        <p className="text-muted-foreground mt-1">
          Turn one piece of content into multiple formats with one click
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Source format</Label>
            <div className="flex flex-wrap gap-2">
              {VALID_FORMATS.map(fmt => (
                <Badge
                  key={fmt}
                  variant={sourceFormat === fmt ? "default" : "outline"}
                  className="cursor-pointer text-sm py-1.5 px-3"
                  onClick={() => {
                    setSourceFormat(fmt)
                    setResults(null)
                  }}
                >
                  {FORMAT_ICONS[fmt]} {FORMAT_NAMES[fmt]}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">
                Paste your {FORMAT_NAMES[sourceFormat].toLowerCase()} content
              </Label>
              <button
                type="button"
                onClick={() => {
                  setContent(EXAMPLE_CONTENT)
                  setResults(null)
                }}
                className="text-xs text-accent hover:underline"
              >
                Try with example →
              </button>
            </div>
            <Textarea
              value={content}
              onChange={e => {
                setContent(e.target.value)
                setResults(null)
              }}
              placeholder={"Paste your " + FORMAT_NAMES[sourceFormat].toLowerCase() + " content here..."}
              className="min-h-[180px]"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Repurpose into</Label>
            <div className="flex flex-wrap gap-2">
              {availableTargets.map(fmt => (
                <Badge
                  key={fmt}
                  variant={targetFormats.includes(fmt) ? "default" : "outline"}
                  className={"cursor-pointer text-sm py-1.5 px-3 " +
                    (targetFormats.includes(fmt)
                      ? "bg-accent text-accent-foreground"
                      : "opacity-60 hover:opacity-100")}
                  onClick={() => toggleFormat(fmt)}
                >
                  {FORMAT_ICONS[fmt]} {FORMAT_NAMES[fmt]}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            onClick={handleRepurpose}
            disabled={loading || !content.trim() || targetFormats.length === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                Repurposing...
              </>
            ) : (
              "✨ Repurpose Content"
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500/30">
          <CardContent className="p-4 text-red-500">{error}</CardContent>
        </Card>
      )}

      {results && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Results</h2>
          {Object.entries(results).map(([fmt, text]) => (
            <Card key={fmt}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {FORMAT_ICONS[fmt]} {FORMAT_NAMES[fmt]}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(fmt, text || "")}
                    className="text-xs"
                  >
                    {copiedFormat === fmt ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {text ? (
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                    {text}
                  </pre>
                ) : (
                  <p className="text-muted-foreground italic">
                    Failed to generate — check API key
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
