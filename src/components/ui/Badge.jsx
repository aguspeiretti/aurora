import { cn } from '@/lib/utils/cn'

const colorMap = {
  gray:   'bg-gray-100 text-gray-700',
  red:    'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  green:  'bg-emerald-100 text-emerald-700',
  blue:   'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  purple: 'bg-brand-100 text-brand-700',
  pink:   'bg-pink-100 text-pink-700',
  orange: 'bg-orange-100 text-orange-700',
  cyan:   'bg-cyan-100 text-cyan-700',
  brand:  'bg-brand-100 text-brand-700',
}

export function Badge({ children, color = 'gray', className, dot = false }) {
  return (
    <span className={cn('badge-base', colorMap[color] || colorMap.gray, className)}>
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            color === 'green' && 'bg-emerald-500',
            color === 'yellow' && 'bg-yellow-500',
            color === 'red' && 'bg-red-500',
            color === 'blue' && 'bg-blue-500',
            color === 'gray' && 'bg-gray-400',
            color === 'indigo' && 'bg-indigo-500',
            color === 'purple' && 'bg-brand-500',
            color === 'orange' && 'bg-orange-500',
            color === 'brand' && 'bg-brand-500',
          )}
        />
      )}
      {children}
    </span>
  )
}
