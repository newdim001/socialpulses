import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt: string = "MMM d, yyyy") {
  const d = new Date(date)
  const options: Intl.DateTimeFormatOptions = {}
  if (fmt.includes("MMM")) options.month = "short"
  if (fmt.includes("MMMM")) options.month = "long"
  if (fmt.includes("d")) options.day = "numeric"
  if (fmt.includes("yyyy")) options.year = "numeric"
  if (fmt.includes("yy")) options.year = "2-digit"
  if (fmt.includes("h") || fmt.includes("H")) {
    options.hour = "numeric"
    options.minute = "2-digit"
  }
  return d.toLocaleDateString("en-US", options)
}

export const API_BASE = "/api"

// ---------------------------------------------------------------------------
// HTTP 402 interceptor — called when any API endpoint returns 402
// (trial expired / payment required)
// ---------------------------------------------------------------------------
type PaymentRequiredHandler = (reason?: string) => void
let paymentRequiredHandler: PaymentRequiredHandler | null = null

export function onPaymentRequired(handler: PaymentRequiredHandler) {
  paymentRequiredHandler = handler
}

export function clearPaymentRequiredHandler() {
  paymentRequiredHandler = null
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("sp-token")
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  }
  // For FormData uploads, let the browser set Content-Type (with multipart boundary)
  if (options?.body instanceof FormData) {
    delete headers["Content-Type"]
  }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    // HTTP 402 = trial expired / payment required
    if (res.status === 402) {
      const body = await res.json().catch(() => ({ reason: "payment_required" }))
      paymentRequiredHandler?.(body.reason)
    }
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "API Error")
  }
  return res.json()
}
