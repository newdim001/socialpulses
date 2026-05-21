import { lazy, Suspense } from "react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider, useAuth } from "@/auth/AuthProvider"
import { SubscriptionProvider, useSubscription, type TierFeatures } from "@/auth/SubscriptionProvider"

const LoginPage = lazy(() => import("@/pages/LoginPage").then(m => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import("@/pages/SignupPage").then(m => ({ default: m.SignupPage })))
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage").then(m => ({ default: m.VerifyEmailPage })))
const AppLayout = lazy(() => import("@/layouts/AppLayout").then(m => ({ default: m.AppLayout })))
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage })))
const CalendarPage = lazy(() => import("@/pages/CalendarPage").then(m => ({ default: m.CalendarPage })))
const ComposePage = lazy(() => import("@/pages/ComposePage").then(m => ({ default: m.ComposePage })))
const MediaPage = lazy(() => import("@/pages/MediaPage").then(m => ({ default: m.MediaPage })))
const HistoryPage = lazy(() => import("@/pages/HistoryPage").then(m => ({ default: m.HistoryPage })))
const KanbanPage = lazy(() => import("@/pages/KanbanPage").then(m => ({ default: m.KanbanPage })))
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })))
const InboxPage = lazy(() => import("@/pages/InboxPage").then(m => ({ default: m.InboxPage })))
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then(m => ({ default: m.SettingsPage })))
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then(m => ({ default: m.ProfilePage })))
const AccountsPage = lazy(() => import("@/pages/AccountsPage").then(m => ({ default: m.AccountsPage })))
const AdminPage = lazy(() => import("@/pages/AdminPage").then(m => ({ default: m.AdminPage })))
const BillingPage = lazy(() => import("@/pages/BillingPage").then(m => ({ default: m.BillingPage })))
const ReportsPage = lazy(() => import("@/pages/ReportsPage").then(m => ({ default: m.ReportsPage })))
const PremiumAnalyticsPage = lazy(() => import("@/pages/PremiumAnalyticsPage").then(m => ({ default: m.PremiumAnalyticsPage })))
const AlertsPage = lazy(() => import("@/pages/AlertsPage").then(m => ({ default: m.AlertsPage })))
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage").then(m => ({ default: m.NotificationsPage })))
const BulkUploadPage = lazy(() => import("@/pages/BulkUploadPage").then(m => ({ default: m.BulkUploadPage })))
const SavedRepliesPage = lazy(() => import("@/pages/SavedRepliesPage").then(m => ({ default: m.SavedRepliesPage })))
const TemplatesPage = lazy(() => import("@/pages/TemplatesPage").then(m => ({ default: m.TemplatesPage })))
const RssFeedsPage = lazy(() => import("@/pages/RssFeedsPage").then(m => ({ default: m.RssFeedsPage })))
const HashtagsPage = lazy(() => import("@/pages/HashtagsPage").then(m => ({ default: m.HashtagsPage })))
const LinkBioPage = lazy(() => import("@/pages/LinkBioPage").then(m => ({ default: m.LinkBioPage })))
const UTMPage = lazy(() => import("@/pages/UTMPage").then(m => ({ default: m.UTMPage })))
const AutoReplyPage = lazy(() => import("@/pages/AutoReplyPage").then(m => ({ default: m.AutoReplyPage })))
const ApprovalsPage = lazy(() => import("@/pages/ApprovalsPage").then(m => ({ default: m.ApprovalsPage })))
const ListeningPage = lazy(() => import("@/pages/ListeningPage").then(m => ({ default: m.ListeningPage })))
const InfluencersPage = lazy(() => import("@/pages/InfluencersPage").then(m => ({ default: m.InfluencersPage })))
const CampaignsPage = lazy(() => import("@/pages/CampaignsPage").then(m => ({ default: m.CampaignsPage })))
const RepurposePage = lazy(() => import("@/pages/RepurposePage").then(m => ({ default: m.RepurposePage })))
const HelpCenterPage = lazy(() => import("@/pages/HelpCenterPage").then(m => ({ default: m.HelpCenterPage })))
const AffiliatePage = lazy(() => import("@/pages/AffiliatePage").then(m => ({ default: m.AffiliatePage })))
import GrowthPage from "@/pages/GrowthPage"
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage").then(m => ({ default: m.PrivacyPage })))
const TermsPage = lazy(() => import("@/pages/TermsPage").then(m => ({ default: m.TermsPage })))

// ---------------------------------------------------------------------------
// Feature-gated routes — redirect to /billing if feature not available
// ---------------------------------------------------------------------------
const FEATURE_GATED_ROUTES: Record<string, keyof TierFeatures> = {
  "/listening": "social_listening",
  "/influencers": "social_listening",
  "/campaigns": "campaigns",
  "/auto-reply": "auto_reply",
  "/link-in-bio": "link_in_bio",
  "/idea-board": "idea_board",
  "/reports": "advanced_analytics",
  "/premium-analytics": "advanced_analytics",
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
})

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
    </div>
  )
}

function FeatureGuard({ children }: { children: React.ReactNode }) {
  const { tierFeatures } = useSubscription()
  const location = useLocation()

  const requiredFeature = FEATURE_GATED_ROUTES[location.pathname]
  if (requiredFeature) {
    const value = (tierFeatures as any)[requiredFeature]
    let hasFeature = false
    if (typeof value === "boolean") hasFeature = value
    else if (typeof value === "object" && value !== null) hasFeature = value.enabled ?? false

    if (!hasFeature) {
      return <Navigate to="/billing" replace />
    }
  }

  return <>{children}</>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { hasAccess, loading: subLoading } = useSubscription()

  if (loading || subLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (!hasAccess) {
    return <SubscriptionGuard>{children}</SubscriptionGuard>
  }

  return <FeatureGuard>{children}</FeatureGuard>
}

function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { hasAccess } = useSubscription()
  const currentPath = window.location.pathname

  if (!hasAccess && !currentPath.includes("/billing")) {
    return <Navigate to="/billing" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SubscriptionProvider>
            <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<DashboardPage />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="compose" element={<ComposePage />} />
                  <Route path="media" element={<MediaPage />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="kanban" element={<KanbanPage />} />
                  <Route path="idea-board" element={<KanbanPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="inbox" element={<InboxPage />} />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="admin" element={<AdminPage />} />
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="premium-analytics" element={<PremiumAnalyticsPage />} />
                  <Route path="alerts" element={<AlertsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="bulk-upload" element={<BulkUploadPage />} />
                  <Route path="saved-replies" element={<SavedRepliesPage />} />
                  <Route path="templates" element={<TemplatesPage />} />
                  <Route path="rss-feeds" element={<RssFeedsPage />} />
                  <Route path="hashtags" element={<HashtagsPage />} />
                  <Route path="link-in-bio" element={<LinkBioPage />} />
                  <Route path="utm" element={<UTMPage />} />
                  <Route path="auto-reply" element={<AutoReplyPage />} />
                  <Route path="approvals" element={<ApprovalsPage />} />
                  <Route path="listening" element={<ListeningPage />} />
                  <Route path="influencers" element={<InfluencersPage />} />
                  <Route path="campaigns" element={<CampaignsPage />} />
                  <Route path="repurpose" element={<RepurposePage />} />
                  <Route path="help" element={<HelpCenterPage />} />
                  <Route path="affiliate" element={<AffiliatePage />} />
                  <Route path="growth" element={<GrowthPage />} />
                </Route>
              </Routes>
            </Suspense>
            </ErrorBoundary>
            <Toaster />
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}