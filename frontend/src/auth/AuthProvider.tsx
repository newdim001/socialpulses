import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { apiFetch } from "@/lib/utils"

interface User {
  username: string
  role?: string
  client_id?: string
  client_name?: string
  email_verified?: boolean
  onboarding_completed?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  authError: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  clearAuthError: () => void
  setAuth: (token: string, user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // spUser must be declared BEFORE user since user uses it as initial value
  const [spUser, setSpUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sp-user") || "null") } catch { return null }
  })
  const [user, setUser] = useState<User | null>(spUser)
  const [token, setToken] = useState<string | null>(localStorage.getItem("sp-token"))
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // ── Google OAuth callback handling (URL params) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const googleToken = params.get("token")
    const authErrorParam = params.get("auth_error")
    const googleUsername = params.get("username")
    const googleRole = params.get("role")
    const googleClientId = params.get("client_id")
    const googleClientName = params.get("client_name")
    const googleOnboardingStr = params.get("onboarding_completed")

    if (googleToken) {
      localStorage.setItem("sp-token", googleToken)
      // Set user data immediately from URL params
      const userData = {
        username: googleUsername || "User",
        role: googleRole || undefined,
        client_id: googleClientId || undefined,
        client_name: googleClientName || undefined,
        onboarding_completed: googleOnboardingStr === "true",
      }
      localStorage.setItem("sp-user", JSON.stringify(userData))
      setUser(userData)
      setToken(googleToken)
      // Clean URL — remove all OAuth params
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, "", cleanUrl)
      return // token is now set, the next effect will pick it up
    }

    if (authErrorParam) {
      setAuthError(authErrorParam)
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, "", cleanUrl)
    }
  }, [])

  // ── Existing auth check ──
  useEffect(() => {
    if (token) {
      apiFetch<{ username: string; role?: string; client_id?: string; client_name?: string; onboarding_completed?: boolean; email_verified?: boolean }>(
        "/auth/check"
      )
        .then((u) => {
          localStorage.setItem("sp-user", JSON.stringify(u))
          setUser(u)
        })
        .catch(() => {
          localStorage.removeItem("sp-token")
    localStorage.removeItem("sp-user")
          setToken(null)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (username: string, password: string) => {
    const res = await apiFetch<{
      token: string
      username: string
      role?: string
      client_id?: string
      client_name?: string
      email_verified?: boolean
      onboarding_completed?: boolean
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })
    localStorage.setItem("sp-token", res.token)
    setToken(res.token)
    const userData = {
      username: res.username,
      role: res.role,
      client_id: res.client_id,
      client_name: res.client_name,
      email_verified: res.email_verified,
      onboarding_completed: res.onboarding_completed,
    }
    localStorage.setItem("sp-user", JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem("sp-token")
    localStorage.removeItem("sp-user")
    setToken(null)
    setUser(null)
    setAuthError(null)
  }

  const clearAuthError = () => setAuthError(null)

  return (
    <AuthContext.Provider
      value={{ user, token, loading, authError, login, logout, clearAuthError, setAuth: (t, u) => { setToken(t); setUser(u) } }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
