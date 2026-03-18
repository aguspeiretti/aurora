import { cn } from '@/lib/utils/cn'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { InboxIcon } from 'lucide-react'

export function DataTable({
  columns,
  data = [],
  loading = false,
  emptyTitle = 'Sin resultados',
  emptyDescription = 'No se encontraron registros.',
  onRowClick,
  className,
}) {
  if (loading) {
    return (
      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map((col) => (
                <th key={col.key || col.header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50">
                {columns.map((col) => (
                  <td key={col.key || col.header} className="px-4 py-3">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${Math.random() * 40 + 30}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white">
        <EmptyState
          icon={InboxIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-gray-100', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key || col.header}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              className={cn(
                'hover:bg-gray-50/80 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key || col.header}
                  className={cn('px-4 py-3 text-gray-700', col.cellClassName)}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
