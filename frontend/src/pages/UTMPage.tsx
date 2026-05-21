import { useState } from "react"
import { motion } from "framer-motion"
import {
  Link2,
  Copy,
  CheckCircle2,
  Plus,
  Trash2,
  ExternalLink,
  Clock,
  Tag,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"

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

interface UTMTemplate {
  id: string
  name: string
  source: string
  medium: string
  campaign: string
  term: string
  content: string
  baseUrl: string
  createdAt: string
}

const defaultTemplates: UTMTemplate[] = [
  {
    id: "1",
    name: "Twitter Spring Launch",
    source: "twitter",
    medium: "social",
    campaign: "spring-launch-2026",
    term: "",
    content: "hero-banner",
    baseUrl: "https://example.com/landing",
    createdAt: "2026-05-10",
  },
  {
    id: "2",
    name: "Newsletter May",
    source: "newsletter",
    medium: "email",
    campaign: "may-newsletter",
    term: "early-access",
    content: "signup-cta",
    baseUrl: "https://example.com/signup",
    createdAt: "2026-05-12",
  },
]

export function UTMPage() {
  const [templates, setTemplates] = useState<UTMTemplate[]>(defaultTemplates)
  const [showBuilder, setShowBuilder] = useState(false)

  const [templateName, setTemplateName] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [source, setSource] = useState("")
  const [medium, setMedium] = useState("")
  const [campaign, setCampaign] = useState("")
  const [term, setTerm] = useState("")
  const [utmContent, setUtmContent] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const buildUrl = (): string => {
    if (!baseUrl) return ""
    const params = new URLSearchParams()
    if (source) params.set("utm_source", source)
    if (medium) params.set("utm_medium", medium)
    if (campaign) params.set("utm_campaign", campaign)
    if (term) params.set("utm_term", term)
    if (utmContent) params.set("utm_content", utmContent)
    const separator = baseUrl.includes("?") ? "&" : "?"
    return `${baseUrl}${separator}${params.toString()}`
  }

  const generatedUrl = buildUrl()

  const resetBuilder = () => {
    setTemplateName("")
    setBaseUrl("")
    setSource("")
    setMedium("")
    setCampaign("")
    setTerm("")
    setUtmContent("")
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !baseUrl.trim()) return
    setTemplates((prev) => [
      ...prev,
      { id: String(Date.now()), name: templateName.trim(), source, medium, campaign, term, content: utmContent, baseUrl: baseUrl.trim(), createdAt: new Date().toISOString().slice(0, 10) },
    ])
    resetBuilder()
    setShowBuilder(false)
  }

  const handleDelete = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(url.slice(0, 30))
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8 p-6 pb-12">
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">UTM Builder</h1>
          <p className="text-sm text-muted mt-1">Build and manage UTM-tagged URLs for your campaigns</p>
        </div>
        <Button onClick={() => { resetBuilder(); setShowBuilder(!showBuilder) }} className="gap-2 shrink-0">
          {showBuilder ? "Cancel" : <><Plus className="h-4 w-4" /> New URL</>}
        </Button>
      </motion.div>

      {showBuilder && (
        <motion.div variants={itemVariants} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4 text-accent" />
                Build New UTM URL
              </CardTitle>
              <CardDescription>Fill in the fields below to generate a UTM-tagged URL</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="utm-name">Template Name</Label>
                <Input id="utm-name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g., Twitter Spring Launch" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="utm-base-url">Base URL</Label>
                <Input id="utm-base-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://example.com/landing" />
              </div>
              <Separator />
              <div className="text-xs font-medium text-secondary flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-accent" />
                UTM Parameters
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="utm-source">Source <span className="text-red">*</span></Label>
                  <Input id="utm-source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="twitter, facebook, google" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utm-medium">Medium</Label>
                  <Input id="utm-medium" value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="social, email, cpc" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utm-campaign">Campaign</Label>
                  <Input id="utm-campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="spring-launch-2026" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utm-term">Term</Label>
                  <Input id="utm-term" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="early-access" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utm-content">Content</Label>
                  <Input id="utm-content" value={utmContent} onChange={(e) => setUtmContent(e.target.value)} placeholder="hero-banner, signup-cta" />
                </div>
              </div>
              {generatedUrl && (
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-2">
                  <Label className="text-xs text-accent font-medium">Generated URL</Label>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-primary break-all font-mono bg-surface-2 rounded p-2">{generatedUrl}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-0.5" onClick={() => handleCopy(generatedUrl)} title="Copy URL">
                      {copiedId === generatedUrl.slice(0, 30) ? <CheckCircle2 className="h-4 w-4 text-green" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSaveTemplate} disabled={!templateName.trim() || !baseUrl.trim()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Save Template
                </Button>
                <Button variant="secondary" onClick={resetBuilder}>Reset</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-14 w-14 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
                <Link2 className="h-7 w-7 text-muted" />
              </div>
              <p className="text-sm font-medium text-primary mb-1">No UTM templates yet</p>
              <p className="text-xs text-muted mb-5">Create your first UTM-tagged URL template</p>
              <Button onClick={() => { resetBuilder(); setShowBuilder(true) }} variant="secondary" size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
              const params = new URLSearchParams()
              if (template.source) params.set("utm_source", template.source)
              if (template.medium) params.set("utm_medium", template.medium)
              if (template.campaign) params.set("utm_campaign", template.campaign)
              if (template.term) params.set("utm_term", template.term)
              if (template.content) params.set("utm_content", template.content)
              const sep = template.baseUrl.includes("?") ? "&" : "?"
              const fullUrl = `${template.baseUrl}${sep}${params.toString()}`

              return (
                <Card key={template.id} className="transition-colors hover:border-border-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-primary">{template.name}</h3>
                          <Badge variant="secondary" className="text-[10px]">{template.source || "—"} / {template.medium || "—"}</Badge>
                          <Badge variant="info" className="text-[10px]">{template.campaign || "no campaign"}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted">
                          {template.term && <span className="flex items-center gap-1"><Tag className="h-3 w-3" />term: {template.term}</span>}
                          {template.content && <span className="flex items-center gap-1"><Tag className="h-3 w-3" />content: {template.content}</span>}
                          <span className="flex items-center gap-1"><ExternalLink className="h-3 w-3" />{template.baseUrl}</span>
                        </div>
                        <p className="text-xs text-primary font-mono bg-surface-2 rounded p-2 break-all">{fullUrl}</p>
                        <div className="flex items-center gap-1 text-[10px] text-muted">
                          <Clock className="h-3 w-3" />Created {template.createdAt}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(fullUrl)} title="Copy URL">
                          {copiedId === fullUrl.slice(0, 30) ? <CheckCircle2 className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted hover:text-red" onClick={() => handleDelete(template.id)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
