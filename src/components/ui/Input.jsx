import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'
import { AlertCircle } from 'lucide-react'

export const Input = forwardRef(function Input(
  { label, error, hint, className, wrapperClassName, icon: Icon, ...props },
  ref
) {
  return (
    <div className={cn('flex flex-col gap-1', wrapperClassName)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'input-base',
            Icon && 'pl-9',
            error && 'border-red-400 focus:ring-red-400',
            className
          )}
          {...props}
        />
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600 flex items-center gap-1">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, wrapperClassName, rows = 3, ...props },
  ref
) {
  return (
    <div className={cn('flex flex-col gap-1', wrapperClassName)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'input-base resize-none',
          error && 'border-red-400 focus:ring-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
})
