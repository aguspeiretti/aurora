import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useStaffServices, useSaveStaffServices } from '../hooks/useStaff'
import { useServices } from '@/features/services/hooks/useServices'

export function StaffServicesModal({ open, onClose, staff }) {
  const { data: allServices = [], isLoading: loadingServices } = useServices({ active: true })
  const { data: assignedIds = [], isLoading: loadingAssigned } = useStaffServices(staff?.id)
  const { mutate: save, isPending } = useSaveStaffServices(staff?.id)

  const [selected, setSelected] = useState([])
  const loadedFor = useRef(null)

  useEffect(() => {
    if (loadingAssigned || loadedFor.current === staff?.id) return
    loadedFor.current = staff?.id
    setSelected(assignedIds)
  }, [assignedIds, loadingAssigned, staff?.id])

  function toggle(serviceId) {
    setSelected(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    )
  }

  function selectAll() { setSelected(allServices.map(s => s.id)) }
  function clearAll() { setSelected([]) }

  const isLoading = loadingServices || loadingAssigned

  // Group by category
  const grouped = allServices.reduce((acc, svc) => {
    const cat = svc.category?.name || 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(svc)
    return acc
  }, {})

  return (
    <Modal
      open={open}
      onOpenChange={o => { if (!o) onClose() }}
      title={`Servicios — ${staff?.display_name}`}
      size="md"
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {selected.length} de {allServices.length} seleccionados
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={selectAll} className="text-xs text-brand-600 hover:underline">
                Todos
              </button>
              <button type="button" onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
                Ninguno
              </button>
            </div>
          </div>

          {/* Service list grouped by category */}
          <div className="space-y-3 max-h-[55vh] overflow-y-auto -mx-1 px-1">
            {Object.entries(grouped).map(([cat, services]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
                  {cat}
                </p>
                <div className="space-y-1">
                  {services.map(svc => {
                    const checked = selected.includes(svc.id)
                    return (
                      <label
                        key={svc.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                          ${checked ? 'border-brand-200 bg-brand-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(svc.id)}
                          className="w-4 h-4 rounded accent-brand-600 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${checked ? 'text-gray-900' : 'text-gray-600'}`}>
                            {svc.name}
                          </p>
                          {svc.duration_minutes && (
                            <p className="text-xs text-gray-400">{svc.duration_minutes} min</p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}

            {allServices.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">
                No hay servicios creados todavía
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => save(selected, { onSuccess: onClose })} loading={isPending}>
              Guardar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
