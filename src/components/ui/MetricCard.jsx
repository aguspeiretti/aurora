import { cn } from '@/lib/utils/cn'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  iconColor = 'brand',
  loading = false,
  className,
}) {
  const iconColors = {
    brand:   'bg-brand-50 text-brand-600',
    blue:    'bg-blue-50 text-blue-600',
    green:   'bg-emerald-50 text-emerald-600',
    yellow:  'bg-yellow-50 text-yellow-600',
    red:     'bg-red-50 text-red-600',
    purple:  'bg-brand-50 text-brand-600',
    orange:  'bg-orange-50 text-orange-600',
    cyan:    'bg-cyan-50 text-cyan-600',
  }

  const trendColor =
    trend === 'up' ? 'text-emerald-600' :
    trend === 'down' ? 'text-red-500' :
    'text-gray-500'

  const TrendIcon =
    trend === 'up' ? TrendingUp :
    trend === 'down' ? TrendingDown :
    Minus

  if (loading) {
    return (
      <div className={cn('card animate-pulse', className)}>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    )
  }

  return (
    <div className={cn('card', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
          )}
          {trendValue && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trendColor)}>
              <TrendIcon className="w-3.5 h-3.5" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('p-2.5 rounded-xl shrink-0', iconColors[iconColor] || iconColors.brand)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  )
}
