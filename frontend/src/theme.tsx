import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"

type Theme = "dark" | "light"
type ThemePreference = "dark" | "light" | "system"

interface ThemeContextValue {
  theme: Theme
  preference: ThemePreference
  toggleTheme: () => void
  setTheme: (t: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): Theme {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light"
  }
  return "dark"
}

function resolveTheme(pref: ThemePreference): Theme {
  if (pref === "system") return getSystemTheme()
  return pref
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("sp-theme") as ThemePreference) ?? "system"
    }
    return "system"
  })

  const [theme, setTheme] = useState<Theme>(() => resolveTheme(preference))

  // Sync data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  // Listen for system theme changes when preference is "system"
  useEffect(() => {
    if (preference !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    const handler = () => setTheme(getSystemTheme())
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [preference])

  const updatePreference = useCallback((pref: ThemePreference) => {
    localStorage.setItem("sp-theme", pref)
    setPreference(pref)
    setTheme(resolveTheme(pref))
  }, [])

  const toggleTheme = useCallback(() => {
    const newPref = theme === "dark" ? "light" : "dark"
    updatePreference(newPref)
  }, [theme, updatePreference])

  return (
    <ThemeContext.Provider value={{ theme, preference, toggleTheme, setTheme: updatePreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
