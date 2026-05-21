import { useState } from "react"
import { motion } from "framer-motion"
import {
  Users, Star, Search, Filter, Globe, Heart,
  MessageCircle, TrendingUp, ExternalLink, Plus,
  MapPin, Link,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface Influencer {
  id: string; name: string; handle: string; platform: string
  category: string; followers: number; engagement_rate: number
  location: string; bio: string; tags: string[]
  reach_score: number; is_verified: boolean
}

interface Campaign {
  id: string; name: string
  status: "active" | "completed" | "draft" | "paused"
  influencers: number; budget: string
  start_date: string; end_date: string; platform: string
}

const mockInfluencers: Influencer[] = [
  {id:"i1",name:"Sarah Mitchell",handle:"@sarahmtech",platform:"instagram",category:"Tech",followers:45200,engagement_rate:4.2,location:"San Francisco, CA",bio:"Tech enthusiast and content creator.",tags:["tech","saas","productivity"],reach_score:85,is_verified:true},
  {id:"i2",name:"Marcus Johnson",handle:"@marcusj",platform:"twitter",category:"Marketing",followers:28300,engagement_rate:3.8,location:"New York, NY",bio:"Digital marketing strategist.",tags:["marketing","social-media"],reach_score:78,is_verified:true},
  {id:"i3",name:"Emily Chen",handle:"@emilycreates",platform:"instagram",category:"Design",followers:89700,engagement_rate:5.1,location:"Los Angeles, CA",bio:"Designer and content creator.",tags:["design","lifestyle"],reach_score:92,is_verified:true},
  {id:"i4",name:"David Park",handle:"@davidparksays",platform:"linkedin",category:"Finance",followers:15600,engagement_rate:6.3,location:"Chicago, IL",bio:"Finance professional.",tags:["finance","business"],reach_score:71,is_verified:false},
  {id:"i5",name:"Jessica Williams",handle:"@jesswillsocial",platform:"twitter",category:"Social Media",followers:34100,engagement_rate:4.5,location:"Austin, TX",bio:"Social media manager.",tags:["social-media","content"],reach_score:81,is_verified:true},
  {id:"i6",name:"Alex Rivera",handle:"@alexrivtech",platform:"youtube",category:"Tech Reviews",followers:124500,engagement_rate:7.2,location:"Seattle, WA",bio:"Tech reviewer.",tags:["tech","reviews"],reach_score:94,is_verified:true},
]

const mockCampaigns: Campaign[] = [
  {id:"c1",name:"Summer Launch 2026",status:"active",influencers:4,budget:"$5,000",start_date:"2026-05-01",end_date:"2026-06-30",platform:"instagram"},
  {id:"c2",name:"Brand Awareness Q3",status:"draft",influencers:0,budget:"$5,000",start_date:"2026-07-01",end_date:"2026-09-30",platform:"twitter"},
  {id:"c3",name:"Product Review Campaign",status:"completed",influencers:6,budget:"$3,500",start_date:"2026-03-01",end_date:"2026-04-30",platform:"youtube"},
  {id:"c4",name:"LinkedIn Thought Leadership",status:"active",influencers:3,budget:"$2,000",start_date:"2026-04-15",end_date:"2026-06-15",platform:"linkedin"},
]

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } } }

function formatFollowers(n: number) { return n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : n.toString() }

function getStatusVariant(s: Campaign["status"]) { return s==="active"?"success":s==="completed"?"secondary":s==="paused"?"destructive":"default" }

function StatsCard({icon,label,value,color}:{icon:React.ReactNode;label:string;value:string|number;color:string}) {
  return <Card><CardContent className="p-4 flex items-center gap-3"><div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0",color)}>{icon}</div><div><p className="text-xs text-muted">{label}</p><p className="text-lg font-bold text-primary">{value}</p></div></CardContent></Card>
}

function InfluencerCard({inf}:{inf:Influencer}) {
  return <motion.div variants={itemVariants}>
    <Card className="transition-all hover:border-border-hover">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white text-sm font-bold">
            {inf.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold text-primary">{inf.name}</h3>
              {inf.is_verified ? <Badge variant="success" className="text-[8px] px-1 py-0">Verified</Badge> : null}
            </div>
            <p className="text-xs text-muted mb-1">{inf.handle}</p>
            <p className="text-xs text-secondary line-clamp-2 mb-2">{inf.bio}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
              <span><Users className="h-3 w-3 inline mr-0.5"/>{formatFollowers(inf.followers)}</span>
              <span><Heart className="h-3 w-3 inline mr-0.5 text-green"/>{inf.engagement_rate}%</span>
              <span><MapPin className="h-3 w-3 inline mr-0.5"/>{inf.location}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {inf.tags.map(t=><span key={t} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">#{t}</span>)}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-sm font-bold",inf.reach_score>=90?"bg-green/10 text-green":inf.reach_score>=75?"bg-accent/10 text-accent":"bg-amber/10 text-amber")}>
              {inf.reach_score}
            </div>
            <span className="text-[10px] text-muted">Reach</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
}

function CampaignCard({camp}:{camp:Campaign}) {
  return <motion.div variants={itemVariants}>
    <Card className="transition-all hover:border-border-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-primary">{camp.name}</h3>
              <Badge variant={getStatusVariant(camp.status)} className="text-[10px]">{camp.status}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
              <span>{camp.platform}</span>
              <span><Users className="h-3 w-3 inline mr-0.5"/>{camp.influencers} influencers</span>
              <span>Budget: {camp.budget}</span>
              <span>{camp.start_date} to {camp.end_date}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0 gap-1"><ExternalLink className="h-3.5 w-3.5"/>View</Button>
        </div>
      </CardContent>
    </Card>
  </motion.div>
}

function EmptyInfluencers() {
  return <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="flex flex-col items-center justify-center py-20 text-center">
    <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4"><Users className="h-8 w-8 text-muted"/></div>
    <h3 className="text-lg font-semibold text-primary mb-1">No influencers yet</h3>
    <p className="text-sm text-muted max-w-xs">Add influencers to build your database.</p>
  </motion.div>
}

function EmptyCampaigns() {
  return <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="flex flex-col items-center justify-center py-16 text-center">
    <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4"><Star className="h-8 w-8 text-muted"/></div>
    <h3 className="text-lg font-semibold text-primary mb-1">No campaigns yet</h3>
    <p className="text-sm text-muted max-w-xs">Create a campaign to track collaborations.</p>
  </motion.div>
}

export function InfluencersPage() {
  const [influencers] = useState<Influencer[]>(mockInfluencers)
  const [campaigns] = useState<Campaign[]>(mockCampaigns)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredInf = searchQuery ? influencers.filter(i=>i.name.toLowerCase().includes(searchQuery.toLowerCase())||i.handle.toLowerCase().includes(searchQuery.toLowerCase())) : influencers
  const totalReach = influencers.reduce((s,i)=>s+i.followers,0)
  const avgEng = influencers.length ? (influencers.reduce((s,i)=>s+i.engagement_rate,0)/influencers.length).toFixed(1) : "0"

  return <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 p-6 pb-12">
    <motion.div variants={itemVariants}>
      <h1 className="text-2xl font-bold text-primary tracking-tight">Influencers</h1>
      <p className="text-sm text-muted mt-1">Discover and manage influencer relationships for your brand</p>
    </motion.div>

    <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatsCard icon={<Users className="h-5 w-5 text-accent"/>} label="Total Influencers" value={influencers.length} color="bg-accent/10"/>
      <StatsCard icon={<Globe className="h-5 w-5 text-accent"/>} label="Total Reach" value={formatFollowers(totalReach)} color="bg-accent/10"/>
      <StatsCard icon={<Heart className="h-5 w-5 text-green"/>} label="Avg Engagement" value={avgEng+"%"} color="bg-green/10"/>
      <StatsCard icon={<Star className="h-5 w-5 text-amber"/>} label="Active Campaigns" value={campaigns.filter(c=>c.status==="active").length} color="bg-amber/10"/>
    </motion.div>

    <motion.div variants={itemVariants}>
      <Tabs defaultValue="database" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="database" className="gap-2"><Users className="h-4 w-4"/>Database</TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2"><Star className="h-4 w-4"/>Campaigns</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="database" className="mt-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"/>
              <Input placeholder="Search influencers..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="pl-9"/>
            </div>
            <Button className="gap-2 shrink-0"><Plus className="h-4 w-4"/>Add Influencer</Button>
          </div>
          {filteredInf.length===0 ? <EmptyInfluencers/> : <div className="space-y-2">{filteredInf.map(i=><InfluencerCard key={i.id} inf={i}/>)}</div>}
        </TabsContent>
        <TabsContent value="campaigns" className="mt-0">
          <div className="flex items-center justify-end mb-4"><Button className="gap-2"><Plus className="h-4 w-4"/>New Campaign</Button></div>
          {campaigns.length===0 ? <EmptyCampaigns/> : <div className="space-y-2">{campaigns.map(c=><CampaignCard key={c.id} camp={c}/>)}</div>}
        </TabsContent>
      </Tabs>
    </motion.div>
  </motion.div>
}
