import { Component, type ReactNode, type ErrorInfo } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    document.getElementById("root")?.setAttribute("data-error", error.message)
    console.error("🔥 ErrorBoundary caught:", error.message)
    console.error("🔥 Component stack:", info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{ padding: 40, color: "#f87171" }}>
          <h2>Something went wrong</h2>
          <pre style={{ marginTop: 12, fontSize: 13, whiteSpace: "pre-wrap", color: "#f87171" }}>
            {this.state.error?.message}
            {this.state.error?.stack?.split("\n").slice(0,3).join("\n")}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
