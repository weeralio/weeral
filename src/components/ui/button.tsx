import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070f]',
  {
    variants: {
      variant: {
        default:    'bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_6px_28px_rgba(139,92,246,0.45)] hover:-translate-y-px',
        secondary:  'bg-[#111128] border border-[#1e1e3f] text-[#94a3b8] hover:border-[#8b5cf6]/40 hover:text-white hover:bg-[#16163a]',
        ghost:      'text-[#94a3b8] hover:text-white hover:bg-[#111128]',
        danger:     'bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-950/70 hover:border-red-700/60',
        outline:    'border border-[#3b3b6f] text-[#94a3b8] hover:border-[#8b5cf6]/60 hover:text-[#a78bfa] hover:bg-[#8b5cf6]/5',
        link:       'text-[#8b5cf6] underline-offset-4 hover:text-[#a78bfa] hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm:      'h-8 px-3 text-xs',
        lg:      'h-11 px-6',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
