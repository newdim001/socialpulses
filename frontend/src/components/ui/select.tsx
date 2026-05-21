import * as React from "react"
import { cn } from "@/lib/utils"

const SelectContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}>({ value: "", onValueChange: () => {}, open: false, setOpen: () => {} })

function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (value: string) => void; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState("")
  const val = value !== undefined ? value : internalValue
  const onChange = onValueChange || setInternalValue
  return (
    <SelectContext.Provider value={{ value: val, onValueChange: onChange, open, setOpen }}>
      {children}
    </SelectContext.Provider>
  )
}

function SelectTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string; children: React.ReactNode }) {
  const { open, setOpen } = React.useContext(SelectContext)
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4 shrink-0 opacity-50"><path d="m6 9 6 6 6-6"/></svg>
    </button>
  )
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext)
  return <span className={value ? "text-primary" : "text-muted"}>{value || placeholder || "Select..."}</span>
}

function SelectContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open } = React.useContext(SelectContext)
  if (!open) return null
  return (
    <div className={cn(
      "relative z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-surface-2 shadow-lg animate-in fade-in-80",
      className
    )}>
      <div className="p-1 max-h-60 overflow-auto">{children}</div>
    </div>
  )
}

function SelectItem({ value: itemValue, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { value, onValueChange, setOpen } = React.useContext(SelectContext)
  const isSelected = value === itemValue
  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => { onValueChange(itemValue); setOpen(false) }}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors",
        "hover:bg-accent/10 hover:text-primary",
        isSelected ? "bg-accent/10 text-accent" : "text-primary",
        className
      )}
    >
      {children}
    </div>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
