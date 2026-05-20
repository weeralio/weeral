import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-[#8b5cf6]/15 text-[#a78bfa] ring-[#8b5cf6]/25',
        secondary:   'bg-[#1e1e3f] text-[#94a3b8] ring-[#3b3b6f]/50',
        success:     'bg-emerald-950/40 text-emerald-400 ring-emerald-800/40',
        warning:     'bg-amber-950/40 text-amber-400 ring-amber-800/40',
        danger:      'bg-red-950/40 text-red-400 ring-red-800/40',
        outline:     'bg-transparent text-[#94a3b8] ring-[#1e1e3f]',
        running:     'bg-emerald-950/40 text-emerald-400 ring-emerald-800/40',
        paused:      'bg-amber-950/40 text-amber-400 ring-amber-800/40',
        draft:       'bg-[#1e1e3f] text-[#94a3b8] ring-[#3b3b6f]/50',
        blocked:     'bg-red-950/40 text-red-400 ring-red-800/40',
        completed:   'bg-[#1e1e3f] text-[#475569] ring-[#3b3b6f]/50',
        warmup:      'bg-violet-950/40 text-violet-400 ring-violet-800/40',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
