import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ShieldAlert, RefreshCw, CheckCircle2 } from "lucide-react"
import { apiFetch } from "@/lib/utils"

interface Props {
  email: string
  emailVerified: boolean
}

export function EmailVerificationBanner({ email, emailVerified }: Props) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("sp-email-banner-dismissed") === "true")
  const handleDismiss = () => {
    sessionStorage.setItem("sp-email-banner-dismissed", "true")
    setDismissed(true)
  }
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [fadingOut, setFadingOut] = useState(false)

  // Auto-dismiss after 30s
  useEffect(() => {
    if (resent) {
      const timer = setTimeout(() => {
        setFadingOut(true)
        setTimeout(() => setResent(false), 500)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [resent])

  if (emailVerified || dismissed || fadingOut) return null

  const handleResend = async () => {
    setResending(true)
    try {
      await apiFetch("/auth/resend-verification", { method: "POST" })
      setResent(true)
    } catch {
      setNotice("Failed to send. Try again later.")
    } finally {
      setResending(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="relative bg-gradient-to-r from-blue-600/20 to-blue-700/10 border border-blue-500/30 rounded-xl mx-4 mt-3 mb-1 shadow-lg shadow-blue-500/10"
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="mt-0.5 shrink-0">
            {resent ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-200">
              {resent ? "Email sent!" : "Verify your email address"}
            </p>
            <p className="text-xs text-blue-300/80 mt-0.5">
              {resent
                ? `Check ${email} for the verification link.`
                : `Please verify ${email} to unlock all features and activate your account.`}
            </p>
            {notice && (
              <p className="text-xs text-blue-300/90 mt-1 italic">{notice}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleResend}
              disabled={resending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-300 hover:text-blue-200 hover:bg-blue-500/15 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Sending..." : "Resend"}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg p-1.5 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/15 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
