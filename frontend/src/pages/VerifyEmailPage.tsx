import { useEffect, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { apiFetch } from "@/lib/utils"

type VerificationState = "loading" | "success" | "error"

export function VerifyEmailPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState<VerificationState>("loading")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    const token = searchParams.get("token")

    if (!token) {
      setState("error")
      setErrorMessage("No verification token provided. Check your email for a valid verification link.")
      return
    }

    apiFetch<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        setState("success")
        // Clean up URL params
        setSearchParams({}, { replace: true })
      })
      .catch((err) => {
        setState("error")
        setErrorMessage(err instanceof Error ? err.message : "Email verification failed. The link may have expired.")
        setSearchParams({}, { replace: true })
      })
  }, [searchParams, setSearchParams])

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <Card className="border-border shadow-2xl p-8">
          <div className="flex flex-col items-center text-center">
            <img src="/icon.svg" alt="SocialPulses" className="h-14 w-14 mb-6 logo-icon" />

            {state === "loading" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <Loader2 className="h-12 w-12 text-accent animate-spin" />
                <h1 className="text-lg font-semibold text-primary">Verifying your email...</h1>
                <p className="text-sm text-muted">Please wait while we verify your email address.</p>
              </motion.div>
            )}

            {state === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                >
                  <CheckCircle2 className="h-16 w-16 text-green" />
                </motion.div>
                <h1 className="text-lg font-semibold text-primary">Email verified! 🎉</h1>
                <p className="text-sm text-muted">You can now log in to your account.</p>
                <Link to="/login" className="w-full mt-2">
                  <Button className="w-full h-11 text-base font-semibold">
                    Go to login
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
            )}

            {state === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-4"
              >
                <XCircle className="h-16 w-16 text-red" />
                <h1 className="text-lg font-semibold text-primary">Verification failed</h1>
                <p className="text-sm text-muted">{errorMessage}</p>
                <Link to="/login" className="w-full mt-2">
                  <Button variant="secondary" className="w-full h-11 text-base font-semibold">
                    Back to login
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
        </Card>

        <p className="text-center text-xs text-muted mt-6">
          &copy; {new Date().getFullYear()} SocialPulses. All rights reserved.
        </p>
      </motion.div>
    </div>
  )
}
