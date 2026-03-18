import { formatMoney } from '@/lib/formatters/money'
import { cn } from '@/lib/utils/cn'

export function MoneyDisplay({ amount, currency = 'ARS', className, size = 'md' }) {
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl font-bold',
    xl: 'text-2xl font-bold',
  }

  return (
    <span className={cn('tabular-nums font-medium', sizes[size], className)}>
      {formatMoney(amount, currency)}
    </span>
  )
}
