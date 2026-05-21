import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-0",
  {
    variants: {
      variant: {
        default:
          "bg-accent/15 text-accent border border-accent/20",
        secondary:
          "bg-surface-3 text-secondary border border-border",
        outline:
          "bg-transparent text-secondary border border-border",
        success:
          "bg-green/15 text-green border border-green/20",
        warning:
          "bg-amber/15 text-amber border border-amber/20",
        danger:
          "bg-red/15 text-red border border-red/20",
        info:
          "bg-blue/15 text-blue border border-blue/20",
        purple:
          "bg-purple/15 text-purple border border-purple/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
