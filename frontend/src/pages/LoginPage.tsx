import { useState, useEffect, type FormEvent } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Moon, Sun, Eye, EyeOff, Loader2 } from "lucide-react"
import { useAuth } from "@/auth/AuthProvider"
import { useTheme } from "@/theme"
import { cn } from "@/lib/utils"

const GOOGLE_OAUTH_URL = "https://api.socialpulses.io/api/auth/google/login"

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleConfigured, setGoogleConfigured] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(true)

  // Check if Google OAuth is configured on the server
  useEffect(() => {
    fetch("/api/auth/google/config")
      .then((res) => res.json())
      .then((data) => {
        setGoogleConfigured(data.configured === true)
      })
      .catch(() => {
        setGoogleConfigured(false)
      })
      .finally(() => setGoogleLoading(false))
  }, [])

  // Handle Google OAuth callback via URL params (redirect flow)
  useEffect(() => {
    const token = searchParams.get("token")
    const authError = searchParams.get("auth_error")

    if (authError) {
      setError(decodeURIComponent(authError))
      setSearchParams({}, { replace: true })
      return
    }

    if (token) {
      localStorage.setItem("sp-token", token)
      setSearchParams({}, { replace: true })
      window.location.href = "/"
    }
  }, [searchParams, setSearchParams])

  // Listen for OAuth callback messages from popup windows
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "oauth:google") {
        const { token, username, role, client_id, client_name } = event.data
        if (token) {
          localStorage.setItem("sp-token", token)
          if (username) {
            localStorage.setItem("sp-user", JSON.stringify({ username, role, client_id, client_name }))
          }
          window.location.reload()
        }
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError("Username is required")
      return
    }
    if (!password) {
      setError("Password is required")
      return
    }

    setLoading(true)
    try {
      await login(username.trim(), password)
      navigate("/", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    // Full-page redirect is more reliable than popup across all browsers
    window.location.href = GOOGLE_OAUTH_URL
  }

  const GoogleLogo = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4 relative">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:text-primary hover:bg-surface-3 transition-colors"
      >
        {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="bg-surface-2 border border-border rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <img src="/icon.svg" alt="SocialPulses" className="h-14 w-14 mb-3 logo-icon" />
            <h1 className="text-xl font-bold text-primary tracking-tight">SocialPulses</h1>
            <p className="text-sm text-muted mt-1">Sign in to your account</p>
          </div>

          <AnimatedError error={error} onDismiss={() => setError(null)} />

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium text-secondary">Username</label>
              <input
                id="username" type="text" autoComplete="username" autoFocus
                value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className={cn(
                  "w-full rounded-lg border bg-surface-1 px-3 py-2.5 text-sm text-primary placeholder:text-muted/50",
                  "border-border focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30",
                  "transition-all duration-200"
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-secondary">Password</label>
              <div className="relative">
                <input
                  id="password" type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={cn(
                    "w-full rounded-lg border bg-surface-1 px-3 py-2.5 pr-10 text-sm text-primary placeholder:text-muted/50",
                    "border-border focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30",
                    "transition-all duration-200"
                  )}
                />
                <button
                  type="button" onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className={cn(
                "w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white",
                "hover:bg-accent/90 active:bg-accent/80",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-200 flex items-center justify-center gap-2"
              )}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
              ) : "Sign in"}
            </button>
          </form>

          {!googleLoading && googleConfigured && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface-2 px-2 text-muted">or continue with</span>
                </div>
              </div>

              <button
                type="button" onClick={handleGoogleLogin}
                className={cn(
                  "w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f]",
                  "hover:bg-gray-50 active:bg-gray-100",
                  "transition-all duration-200 flex items-center justify-center gap-3 shadow-sm"
                )}
              >
                <GoogleLogo />
                Continue with Google
              </button>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-accent font-medium hover:text-accent/80 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 mt-6">
          <p className="text-center text-xs text-muted">
            &copy; {new Date().getFullYear()} SocialPulses. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs">
            <Link to="/privacy" className="text-muted hover:text-accent transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-muted hover:text-accent transition-colors">Terms of Service</Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function AnimatedError({
  error,
  onDismiss,
}: {
  error: string | null
  onDismiss: () => void
}) {
  if (!error) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.25 }}
      className="mb-4 overflow-hidden"
    >
      <div className="flex items-start gap-2 rounded-lg bg-red/10 border border-red/20 px-3 py-2.5">
        <span className="text-sm text-red flex-1">{error}</span>
        <button
          type="button" onClick={onDismiss}
          className="text-red/60 hover:text-red transition-colors shrink-0"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}
