import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const fabVariants = cva(
  "inline-flex items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 touch-target",
  {
    variants: {
      size: {
        default: "h-14 w-14",
        sm: "h-12 w-12",
        lg: "h-16 w-16",
      },
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        accent: "bg-blue-600 text-white hover:bg-blue-700",
        success: "bg-green-600 text-white hover:bg-green-700",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface FabProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof fabVariants> {}

const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(fabVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Fab.displayName = "Fab"

export { Fab, fabVariants } 