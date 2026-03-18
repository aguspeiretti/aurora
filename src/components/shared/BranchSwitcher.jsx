import * as Select from '@radix-ui/react-select'
import { ChevronDown, Building2 } from 'lucide-react'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { cn } from '@/lib/utils/cn'

export function BranchSwitcher() {
  const { branches, currentBranch, selectBranch } = useOrgContext()

  if (branches.length <= 1) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-gray-600 px-2 py-1.5">
        <Building2 className="w-3.5 h-3.5 text-gray-400" />
        <span className="hidden sm:inline max-w-[120px] truncate">
          {currentBranch?.name || '—'}
        </span>
      </div>
    )
  }

  return (
    <Select.Root
      value={currentBranch?.id || ''}
      onValueChange={(id) => {
        const branch = branches.find(b => b.id === id)
        if (branch) selectBranch(branch)
      }}
    >
      <Select.Trigger
        className={cn(
          'flex items-center gap-1.5 text-sm text-gray-700 px-2.5 py-1.5',
          'rounded-xl border border-gray-200 hover:bg-gray-50 focus:outline-none',
          'focus:ring-2 focus:ring-brand-400 transition-all max-w-[160px]'
        )}
      >
        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <Select.Value>
          <span className="hidden sm:inline truncate">{currentBranch?.name || 'Sucursal'}</span>
        </Select.Value>
        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="z-50 bg-white rounded-xl shadow-soft border border-gray-100 py-1 min-w-[160px]"
          position="popper"
          sideOffset={5}
        >
          <Select.Viewport>
            {branches.map((branch) => (
              <Select.Item
                key={branch.id}
                value={branch.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer',
                  'hover:bg-brand-50 hover:text-brand-700 outline-none',
                  currentBranch?.id === branch.id && 'text-brand-700 font-medium'
                )}
              >
                <Select.ItemText>{branch.name}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
