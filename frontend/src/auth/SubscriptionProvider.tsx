import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { apiFetch, onPaymentRequired, clearPaymentRequiredHandler } from "@/lib/utils"
import { useAuth } from "@/auth/AuthProvider"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SubscriptionInfo {
  tier: string
  status: "active" | "trialing" | "past_due" | "canceled" | "expired" | "incomplete" | "unpaid"
  trial_end?: string
  trial_days_left?: number
  current_period_end?: string
  canceled_at?: string
  plan?: { name: string; price: number; price_id: string }
}

export interface SubscriptionCheckResult {
  has_access: boolean
  reason: string | null
  subscription: SubscriptionInfo | null
}

export interface TierFeatures {
  ai_content_generator: boolean | { enabled: boolean; credits: number }
  social_listening: boolean
  campaigns: boolean
  team_collaboration: boolean
  auto_reply: boolean
  link_in_bio: boolean
  idea_board: boolean
  advanced_analytics: boolean
  api_access: boolean
  recurring_content: boolean
  custom_workflows: boolean
  max_accounts: number
  max_users: number
}

export interface FeaturesResponse {
  tier: string
  features: TierFeatures
}

// ---------------------------------------------------------------------------
// Default features (Free tier)
// ---------------------------------------------------------------------------
const DEFAULT_FEATURES: TierFeatures = {
  ai_content_generator: { enabled: false, credits: 0 },
  social_listening: false,
  campaigns: false,
  team_collaboration: false,
  auto_reply: false,
  link_in_bio: false,
  idea_board: false,
  advanced_analytics: false,
  api_access: false,
  recurring_content: false,
  custom_workflows: false,
  max_accounts: 3,
  max_users: 1,
}

interface SubscriptionContextType {
  hasAccess: boolean
  subscription: SubscriptionCheckResult | null
  loading: boolean
  expiredReason: string | null
  checkSubscriptionAccess: () => Promise<void>
  /** True when the trial is active and within 3 days of expiry */
  showTrialWarning: boolean
  /** Days remaining in trial (0 if not trialing) */
  trialDaysLeft: number
  /** Features from the backend /subscription/features */
  features: FeaturesResponse | null
  /** Shortcut to features?.features, with defaults */
  tierFeatures: TierFeatures
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
)

// ---------------------------------------------------------------------------
// Polling interval: 5 minutes
// ---------------------------------------------------------------------------
const POLL_INTERVAL_MS = 5 * 60 * 1000

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] =
    useState<SubscriptionCheckResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [expiredReason, setExpiredReason] = useState<string | null>(null)
  const [features, setFeatures] = useState<FeaturesResponse | null>(null)
  const { user } = useAuth()

  const fetchSubscription = useCallback(async () => {
    try {
      const data = await apiFetch<SubscriptionCheckResult>("/subscription/check")
      setSubscription(data)
      if (!data.has_access) {
        setExpiredReason(data.reason)
      } else {
        setExpiredReason(null)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchFeatures = useCallback(async () => {
    try {
      const data = await apiFetch<FeaturesResponse>("/subscription/features")
      setFeatures(data)
    } catch {
      // Silently fail
    }
  }, [])

  // Fetch on mount and register 402 handler
  useEffect(() => {
    fetchSubscription()
    fetchFeatures()

    onPaymentRequired((reason) => {
      setExpiredReason(reason || "payment_required")
      setSubscription((prev) =>
        prev
          ? { ...prev, has_access: false, reason: reason || "payment_required" }
          : { has_access: false, reason: reason || "payment_required", subscription: null }
      )
    })

    return () => {
      clearPaymentRequiredHandler()
    }
  }, [fetchSubscription, fetchFeatures])

  // Auto-poll every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchSubscription, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchSubscription])

  const hasAccess = user?.role === "admin" ? true : subscription?.has_access ?? true
  const sub = subscription?.subscription

  const showTrialWarning =
    sub?.status === "trialing" &&
    sub?.trial_days_left != null &&
    sub.trial_days_left <= 3 &&
    sub.trial_days_left > 0

  const trialDaysLeft =
    sub?.status === "trialing" ? sub?.trial_days_left ?? 0 : 0

  const tierFeatures: TierFeatures = user?.role === "admin"
    ? {
        ai_content_generator: { enabled: true, credits: 999 },
        social_listening: true,
        campaigns: true,
        team_collaboration: true,
        auto_reply: true,
        link_in_bio: true,
        idea_board: true,
        advanced_analytics: true,
        api_access: true,
        recurring_content: true,
        custom_workflows: true,
        max_accounts: 999,
        max_users: 999,
      }
    : features?.features ?? DEFAULT_FEATURES

  return (
    <SubscriptionContext.Provider
      value={{
        hasAccess,
        subscription,
        loading,
        expiredReason,
        checkSubscriptionAccess: fetchSubscription,
        showTrialWarning,
        trialDaysLeft,
        features,
        tierFeatures,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx)
    throw new Error("useSubscription must be used within SubscriptionProvider")
  return ctx
}
