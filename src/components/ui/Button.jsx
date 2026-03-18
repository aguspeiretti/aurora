import { cn } from '@/lib/utils/cn'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:   'bg-[var(--brand-primary)] text-white hover:brightness-90 focus:ring-[var(--brand-primary)]',
  secondary: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-[var(--brand-primary)]',
  ghost:     'text-gray-600 hover:bg-gray-100 focus:ring-[var(--brand-primary)]',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
  success:   'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400',
  outline:   'border-2 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 focus:ring-[var(--brand-primary)]',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
  icon: 'p-2 w-9 h-9',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-xl',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'active:scale-[0.98] transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  )
}
