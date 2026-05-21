import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { apiFetch, cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StripeConfig {
  publishable_key: string
  plans: Plan[]
  payment_links: {
    starter: string
    professional: string
    business: string
  }
}

interface Plan {
  id: string
  name: string
  price: number
  currency: string
  price_id: string
  popular?: boolean
}

interface Subscription {
  tier: string
  status: string
  trial_end?: string
  trial_days_left?: number
  current_period_end?: string
  canceled_at?: string
  plan?: string
}

interface Invoice {
  id: string
  amount_paid: number
  currency: string
  status: string
  created: string
  pdf_url?: string
  number?: string
}

interface CheckoutResponse {
  url: string
  session_id: string
}

interface PortalResponse {
  url: string
}

// ---------------------------------------------------------------------------
// PLAN DEFINITIONS - exact features from socialpulses.io/pricing.html
// ---------------------------------------------------------------------------

const FREE_PLAN: Plan = {
  id: "free",
  name: "Free",
  price: 0,
  currency: "usd",
  price_id: "",
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Professional",
  professional: "Professional",
  biz: "Business",
  business: "Business",
  enterprise: "Enterprise",
}

const PLAN_OWN_FEATURES: Record<string, string[]> = {
  free: [
    "Up to 5 social accounts",
    "5 scheduled posts per month",
    "Basic analytics dashboard",
    "AI Content Generator (5 credits)",
    "Community support",
  ],
  starter: [
    "Up to 15 social accounts",
    "50 scheduled posts per month",
    "Advanced analytics and reports",
    "AI Content Generator (50 credits)",
    "Smart Scheduling",
    "Email support",
  ],
  pro: [
    "Up to 25 social accounts",
    "Unlimited scheduled posts",
    "Full analytics suite with exports",
    "AI Content Generator (500 credits)",
    "Best Content Finder",
    "Comments and Messages inbox",
    "Link in Bio page",
    "Priority email and chat support",
  ],
  biz: [
    "Up to 50 social accounts",
    "Unlimited scheduled posts",
    "Team Collaboration (up to 5 seats)",
    "AI Content Generator (2000 credits)",
    "Auto Actions",
    "Recurring Content",
    "Campaigns",
    "Social Listening",
    "Idea Board",
    "Dedicated account manager",
  ],
  enterprise: [
    "Unlimited social accounts",
    "Unlimited scheduled posts",
    "Unlimited team seats",
    "AI Content Generator (unlimited credits)",
    "Client Portal",
    "White-label options",
    "Custom integrations",
    "SSO/SAML",
    "API access",
    "99.99% SLA",
    "24/7 phone and email support",
  ],
}

const INHERITANCE_CHAIN: Record<string, string[]> = {
  free: [],
  starter: ["free"],
  pro: ["free", "starter"],
  biz: ["free", "starter", "pro"],
  enterprise: ["free", "starter", "pro", "biz"],
}

function getFeaturesForPlan(planId: string): string[] {
  const inherited = INHERITANCE_CHAIN[planId] ?? []
  const inheritedFeatures: string[] = []
  for (const parentId of inherited) {
    const parentFeatures = PLAN_OWN_FEATURES[parentId] ?? []
    inheritedFeatures.push(...parentFeatures)
  }
  const own = PLAN_OWN_FEATURES[planId] ?? []
  return [...inheritedFeatures, ...own]
}

function getUniqueFeaturesForPlan(planId: string): string[] {
  return PLAN_OWN_FEATURES[planId] ?? []
}

// ---------------------------------------------------------------------------
// FEATURE COMPARISON TABLE DATA
// ---------------------------------------------------------------------------

interface CompareFeature {
  id: string
  label: string
  plans: string[]
}

const COMPARE_FEATURES: CompareFeature[] = [
  { id: "acc-5", label: "Up to 5 social accounts", plans: ["free", "starter", "pro", "biz", "enterprise"] },
  { id: "acc-15", label: "Up to 15 social accounts", plans: ["starter", "pro", "biz", "enterprise"] },
  { id: "acc-25", label: "Up to 25 social accounts", plans: ["pro", "biz", "enterprise"] },
  { id: "acc-50", label: "Up to 50 social accounts", plans: ["biz", "enterprise"] },
  { id: "acc-unl", label: "Unlimited social accounts", plans: ["enterprise"] },
  { id: "post-5", label: "5 scheduled posts per month", plans: ["free"] },
  { id: "post-50", label: "50 scheduled posts per month", plans: ["starter"] },
  { id: "post-unl", label: "Unlimited scheduled posts", plans: ["pro", "biz", "enterprise"] },
  { id: "analytics-basic", label: "Basic analytics dashboard", plans: ["free", "starter", "pro", "biz", "enterprise"] },
  { id: "analytics-adv", label: "Advanced analytics and reports", plans: ["starter", "pro", "biz", "enterprise"] },
  { id: "analytics-full", label: "Full analytics suite with exports", plans: ["pro", "biz", "enterprise"] },
  { id: "ai-5", label: "AI Content Generator (5 credits)", plans: ["free"] },
  { id: "ai-50", label: "AI Content Generator (50 credits)", plans: ["starter"] },
  { id: "ai-500", label: "AI Content Generator (500 credits)", plans: ["pro"] },
  { id: "ai-2000", label: "AI Content Generator (2,000 credits)", plans: ["biz"] },
  { id: "ai-unl", label: "AI Content Generator (unlimited credits)", plans: ["enterprise"] },
  { id: "smart-sched", label: "Smart Scheduling", plans: ["starter", "pro", "biz", "enterprise"] },
  { id: "best-content", label: "Best Content Finder", plans: ["pro", "biz", "enterprise"] },
  { id: "inbox", label: "Comments and Messages inbox", plans: ["pro", "biz", "enterprise"] },
  { id: "link-bio", label: "Link in Bio page", plans: ["pro", "biz", "enterprise"] },
  { id: "auto-actions", label: "Auto Actions", plans: ["biz", "enterprise"] },
  { id: "recurring", label: "Recurring Content", plans: ["biz", "enterprise"] },
  { id: "campaigns", label: "Campaigns", plans: ["biz", "enterprise"] },
  { id: "social-listening", label: "Social Listening", plans: ["biz", "enterprise"] },
  { id: "idea-board", label: "Idea Board", plans: ["biz", "enterprise"] },
  { id: "team-5", label: "Team Collaboration (up to 5 seats)", plans: ["biz", "enterprise"] },
  { id: "team-unl", label: "Unlimited team seats", plans: ["enterprise"] },
  { id: "client-portal", label: "Client Portal", plans: ["enterprise"] },
  { id: "white-label", label: "White-label options", plans: ["enterprise"] },
  { id: "custom-integrations", label: "Custom integrations", plans: ["enterprise"] },
  { id: "sso-saml", label: "SSO/SAML", plans: ["enterprise"] },
  { id: "api-access", label: "API access", plans: ["enterprise"] },
  { id: "sla", label: "99.99% SLA", plans: ["enterprise"] },
  { id: "support-community", label: "Community support", plans: ["free", "starter", "pro", "biz", "enterprise"] },
  { id: "support-email", label: "Email support", plans: ["starter", "pro", "biz", "enterprise"] },
  { id: "support-priority", label: "Priority email and chat support", plans: ["pro", "biz", "enterprise"] },
  { id: "support-manager", label: "Dedicated account manager", plans: ["biz", "enterprise"] },
  { id: "support-247", label: "24/7 phone and email support", plans: ["enterprise"] },
]

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

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getYearlyPrice(monthly: number): number {
  return monthly * 10
}

function getStatusBadgeVariant(status: string): "success" | "warning" | "danger" | "secondary" {
  switch (status) {
    case "active":
    case "trialing":
      return "success"
    case "past_due":
    case "incomplete":
      return "warning"
    case "canceled":
    case "cancelled":
    case "unpaid":
      return "danger"
    default:
      return "secondary"
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "trialing":
      return "Trial"
    case "active":
      return "Active"
    case "past_due":
      return "Past Due"
    case "canceled":
    case "cancelled":
      return "Canceled"
    case "incomplete":
      return "Incomplete"
    case "unpaid":
      return "Unpaid"
    default:
      return status
  }
}

function normalisePlanId(id: string): string {
  const lower = id.toLowerCase()
  if (lower === "professional") return "pro"
  if (lower === "business") return "biz"
  if (lower === "starter") return "starter"
  if (lower === "enterprise") return "enterprise"
  return lower
}

function getPlanDisplayName(id: string): string {
  return PLAN_DISPLAY_NAMES[id] ?? id
}

function getPlanIcon(id: string): string {
  switch (id) {
    case "free":
      return "fa-solid fa-gift"
    case "starter":
      return "fa-solid fa-rocket"
    case "pro":
      return "fa-solid fa-crown"
    case "biz":
      return "fa-solid fa-building"
    case "enterprise":
      return "fa-solid fa-gem"
    default:
      return "fa-solid fa-credit-card"
  }
}

function getPlanDescription(id: string): string {
  switch (id) {
    case "free":
      return "Get started with basic social management"
    case "starter":
      return "For individuals and small teams"
    case "pro":
      return "Best for growing businesses"
    case "biz":
      return "Built for scaling teams and agencies"
    case "enterprise":
      return "For large-scale organizations"
    default:
      return ""
  }
}

function mapBackendPlan(p: Plan): Plan {
  return {
    ...p,
    name: getPlanDisplayName(normalisePlanId(p.id)),
  }
}

// ---------------------------------------------------------------------------
// Plan feature item
// ---------------------------------------------------------------------------
function PlanFeature({ text, included }: { text: string; included: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      {included ? (
        <i className="fa-solid fa-check-circle text-green text-sm shrink-0 mt-0.5" />
      ) : (
        <i className="fa-regular fa-circle text-muted text-sm shrink-0 mt-0.5" />
      )}
      <span className={cn("text-sm", included ? "text-secondary" : "text-muted")}>{text}</span>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Plan Card
// ---------------------------------------------------------------------------
let hasPaidPlan = false

function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
  onManage,
  loading,
  billingInterval,
}: {
  plan: Plan
  isCurrent: boolean
  onUpgrade: () => void
  onManage?: () => void
  loading: boolean
  billingInterval: "month" | "year"
}) {
  const planId = normalisePlanId(plan.id)
  const ownFeatures = getUniqueFeaturesForPlan(planId)
  const yearlyTotal = getYearlyPrice(plan.price)
  const displayPrice = billingInterval === "year" ? yearlyTotal : plan.price
  const periodLabel = billingInterval === "year" ? "/yr" : "/mo"
  const isFree = planId === "free"
  const isEnterprise = planId === "enterprise"
  const inheritanceParents = INHERITANCE_CHAIN[planId] ?? []
  const parentLabel =
    inheritanceParents.length > 0
      ? inheritanceParents.map((pid) => getPlanDisplayName(pid)).join(" + ")
      : null

  return (
    <motion.div variants={cardVariants} className="relative">
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge variant="default" className="px-3 py-1 text-[10px]">
            <i className="fa-solid fa-star text-[10px] mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      <Card
        className={cn(
          "h-full flex flex-col transition-all duration-300",
          isCurrent
            ? "border-accent/50 bg-accent/[0.02] shadow-lg shadow-accent/5"
            : plan.popular
              ? "border-accent/40"
              : "hover:border-border-hover"
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <i className={cn(getPlanIcon(planId), "text-accent text-lg")} />
            </div>
            {isCurrent && (
              <Badge variant="success" className="text-[10px]">
                <i className="fa-solid fa-check-circle text-[10px] mr-1" />
                Current
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg">{getPlanDisplayName(planId)}</CardTitle>
          <CardDescription>{getPlanDescription(planId)}</CardDescription>

          <div className="mt-3">
            {isFree ? (
              <div>
                <span className="text-3xl font-bold text-primary">$0</span>
                <span className="text-sm text-muted ml-1">{periodLabel}</span>
              </div>
            ) : (
              <div>
                <span className="text-3xl font-bold text-primary">${displayPrice}</span>
                <span className="text-sm text-muted ml-1">{periodLabel}</span>
                {billingInterval === "year" && (
                  <div className="text-xs text-green mt-1">
                    <i className="fa-solid fa-tag text-[10px] mr-1" />
                    ${plan.price}/mo billed yearly - save 17%
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          <Separator className="mb-4" />

          <ul className="space-y-2.5">
            {parentLabel && (
              <li className="flex items-start gap-2.5 text-accent">
                <i className="fa-solid fa-arrows-spin text-sm shrink-0 mt-0.5" />
                <span className="text-sm font-medium">Everything in {parentLabel}</span>
              </li>
            )}

            {ownFeatures.map((feature, idx) => (
              <PlanFeature key={idx} text={feature} included />
            ))}
          </ul>
        </CardContent>

        <CardFooter className="flex-col gap-2 pt-2">
          <Button
            className="w-full gap-2"
            variant={isCurrent ? "secondary" : plan.popular ? "default" : "outline"}
            onClick={onUpgrade}
            disabled={isCurrent || loading || isFree}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                Processing...
              </>
            ) : isCurrent ? (
              <>
                <i className="fa-solid fa-check-circle" />
                Current Plan
              </>
            ) : isEnterprise ? (
              "Contact Sales"
            ) : isFree ? (
              "Current Plan"
            ) : (
              <>
                Upgrade
                <i className="fa-solid fa-arrow-right text-xs" />
              </>
            )}
          </Button>

          {isFree && !hasPaidPlan && (
            <p className="text-[11px] text-muted text-center">
              No payment required
            </p>
          )}

          {isCurrent && onManage && !isFree && (
            <Button variant="ghost" size="sm" className="w-full gap-2 text-xs" onClick={onManage}>
              <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
              Manage Billing
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Invoice Row
// ---------------------------------------------------------------------------
function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const date = new Date(Number(invoice.created) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-surface-3 flex items-center justify-center">
          <i className="fa-solid fa-file-invoice text-muted text-sm" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">
            {invoice.number || "Invoice #" + invoice.id.slice(0, 8)}
          </p>
          <p className="text-xs text-muted">{date}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-primary">
          {invoice.currency?.toUpperCase() === "USD" ? "$" : ""}
          {(invoice.amount_paid / 100).toFixed(2)}
        </span>
        <Badge
          variant={
            invoice.status === "paid"
              ? "success"
              : invoice.status === "open"
                ? "warning"
                : "secondary"
          }
          className="text-[10px] capitalize"
        >
          {invoice.status === "paid" ? (
            <i className="fa-solid fa-check-circle text-[10px] mr-1" />
          ) : invoice.status === "open" ? (
            <i className="fa-solid fa-clock text-[10px] mr-1" />
          ) : (
            <i className="fa-solid fa-circle-info text-[10px] mr-1" />
          )}
          {invoice.status}
        </Badge>
        {invoice.pdf_url && (
          <a
            href={invoice.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent/80 transition-colors"
            title="Download PDF"
          >
            <i className="fa-solid fa-download text-sm" />
          </a>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feature comparison - expandable table
// ---------------------------------------------------------------------------
function FeatureComparisonTable({
  plans,
  compareFeatures,
  isExpanded,
  onToggle,
}: {
  plans: Plan[]
  compareFeatures: CompareFeature[]
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              <i className="fa-solid fa-table-cells-large text-accent mr-2" />
              Feature Comparison
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {compareFeatures.length} features
            </Badge>
          </div>
          <button
            type="button"
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center transition-transform duration-200",
              isExpanded ? "rotate-180" : "",
              "text-muted hover:text-secondary hover:bg-surface-3"
            )}
          >
            <i className="fa-solid fa-chevron-down text-xs" />
          </button>
        </div>
        <CardDescription>
          {isExpanded
            ? "See how every plan stacks up across all features"
            : "Click to expand and compare features across all plans"}
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 text-muted font-medium w-56">Feature</th>
                  {plans.map((plan) => {
                    const pid = normalisePlanId(plan.id)
                    return (
                      <th
                        key={plan.id}
                        className="text-center py-3 px-3 text-muted font-medium"
                      >
                        <span className="text-xs uppercase tracking-wide">
                          {getPlanDisplayName(pid)}
                        </span>
                        {plan.popular && (
                          <div className="text-[10px] text-accent mt-0.5">
                            Star Popular
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {compareFeatures.map((feature, idx) => (
                  <tr
                    key={feature.id}
                    className={cn(
                      "border-b border-border/50 last:border-0 transition-colors",
                      idx % 2 === 0 ? "bg-surface-2/30" : ""
                    )}
                  >
                    <td className="py-2.5 pr-4 text-secondary text-sm">{feature.label}</td>
                    {plans.map((plan) => {
                      const pid = normalisePlanId(plan.id)
                      const included = feature.plans.includes(pid)
                      return (
                        <td key={plan.id} className="text-center py-2.5 px-3">
                          {included ? (
                            <i className="fa-solid fa-check text-green text-sm" />
                          ) : (
                            <i className="fa-solid fa-minus text-muted/20 text-sm" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// BillingPage (main component)
// ---------------------------------------------------------------------------
export function BillingPage() {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month")
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [compareExpanded, setCompareExpanded] = useState(false)

  // -- Fetch Stripe config (plans + payment links) --
  const { data: config, isLoading: configLoading } = useQuery<StripeConfig>({
    queryKey: ["stripe", "config"],
    queryFn: () => {
      const countryCode = (() => {
        try {
          const locale = navigator.language
          // navigator.language is "en-US" → "US"
          const parts = locale.split("-")
          return parts.length > 1 ? parts[1].toUpperCase() : "US"
        } catch {
          return "US"
        }
      })()
      const query = countryCode ? `?country_code=${countryCode}` : ""
      return apiFetch<StripeConfig>(`/stripe/config${query}`)
    },
    retry: 1,
  })

  // -- Fetch current subscription --
  const { data: subscription, isLoading: subLoading, refetch: refetchSub } = useQuery<Subscription>({
    queryKey: ["subscription"],
    queryFn: () => apiFetch<Subscription>("/subscription"),
    retry: 1,
  })

  // -- Fetch invoices --
  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["subscription", "invoices"],
    queryFn: () => apiFetch<Invoice[]>("/subscription/invoices"),
    retry: 1,
  })

  // -- Create checkout session mutation --
  const checkoutMutation = useMutation({
    mutationFn: ({ planId, priceId }: { planId: string; priceId: string }) =>
      apiFetch<CheckoutResponse>("/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({
          plan_id: planId,
          price_id: priceId,
          success_url: window.location.origin + "/billing?success=true",
          cancel_url: window.location.origin + "/billing?canceled=true",
        }),
      }),
    onSuccess: (data) => {
      setSelectedPlanId(null)
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer")
      }
    },
    onError: () => {
      setSelectedPlanId(null)
    },
  })

  // -- Create portal session mutation --
  const portalMutation = useMutation({
    mutationFn: () =>
      apiFetch<PortalResponse>("/stripe/create-portal-session", {
        method: "POST",
        body: JSON.stringify({
          return_url: window.location.origin + "/billing",
        }),
      }),
    onSuccess: (data) => {
      setPortalLoading(false)
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer")
      }
    },
    onError: () => {
      setPortalLoading(false)
    },
  })

  // -- Derived state --

  const backendPlans: Plan[] = (config?.plans || []).map(mapBackendPlan)
  const allPlans: Plan[] = [FREE_PLAN, ...backendPlans]

  const currentPlanId = (() => {
    if (!subscription || !subscription.tier || subscription.tier === "free") return "free"
    return normalisePlanId(subscription.plan?.name || subscription.tier || "free")
  })()

  const isSubActive = !!(
    subscription &&
    subscription.tier &&
    subscription.tier !== "free" &&
    subscription.status !== "canceled" &&
    subscription.status !== "cancelled"
  )

  hasPaidPlan = isSubActive

  const isTrialing = subscription?.status === "trialing"
  const trialDaysLeft = subscription?.trial_days_left ?? 0

  const handleUpgrade = (plan: Plan) => {
    const planId = normalisePlanId(plan.id)
    if (planId === "free") return
    if (planId === "enterprise") {
      window.open("mailto:sales@socialpulses.io?subject=Enterprise%20Plan%20Inquiry", "_blank")
      return
    }
    setSelectedPlanId(planId)
    checkoutMutation.mutate({ planId, priceId: plan.price_id })
  }

  const handleManageBilling = () => {
    setPortalLoading(true)
    portalMutation.mutate()
  }

  const isLoading = configLoading || subLoading

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 pb-12"
    >
      {/* -- Page Header -- */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Billing</h1>
        <p className="text-sm text-muted mt-1">
          Manage your subscription, compare plans, view invoices, and update payment methods
        </p>
      </motion.div>

      {/* -- Current Subscription Status -- */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <i className="fa-solid fa-credit-card text-accent" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-40 rounded" />
                <Skeleton className="h-4 w-60 rounded" />
                <Skeleton className="h-4 w-72 rounded" />
              </div>
            ) : !subscription ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                  <i className="fa-solid fa-circle-info text-accent text-xl" />
                </div>
                <p className="text-sm text-muted">Unable to load subscription info</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => refetchSub()}>
                  <i className="fa-solid fa-rotate-right text-xs mr-1" />
                  Retry
                </Button>
              </div>
            ) : !isSubActive ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="h-12 w-12 rounded-full bg-surface-3 flex items-center justify-center mb-3">
                  <i className="fa-solid fa-gift text-muted text-xl" />
                </div>
                <p className="text-sm font-medium text-primary mb-1">Free Plan</p>
                <p className="text-xs text-muted">
                  You are on the <strong>Free</strong> plan. Upgrade to unlock scheduling,
                  AI content generation, and advanced analytics.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-primary capitalize">
                        {getPlanDisplayName(currentPlanId)}
                      </h3>
                      <Badge
                        variant={getStatusBadgeVariant(subscription.status)}
                        className="text-[10px]"
                      >
                        {getStatusLabel(subscription.status)}
                      </Badge>
                    </div>

                    {isTrialing && trialDaysLeft > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-amber">
                        <i className="fa-solid fa-hourglass-half text-[11px]" />
                        <span>
                          Trial ends in <strong>{trialDaysLeft}</strong> day
                          {trialDaysLeft !== 1 ? "s" : ""}
                          {subscription.trial_end && (
                            <>
                              {" - "}
                              {new Date(subscription.trial_end).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    {subscription.current_period_end && (
                      <p className="text-xs text-muted mt-1">
                        <i className="fa-regular fa-calendar text-[10px] mr-1" />
                        {isSubActive
                          ? "Current period ends " + new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                          : "Trial ends " + new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}

                    {subscription.canceled_at && (
                      <p className="text-xs text-red mt-1">
                        <i className="fa-solid fa-circle-exclamation text-[10px] mr-1" />
                        Canceled on{" "}
                        {new Date(subscription.canceled_at).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>

                  {isSubActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 shrink-0"
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                    >
                      {portalLoading ? (
                        <i className="fa-solid fa-spinner fa-spin" />
                      ) : (
                        <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                      )}
                      Manage
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* -- Billing Interval Toggle -- */}
      {!isLoading && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-center mb-2">
            <div className="inline-flex items-center rounded-xl border border-border bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => setBillingInterval("month")}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                  billingInterval === "month"
                    ? "bg-surface-1 text-primary shadow-sm"
                    : "text-muted hover:text-secondary"
                )}
              >
                <i className="fa-regular fa-calendar text-xs mr-1.5" />
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval("year")}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                  billingInterval === "year"
                    ? "bg-surface-1 text-primary shadow-sm"
                    : "text-muted hover:text-secondary"
                )}
              >
                <i className="fa-solid fa-tag text-xs mr-1.5" />
                Yearly
                <Badge variant="success" className="ml-1.5 text-[10px] py-0">
                  Save 17%
                </Badge>
              </button>
            </div>
          </div>
          {billingInterval === "year" && (
            <p className="text-center text-xs text-muted -mt-1 mb-4">
              Pay 10 months, get 2 months free - that is 17% off
            </p>
          )}
        </motion.div>
      )}

      {/* -- Plans Grid -- */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-6 w-28 rounded" />
                <Skeleton className="h-10 w-24 rounded" />
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full rounded" />
                  ))}
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
        >
          {allPlans.map((plan) => {
            const planId = normalisePlanId(plan.id)
            const isCurrent = currentPlanId === planId

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={isCurrent}
                onUpgrade={() => handleUpgrade(plan)}
                onManage={handleManageBilling}
                loading={selectedPlanId === planId && checkoutMutation.isPending}
                billingInterval={billingInterval}
              />
            )
          })}
        </motion.div>
      )}

      {/* -- Feature Comparison Table (expandable) -- */}
      <motion.div variants={itemVariants}>
        <FeatureComparisonTable
          plans={allPlans}
          compareFeatures={COMPARE_FEATURES}
          isExpanded={compareExpanded}
          onToggle={() => setCompareExpanded(!compareExpanded)}
        />
      </motion.div>

      {/* -- Invoices -- */}
      {isSubActive && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <i className="fa-solid fa-file-invoice text-accent" />
                Invoices
              </CardTitle>
              <CardDescription>View and download past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="h-3 w-24 rounded mt-1" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded" />
                    </div>
                  ))}
                </div>
              ) : !invoices || invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="h-10 w-10 rounded-full bg-surface-3 flex items-center justify-center mb-2">
                    <i className="fa-solid fa-receipt text-muted text-lg" />
                  </div>
                  <p className="text-sm text-muted">No invoices yet</p>
                  <p className="text-xs text-muted mt-1">
                    Invoices will appear here after your first payment
                  </p>
                </div>
              ) : (
                <div>
                  {invoices.map((invoice, idx) => (
                    <div key={invoice.id}>
                      {idx > 0 && <Separator />}
                      <InvoiceRow invoice={invoice} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* -- Secure Billing Footer -- */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-surface-3 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-shield-halved text-muted text-lg" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">Secure Billing</p>
              <p className="text-xs text-muted">
                All payments are processed securely via Stripe. Your card details are never stored
                on our servers. You can cancel or change your plan at any time.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() =>
                window.open("mailto:support@socialpulses.io", "_blank")
              }
            >
              <i className="fa-solid fa-circle-info text-xs" />
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
