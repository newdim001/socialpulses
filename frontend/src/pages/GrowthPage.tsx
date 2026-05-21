import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiFetch } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Sparkles,
  Lightbulb,
  Hash,
  Music,
  Image,
  Users,
  Target,
  Clock,
  ArrowUpRight,
  Zap,
  Search,
  Globe,
  ChevronRight,
  Loader2,
  BarChart3,
  Heart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface GrowthStatsResponse {
  content_score: number
  total_posts: number
  published_posts: number
  draft_posts: number
  connected_accounts: number
  trending_topics_count: number
  optimal_times_count: number
  engagement_rate: number
}

interface TrendItem {
  id: string
  keyword: string
  platform: string
  volume: number
  growth: number
  category: string
  suggestedContent: string
}

interface ContentSuggestion {
  id: string
  type: 'reel' | 'carousel' | 'image' | 'story' | 'tweet'
  title: string
  description: string
  confidence: number
  trendingHashtags: string[]
  suggestedSounds?: string[]
}

interface ScheduleRecommendation {
  day: string
  time: string
  platform: string
  score: number
  reason: string
}

interface GrowthMetric {
  label: string
  value: string
  change: number
  trend: 'up' | 'down' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

// StatCard (matches AffiliatePage pattern)
function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <motion.div variants={item} className="flex-1 min-w-[180px]">
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted uppercase tracking-wider">
                {label}
              </p>
              <p className="text-2xl font-bold tracking-tight text-primary">
                {value}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-surface-3">
              <Icon className="h-5 w-5 text-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function GrowthPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [generating, setGenerating] = useState(false)

  const statsQuery = useQuery<GrowthStatsResponse>({
    queryKey: ['growth-stats'],
    queryFn: () => apiFetch<GrowthStatsResponse>('/growth/stats'),
    refetchInterval: 60000,
  })

  const trendingQuery = useQuery<{trends: TrendItem[]}>({
    queryKey: ['growth-trending'],
    queryFn: () => apiFetch<{trends: TrendItem[]}>('/growth/trending'),
    refetchInterval: 300000,
  })

  const bestTimesQuery = useQuery<{recommendations: ScheduleRecommendation[]}>({
    queryKey: ['growth-best-times'],
    queryFn: () => apiFetch<{recommendations: ScheduleRecommendation[]}>('/growth/best-times'),
    refetchInterval: 300000,
  })

  const contentIdeasMutation = useMutation({
    mutationFn: (data: {industry?: string, count?: number, platform?: string}) =>
      apiFetch<{ideas: ContentSuggestion[]}>('/growth/content-ideas', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })

  const [contentIdeas, setContentIdeas] = useState<ContentSuggestion[]>([])
  const stats = statsQuery.data
  const trends = trendingQuery.data?.trends || []
  const scheduleRecommendations = bestTimesQuery.data?.recommendations || []
  const loading = statsQuery.isLoading || trendingQuery.isLoading || bestTimesQuery.isLoading

  const metrics: GrowthMetric[] = [
    {
      label: 'Content Score',
      value: stats ? stats.content_score + '/100' : '--',
      change: stats?.content_score || 0,
      trend: 'neutral',
      icon: Target,
    },
    {
      label: 'Optimal Post Times',
      value: (stats?.optimal_times_count || scheduleRecommendations.length) + ' found',
      change: 0,
      trend: 'neutral',
      icon: Clock,
    },
    {
      label: 'Trending Topics',
      value: String(trends.length || stats?.trending_topics_count || 0),
      change: 0,
      trend: 'up',
      icon: TrendingUp,
    },
    {
      label: 'Engagement Rate',
      value: stats ? stats.engagement_rate + '%' : '--',
      change: 0,
      trend: 'neutral',
      icon: Heart,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-secondary">Analyzing growth opportunities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-accent" />
              Growth Engine
            </h1>
            <p className="text-sm text-muted mt-1">
              AI-powered insights to grow your audience organically
            </p>
          </div>
          <Button
            className="bg-accent hover:bg-accent/90 text-white"
            onClick={() => {
              setGenerating(true)
              contentIdeasMutation.mutate(
                { industry: "Social Media Marketing", count: 4, platform: "instagram" },
                {
                  onSuccess: (data: any) => {
                    setContentIdeas(data.ideas || [])
                    setGenerating(false)
                    setActiveTab('content')
                  },
                  onError: () => setGenerating(false)
                }
              )
            }}
            disabled={generating}
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" />Generate Ideas</>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-4">
          {metrics.map(m => (
            <StatCard
              key={m.label}
              icon={m.icon}
              label={m.label}
              value={m.value}
            />
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-surface-2 border border-border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-surface-3">
              <TrendingUp className="w-4 h-4 mr-2" />Trending Topics
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-surface-3">
              <Lightbulb className="w-4 h-4 mr-2" />Content Ideas
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-surface-3">
              <Clock className="w-4 h-4 mr-2" />Best Times
            </TabsTrigger>
            <TabsTrigger value="competitor" className="data-[state=active]:bg-surface-3">
              <Search className="w-4 h-4 mr-2" />Competitor Intel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {trends.map(t => (
              <Card key={t.id} className="border-border hover:border-accent/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">
                          <TrendingUp className="w-3 h-3 mr-1" />+{t.growth}% growth
                        </Badge>
                        <Badge className="bg-surface-3 text-secondary border-border text-xs">{t.platform}</Badge>
                        <Badge className="bg-surface-3 text-secondary border-border text-xs">{t.category}</Badge>
                      </div>
                      <h3 className="text-lg font-medium text-primary">{t.keyword}</h3>
                      <p className="text-sm text-secondary">{t.suggestedContent}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs text-muted">Volume</p>
                      <p className="text-lg font-semibold text-primary">{(t.volume / 1000).toFixed(1)}K</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            {contentIdeas.length === 0 && (
              <Card className="border-border">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-3 flex items-center justify-center">
                    <Lightbulb className="w-8 h-8 text-muted" />
                  </div>
                  <h3 className="text-lg font-medium text-primary mb-2">Generate Content Ideas</h3>
                  <p className="text-secondary max-w-md mx-auto mb-6">
                    Click Generate Ideas to get AI-powered content suggestions tailored to your industry and audience.
                  </p>
                </CardContent>
              </Card>
            )}
            {contentIdeas.map(s => (
              <Card key={s.id} className="border-border hover:border-accent/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      {s.type === 'reel' && <Music className="w-5 h-5 text-accent" />}
                      {s.type === 'carousel' && <Image className="w-5 h-5 text-accent" />}
                      {s.type === 'tweet' && <BarChart3 className="w-5 h-5 text-accent" />}
                      {s.type === 'story' && <Zap className="w-5 h-5 text-accent" />}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-medium text-primary">{s.title}</h3>
                        <Badge className="bg-green/10 text-green border-green/20">{s.confidence}% match</Badge>
                        <Badge className="bg-surface-3 text-secondary border-border capitalize">{s.type}</Badge>
                      </div>
                      <p className="text-sm text-secondary">{s.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {s.trendingHashtags.map(tag => (
                          <Badge key={tag} className="bg-surface-3 text-secondary border-border text-xs">{tag}</Badge>
                        ))}
                      </div>
                      {s.suggestedSounds && (
                        <div className="flex items-center gap-2 mt-1">
                          <Music className="w-3 h-3 text-muted" />
                          <span className="text-xs text-muted">{s.suggestedSounds[0]}</span>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80 shrink-0">
                      Use Idea<ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-primary text-lg">Optimal Posting Times</CardTitle>
                <CardDescription>Based on your audience activity in UAE timezone</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {scheduleRecommendations.map(r => (
                    <div key={`${r.day}-${r.time}`} className="p-4 rounded-xl bg-surface-3 border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-accent/10 text-accent border-accent/20">{r.platform}</Badge>
                        <span className="text-sm font-medium text-green">{r.score}%</span>
                      </div>
                      <p className="text-lg font-semibold text-primary">{r.day}</p>
                      <p className="text-sm text-secondary">{r.time}</p>
                      <p className="text-xs text-muted mt-2">{r.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitor" className="space-y-4">
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-3 flex items-center justify-center">
                  <Search className="w-8 h-8 text-muted" />
                </div>
                <h3 className="text-lg font-medium text-primary mb-2">Connect Your Accounts</h3>
                <p className="text-secondary max-w-md mx-auto mb-6">
                  Connect your social accounts to get competitor analysis, benchmark performance,
                  and discover gaps in your content strategy.
                </p>
                <Button className="bg-accent hover:bg-accent/90 text-white">
                  <Target className="w-4 h-4 mr-2" />Analyze Competitors
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border hover:border-accent/30 transition-colors cursor-pointer">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                <Hash className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-primary font-medium mb-1">Trending Hashtags</h3>
              <p className="text-sm text-secondary">Discover trending hashtags in your niche</p>
            </CardContent>
          </Card>
          <Card className="border-border hover:border-accent/30 transition-colors cursor-pointer">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                <Globe className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-primary font-medium mb-1">Location Trends</h3>
              <p className="text-sm text-secondary">What's trending in Dubai, UAE, and target markets</p>
            </CardContent>
          </Card>
          <Card className="border-border hover:border-accent/30 transition-colors cursor-pointer">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-primary font-medium mb-1">Audience Insights</h3>
              <p className="text-sm text-secondary">Understand follower interests and preferences</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}

export default GrowthPage
