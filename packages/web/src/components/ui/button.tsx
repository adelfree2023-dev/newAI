import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-2xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 transform-gpu",
    {
        variants: {
            variant: {
                default: "bg-primary-500 text-white hover:bg-primary-600 shadow-[20px_20px_60px_-15px_rgba(37,99,235,0.3)] border border-primary-400/20",
                secondary: "bg-secondary-500 text-white hover:bg-secondary-600 shadow-[20px_20px_60px_-15px_rgba(6,182,212,0.3)] border border-secondary-400/20",
                outline: "border-2 border-gray-200 dark:border-white/10 bg-white/5 backdrop-blur-md text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10",
                ghost: "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200",
            },
            size: {
                default: "h-12 px-6 py-3",
                sm: "h-10 rounded-xl px-4",
                lg: "h-16 rounded-2xl px-10 text-lg",
                xl: "h-20 rounded-3xl px-12 text-xl font-black",
                icon: "h-12 w-12",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)


export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
