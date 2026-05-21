import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Copy, Check, Gift, Users, DollarSign, TrendingUp, ExternalLink, ChevronRight, BarChart3, Percent, RefreshCw } from "lucide-react"
import { apiFetch, cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AffiliateStats {
  code: string
  commission_percent: number
  total_earned: number
  total_referrals: number
  pending_commissions: number
  paid_commissions: number
  referrals: AffiliateReferral[]
  commission_history: CommissionPayout[]
}

interface AffiliateReferral {
  referred_email: string
  amount: number
  original_amount: number
  status: string
  date: string
}

interface CommissionPayout {
  id: string
  amount: number
  original_amount: number
  status: string
  period_start: string
  period_end: string
  created_at: string
  paid_at?: string
}

interface GenerateCodeResponse {
  code: string
  commission_percent: number
  total_earned: number
  total_referrals: number
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function getReferralStatusVariant(status: string): "success" | "warning" | "secondary" | "danger" {
  switch (status) {
    case "paid":
    case "completed":
      return "success"
    case "pending":
      return "warning"
    case "cancelled":
    case "refunded":
      return "danger"
    default:
      return "secondary"
  }
}

function getCommissionStatusVariant(status: string): "success" | "warning" | "secondary" {
  switch (status) {
    case "paid":
      return "success"
    case "pending":
      return "warning"
    default:
      return "secondary"
  }
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  subtitle?: string
  accent?: boolean
}) {
  return (
    <motion.div variants={itemVariants} className="flex-1 min-w-[180px]">
      <Card className={cn(accent && "border-accent/30 bg-accent/[0.03]")}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted uppercase tracking-wider">{label}</p>
              <p className={cn("text-2xl font-bold tracking-tight", accent ? "text-accent" : "text-primary")}>
                {value}
              </p>
              {subtitle && (
                <p className="text-xs text-muted">{subtitle}</p>
              )}
            </div>
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
              accent ? "bg-accent/15" : "bg-surface-3"
            )}>
              <Icon className={cn("h-5 w-5", accent ? "text-accent" : "text-muted")} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Referrals Table
// ---------------------------------------------------------------------------
function ReferralsTable({ referrals }: { referrals: AffiliateReferral[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-accent" />
          Referrals
        </CardTitle>
        <CardDescription>
          Users who signed up using your referral link
        </CardDescription>
      </CardHeader>
      <CardContent>
        {referrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-surface-3 flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-muted" />
            </div>
            <p className="text-sm font-medium text-primary mb-1">No referrals yet</p>
            <p className="text-xs text-muted max-w-xs">
              Share your referral link with friends and colleagues. You&apos;ll earn a commission on every sale they make.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-4 gap-4 pb-2 text-xs font-medium text-muted uppercase tracking-wider">
              <div>User</div>
              <div className="text-right">Commission</div>
              <div className="text-center">Status</div>
              <div className="text-right">Date</div>
            </div>
            <Separator />
            {referrals.map((ref, idx) => (
              <div key={idx}>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 py-3 items-center">
                  {/* User */}
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-accent uppercase">
                        {ref.referred_email.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{ref.referred_email}</p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="sm:text-right">
                    <p className="text-sm font-semibold text-primary">{formatCurrency(ref.amount)}</p>
                    {ref.original_amount !== ref.amount && (
                      <p className="text-[11px] text-muted">
                        from {formatCurrency(ref.original_amount)}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="sm:text-center">
                    <Badge variant={getReferralStatusVariant(ref.status)} className="text-[10px] capitalize">
                      {ref.status}
                    </Badge>
                  </div>

                  {/* Date */}
                  <div className="sm:text-right">
                    <p className="text-xs text-muted">{formatDate(ref.date)}</p>
                  </div>
                </div>
                {idx < referrals.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Commission History Table
// ---------------------------------------------------------------------------
function CommissionHistoryTable({ commissions }: { commissions: CommissionPayout[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-accent" />
          Commission History
        </CardTitle>
        <CardDescription>
          Your recurring commission payouts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {commissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-surface-3 flex items-center justify-center mb-3">
              <DollarSign className="h-6 w-6 text-muted" />
            </div>
            <p className="text-sm font-medium text-primary mb-1">No commissions yet</p>
            <p className="text-xs text-muted max-w-xs">
              Commissions will appear here once your referrals make a purchase and the payout period ends.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-4 gap-4 pb-2 text-xs font-medium text-muted uppercase tracking-wider">
              <div>Period</div>
              <div className="text-right">Amount</div>
              <div className="text-center">Status</div>
              <div className="text-right">Date</div>
            </div>
            <Separator />
            {commissions.map((comm, idx) => {
              const periodStart = formatDate(comm.period_start)
              const periodEnd = formatDate(comm.period_end)
              const displayDate = comm.paid_at
                ? formatDate(comm.paid_at)
                : formatDate(comm.created_at)

              return (
                <div key={comm.id}>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 py-3 items-center">
                    {/* Period */}
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {periodStart} – {periodEnd}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="sm:text-right">
                      <p className="text-sm font-semibold text-primary">{formatCurrency(comm.amount)}</p>
                      {comm.original_amount !== comm.amount && (
                        <p className="text-[11px] text-muted">
                          from {formatCurrency(comm.original_amount)}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="sm:text-center">
                      <Badge variant={getCommissionStatusVariant(comm.status)} className="text-[10px] capitalize">
                        {comm.status}
                      </Badge>
                    </div>

                    {/* Date */}
                    <div className="sm:text-right">
                      <p className="text-xs text-muted">{displayDate}</p>
                    </div>
                  </div>
                  {idx < commissions.length - 1 && <Separator />}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// AffiliatePage (main component)
// ---------------------------------------------------------------------------
export function AffiliatePage() {
  const [copied, setCopied] = useState(false)

  // -- Fetch affiliate stats --
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useQuery<AffiliateStats>({
    queryKey: ["affiliate", "stats"],
    queryFn: () => apiFetch<AffiliateStats>("/affiliate/stats"),
    retry: 1,
  })

  // -- Generate referral code mutation --
  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<GenerateCodeResponse>("/affiliate/code", {
        method: "POST",
      }),
    onSuccess: () => {
      refetchStats()
      toast.success("Referral code generated!", {
        description: "Your unique referral code is ready to share.",
      })
    },
    onError: (err) => {
      toast.error("Failed to generate code", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    },
  })

  // -- Fetch commission history separately --
  const { data: commissions, isLoading: commissionsLoading } = useQuery<CommissionPayout[]>({
    queryKey: ["affiliate", "commissions"],
    queryFn: () => apiFetch<CommissionPayout[]>("/affiliate/commissions"),
    retry: 1,
    enabled: !!stats?.code,
  })

  // -- Derived state --
  const referralCode = stats?.code ?? null
  const commissionPercent = stats?.commission_percent ?? 30
  const totalEarned = stats?.total_earned ?? 0
  const totalReferrals = stats?.total_referrals ?? 0
  const pendingCommissions = stats?.pending_commissions ?? 0
  const paidCommissions = stats?.paid_commissions ?? 0
  const referralsList = stats?.referrals ?? []
  const commissionList = commissions ?? stats?.commission_history ?? []

  const referralLink = referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : null

  const handleCopy = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success("Copied to clipboard!", {
        description: "Share this link with your audience.",
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("Failed to copy", { description: "Please copy manually." })
    }
  }

  const handleCopyCode = async () => {
    if (!referralCode) return
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("Failed to copy", { description: "Please copy manually." })
    }
  }

  const isLoading = statsLoading

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      {/* -- Page Header -- */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Affiliate Program</h1>
        <p className="text-sm text-muted mt-1">
          Earn recurring commissions by referring new customers to SocialPulses
        </p>
      </motion.div>

      {/* -- Stats Bar -- */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-wrap gap-4">
          <StatCard
            icon={DollarSign}
            label="Total Earned"
            value={isLoading ? "—" : formatCurrency(totalEarned)}
            accent
          />
          <StatCard
            icon={TrendingUp}
            label="Pending Commission"
            value={isLoading ? "—" : formatCurrency(pendingCommissions)}
          />
          <StatCard
            icon={BarChart3}
            label="Paid Commission"
            value={isLoading ? "—" : formatCurrency(paidCommissions)}
          />
          <StatCard
            icon={Users}
            label="Total Referrals"
            value={isLoading ? "—" : String(totalReferrals)}
          />
        </div>
      </motion.div>

      {/* -- Referral Code + Commission Rate -- */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-12 w-72 rounded-lg" />
                <Skeleton className="h-4 w-56 rounded" />
              </div>
            ) : statsError && !referralCode ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="h-12 w-12 rounded-full bg-red/10 flex items-center justify-center mb-3">
                  <Gift className="h-6 w-6 text-red" />
                </div>
                <p className="text-sm font-medium text-primary mb-1">Failed to load affiliate data</p>
                <p className="text-xs text-muted mb-4">Could not load your affiliate information.</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetchStats()}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Retry
                  </Button>
                  <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                    {generateMutation.isPending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Gift className="h-3.5 w-3.5 mr-1.5" />
                        Generate Code
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : !referralCode ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                  <Gift className="h-6 w-6 text-accent" />
                </div>
                <p className="text-sm font-medium text-primary mb-1">Your referral code awaits</p>
                <p className="text-xs text-muted mb-4 max-w-md">
                  Generate a unique referral code to start earning 30% recurring commissions on every referral.
                </p>
                <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Gift className="h-3.5 w-3.5 mr-1.5" />
                      Generate My Referral Code
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Commission rate badge */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="default" className="px-3 py-1.5 text-xs gap-1.5">
                    <Percent className="h-3 w-3" />
                    {commissionPercent}% recurring commission
                  </Badge>
                  <p className="text-xs text-muted">
                    You earn {commissionPercent}% of every payment your referrals make, every month.
                  </p>
                </div>

                {/* Referral code display */}
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                    Your Referral Code
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20">
                      <Gift className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-lg font-bold text-accent tracking-wider font-mono">
                        {referralCode}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyCode}
                      className="gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Code
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Full referral link */}
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                    Shareable Link
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl bg-surface-3 border border-border text-sm text-secondary font-mono truncate">
                      {referralLink}
                    </code>
                    <Button
                      onClick={handleCopy}
                      className="gap-1.5 shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* -- Referrals Table -- */}
      {referralCode && (
        <motion.div variants={itemVariants}>
          {statsLoading ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-4 w-56 rounded" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-40 rounded" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded" />
                    <Skeleton className="h-5 w-20 rounded" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <ReferralsTable referrals={referralsList} />
          )}
        </motion.div>
      )}

      {/* -- Commission History -- */}
      {referralCode && (
        <motion.div variants={itemVariants}>
          {commissionsLoading ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-4 w-56 rounded" />
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 rounded" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded" />
                    <Skeleton className="h-5 w-20 rounded" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <CommissionHistoryTable commissions={commissionList} />
          )}
        </motion.div>
      )}

      {/* -- How It Works -- */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-4 w-4 text-accent" />
              How It Works
            </CardTitle>
            <CardDescription>
              Everything you need to know about the SocialPulses Affiliate Program
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                  <span className="text-sm font-bold text-accent">1</span>
                </div>
                <h3 className="text-sm font-semibold text-primary">Generate Your Code</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Click the button above to generate your unique referral code. You can share this code or the full referral link.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                  <span className="text-sm font-bold text-accent">2</span>
                </div>
                <h3 className="text-sm font-semibold text-primary">Share With Your Audience</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Share your referral link on social media, in your newsletter, or directly with friends and colleagues.
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                  <span className="text-sm font-bold text-accent">3</span>
                </div>
                <h3 className="text-sm font-semibold text-primary">Earn Recurring Commissions</h3>
                <p className="text-xs text-muted leading-relaxed">
                  You earn {commissionPercent}% of every payment your referrals make — monthly, for as long as they remain customers. No caps.
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-accent" />
                  Commission Structure
                </h3>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-xs text-muted">
                    <ChevronRight className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span><strong className="text-secondary">{commissionPercent}% recurring</strong> on every payment your referral makes</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-muted">
                    <ChevronRight className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span>Commissions are calculated on the <strong className="text-secondary">net amount</strong> (after fees)</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-muted">
                    <ChevronRight className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span>Paid out <strong className="text-secondary">monthly</strong> via the payment method on file</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-accent" />
                  Terms & Details
                </h3>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-xs text-muted">
                    <ChevronRight className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span>No limit on the <strong className="text-secondary">number of referrals</strong> you can make</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-muted">
                    <ChevronRight className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span>Commissions apply to <strong className="text-secondary">all paid plans</strong> (Starter, Professional, Business)</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-muted">
                    <ChevronRight className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span>Referral cookies last <strong className="text-secondary">90 days</strong></span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default AffiliatePage
