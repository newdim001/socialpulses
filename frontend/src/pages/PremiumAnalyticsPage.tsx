import { motion } from "framer-motion"
import {
  BarChart3,
  Tags,
  FileText,
  Sparkles,
  TrendingUp,
  Users,
  Activity,
  Eye,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

const premiumStatCards = [
  { label: "Total Impressions", value: "\u2014", icon: Eye, color: "text-accent", bgClass: "bg-accent/10" },
  { label: "Total Engagement", value: "\u2014", icon: Activity, color: "text-green", bgClass: "bg-green/10" },
  { label: "Likes", value: "\u2014", icon: Heart, color: "text-red", bgClass: "bg-red/10" },
  { label: "Comments", value: "\u2014", icon: MessageCircle, color: "text-blue", bgClass: "bg-blue/10" },
  { label: "Shares", value: "\u2014", icon: Share2, color: "text-amber", bgClass: "bg-amber/10" },
]

function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {premiumStatCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-primary mt-2">{stat.value}</p>
                </div>
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${stat.bgClass}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            Advanced Analytics
          </CardTitle>
          <CardDescription>
            Deep-dive metrics and custom date range comparisons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-accent/60" />
            </div>
            <p className="text-sm font-medium text-primary">Premium analytics coming soon</p>
            <p className="text-xs text-muted mt-1 max-w-xs">
              Upgrade your plan to unlock advanced analytics including custom date ranges,
              audience demographics, and competitive benchmarking.
            </p>
            <Button variant="secondary" size="sm" className="mt-4">
              Learn More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TagsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Tags className="h-4 w-4 text-accent" />
            Tag Performance
          </CardTitle>
          <CardDescription>
            Analyze performance of hashtags, labels, and content tags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-xl bg-purple/10 flex items-center justify-center mb-4">
              <Tags className="h-8 w-8 text-purple/60" />
            </div>
            <p className="text-sm font-medium text-primary">No tags analyzed yet</p>
            <p className="text-xs text-muted mt-1 max-w-xs">
              Tag analytics will appear once you start tagging your content. Track which
              tags drive the most engagement and reach.
            </p>
            <Badge variant="purple" className="mt-3 text-[10px]">
              coming with content
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ReportsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            Scheduled Reports
          </CardTitle>
          <CardDescription>
            View and manage automated report generation and delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-xl bg-blue/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-blue/60" />
            </div>
            <p className="text-sm font-medium text-primary">No scheduled reports yet</p>
            <p className="text-xs text-muted mt-1 max-w-xs">
              Set up automated reports to be generated and delivered to your inbox on a
              recurring schedule.
            </p>
            <Button variant="secondary" size="sm" className="mt-4">
              Create Report Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-green/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-green" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Audience Report</p>
              <p className="text-xs text-muted">Demographics, growth, retention</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber/10 flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 text-amber" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Performance Report</p>
              <p className="text-xs text-muted">Engagement, reach, impressions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function PremiumAnalyticsPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 pb-12"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-primary tracking-tight">Premium Analytics</h1>
          <Badge variant="default" className="text-[10px] px-2 py-0.5">
            <Sparkles className="h-3 w-3 mr-1" />
            PREMIUM
          </Badge>
        </div>
        <p className="text-sm text-muted">
          Advanced insights and deep-dive analytics for your social media performance
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-2">
              <Tags className="h-4 w-4" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
          <TabsContent value="tags">
            <TagsTab />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
