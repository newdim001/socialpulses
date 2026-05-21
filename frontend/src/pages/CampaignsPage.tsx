import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Target,
  BarChart3,
  DollarSign,
  Search,
  Plus,
  Trash2,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Campaign {
  id: string
  name: string
  description: string
  status: string
  platforms: string[]
  start_date: string
  end_date: string
  budget: string
  posts_count: number
  engagement: number
  impressions: number
}

const mockCampaigns: Campaign[] = [
  { id: 'c1', name: 'Summer Sale 2026', description: 'Promote summer discount campaign across all channels.', status: 'active', platforms: ['instagram', 'twitter'], start_date: '2026-06-01', end_date: '2026-06-30', budget: '$5,000', posts_count: 12, engagement: 3420, impressions: 45000 },
  { id: 'c2', name: 'Product Launch Q3', description: 'Launch campaign for new analytics dashboard feature.', status: 'draft', platforms: ['linkedin', 'twitter'], start_date: '2026-07-15', end_date: '2026-08-15', budget: '$8,000', posts_count: 0, engagement: 0, impressions: 0 },
  { id: 'c3', name: 'Brand Awareness', description: 'Q2 brand awareness initiative targeting tech audience.', status: 'active', platforms: ['instagram', 'facebook', 'linkedin'], start_date: '2026-04-01', end_date: '2026-06-30', budget: '$2,000', posts_count: 24, engagement: 8900, impressions: 120000 },
  { id: 'c4', name: 'Holiday Campaign 2025', description: 'End-of-year holiday campaign.', status: 'completed', platforms: ['instagram', 'twitter', 'facebook'], start_date: '2025-12-01', end_date: '2025-12-31', budget: '$10,000', posts_count: 18, engagement: 12400, impressions: 98000 },
  { id: 'c5', name: 'Influencer Collab', description: 'Collaboration with micro-influencers for product reviews.', status: 'paused', platforms: ['instagram', 'youtube'], start_date: '2026-05-01', end_date: '2026-07-01', budget: '$3,500', posts_count: 6, engagement: 2100, impressions: 34000 },
]

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <motion.div variants={item} className="flex-1 min-w-[180px]">
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold tracking-tight text-primary">{value}</p>
            </div>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CampaignDialog({ open, onOpenChange, campaign }: { open: boolean; onOpenChange: (o: boolean) => void; campaign?: Campaign | null }) {
  const [name, setName] = useState(campaign?.name ?? '')
  const [description, setDescription] = useState(campaign?.description ?? '')
  const [budget, setBudget] = useState(campaign?.budget ?? '')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(campaign?.platforms ?? [])
  const allPlatforms = ['instagram', 'twitter', 'facebook', 'linkedin', 'youtube']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{campaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Sale 2026" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Campaign description" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Budget</label>
            <Input value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. $5,000" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90 text-white">{campaign ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CampaignsPage() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null)
  const q = search.toLowerCase()

  const filtered = mockCampaigns.filter(c => !search || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))

  const totalBudget = mockCampaigns.reduce((s, c) => s + (parseInt(c.budget.replace(/[$,]/g, ''), 10) || 0), 0)
  const totalImpressions = mockCampaigns.reduce((s, c) => s + c.impressions, 0)
  const activeCount = mockCampaigns.filter(c => c.status === 'active').length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Campaigns</h1>
            <p className="text-sm text-muted mt-1">Manage your marketing campaigns</p>
          </div>
          <Button className="bg-accent hover:bg-accent/90 text-white" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />New Campaign
          </Button>
        </div>

        <div className="flex flex-wrap gap-4">
          <StatCard icon={<BarChart3 className="h-5 w-5 text-accent" />} label="Total Campaigns" value={mockCampaigns.length} color="bg-accent/10" />
          <StatCard icon={<TrendingUp className="h-5 w-5 text-green" />} label="Active" value={activeCount} color="bg-green/10" />
          <StatCard icon={<Target className="h-5 w-5 text-accent" />} label="Total Impressions" value={totalImpressions.toLocaleString()} color="bg-accent/10" />
          <StatCard icon={<DollarSign className="h-5 w-5 text-amber" />} label="Total Budget" value={'$' + totalBudget.toLocaleString()} color="bg-amber/10" />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns..." className="pl-9" />
          </div>
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Filter</Button>
        </div>

        <div className="space-y-3">
          {filtered.map(c => (
            <Card key={c.id} className="border-border hover:border-accent/30 transition-colors cursor-pointer" onClick={() => setEditCampaign(c)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-medium text-primary">{c.name}</h3>
                      <Badge variant={c.status === 'active' ? 'success' : c.status === 'draft' ? 'secondary' : c.status === 'completed' ? 'default' : 'warning'} className="capitalize text-[10px]">{c.status}</Badge>
                    </div>
                    <p className="text-sm text-secondary">{c.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>Budget: {c.budget}</span><span>•</span><span>{c.posts_count} posts</span><span>•</span><span>{c.engagement.toLocaleString()} engagements</span>
                    </div>
                    <div className="flex gap-1.5 mt-1">
                      {c.platforms.map(p => <Badge key={p} variant="outline" className="bg-surface-3 text-secondary border-border text-[10px] capitalize">{p}</Badge>)}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted hover:text-red shrink-0" onClick={e => { e.stopPropagation() }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
      <CampaignDialog open={showCreate} onOpenChange={setShowCreate} />
      {editCampaign && <CampaignDialog open={!!editCampaign} onOpenChange={o => !o && setEditCampaign(null)} campaign={editCampaign} />}
    </div>
  )
}
