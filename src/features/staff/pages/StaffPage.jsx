import { useState, useEffect, useRef } from 'react'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { Plus, Edit, Wrench, CalendarClock, Scissors } from 'lucide-react'
import { useStaff, useCreateStaff, useUpdateStaff, useStaffBranchAssignments, useSaveStaffBranchAssignments } from '../hooks/useStaff'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'
import { StaffScheduleModal } from '../components/StaffScheduleModal'
import { StaffServicesModal } from '../components/StaffServicesModal'

export function StaffPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [scheduleStaff, setScheduleStaff] = useState(null)
  const [servicesStaff, setServicesStaff] = useState(null)

  // branchId: null → sin filtro de sucursal, muestra todos los profesionales de la org
  const { data: staffList = [], isLoading } = useStaff({ active: undefined, branchId: null })

  function openEdit(staff) {
    setEditingStaff(staff)
    setFormOpen(true)
  }

  return (
    <div className="page-container space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Profesionales</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Nueva profesional
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-40" />
          ))}
        </div>
      ) : staffList.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Sin profesionales"
          action={<Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />Nueva</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map(staff => (
            <div key={staff.id} className="card">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: staff.color + '20', color: staff.color }}
                >
                  <span className="font-bold">{staff.display_name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{staff.display_name}</p>
                  {staff.specialty && (
                    <p className="text-xs text-gray-500 truncate">{staff.specialty}</p>
                  )}
                </div>
                <button onClick={() => setServicesStaff(staff)} className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg" title="Servicios">
                  <Scissors className="w-4 h-4" />
                </button>
                <button onClick={() => setScheduleStaff(staff)} className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg" title="Horarios">
                  <CalendarClock className="w-4 h-4" />
                </button>
                <button onClick={() => openEdit(staff)} className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              {staff.services?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {staff.services.slice(0, 3).map(({ service }) => (
                    <Badge key={service.id} color="brand">{service.name}</Badge>
                  ))}
                  {staff.services.length > 3 && (
                    <Badge color="gray">+{staff.services.length - 3}</Badge>
                  )}
                </div>
              )}

              {staff.commission_type !== 'none' && (
                <p className="text-xs text-gray-400 mt-2">
                  Comisión: {staff.commission_value}
                  {staff.commission_type === 'percentage' ? '%' : ' fijo'}
                </p>
              )}

              {!staff.active && (
                <Badge color="gray" className="mt-2">Inactiva</Badge>
              )}
            </div>
          ))}
        </div>
      )}

      <StaffServicesModal
        open={!!servicesStaff}
        onClose={() => setServicesStaff(null)}
        staff={servicesStaff}
      />

      <StaffScheduleModal
        open={!!scheduleStaff}
        onClose={() => setScheduleStaff(null)}
        staff={scheduleStaff}
      />

      <Modal
        open={formOpen}
        onOpenChange={(open) => { if (!open) { setEditingStaff(null); setFormOpen(false) } }}
        title={editingStaff ? 'Editar profesional' : 'Nueva profesional'}
      >
        <StaffForm
          staff={editingStaff}
          onSuccess={() => { setEditingStaff(null); setFormOpen(false) }}
          onCancel={() => { setEditingStaff(null); setFormOpen(false) }}
        />
      </Modal>
    </div>
  )
}

function StaffForm({ staff, onSuccess, onCancel }) {
  const { mutate: createStaff, isPending: creating } = useCreateStaff()
  const { mutate: updateStaff, isPending: updating } = useUpdateStaff()
  const { mutate: saveBranches, isPending: savingBranches } = useSaveStaffBranchAssignments(staff?.id)
  const { data: assignedBranchIds = [], isLoading: loadingBranches } = useStaffBranchAssignments(staff?.id)
  const { branches } = useOrgContext()

  const [selectedBranches, setSelectedBranches] = useState([])
  const branchesLoaded = useRef(false)

  useEffect(() => {
    if (loadingBranches || branchesLoaded.current) return
    branchesLoaded.current = true
    setSelectedBranches(assignedBranchIds)
  }, [assignedBranchIds, loadingBranches])

  const { register, handleSubmit } = useForm({
    defaultValues: staff || { color: '#a87030', commission_type: 'none', commission_value: 0, show_in_booking: true },
  })

  function toggleBranch(id) {
    setSelectedBranches(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id])
  }

  function onSubmit({ branches, services, profile, ...data }) {
    if (staff) {
      updateStaff({ id: staff.id, ...data }, {
        onSuccess: () => {
          saveBranches(selectedBranches, { onSuccess })
        },
      })
    } else {
      createStaff(data, { onSuccess })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Nombre visible" required {...register('display_name')} />
        </div>
        <Input label="Especialidad" placeholder="Depilación láser, uñas..." {...register('specialty')} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Color en agenda</label>
          <input type="color" className="h-10 w-full rounded-xl cursor-pointer border border-gray-200"
            {...register('color')} />
        </div>
      </div>
      <Textarea label="Bio" rows={2} {...register('bio')} />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Tipo de comisión</label>
          <select className="input-base" {...register('commission_type')}>
            <option value="none">Sin comisión</option>
            <option value="percentage">Porcentaje</option>
            <option value="fixed">Monto fijo</option>
          </select>
        </div>
        <Input label="Valor comisión" type="number" min={0}
          {...register('commission_value', { valueAsNumber: true })} />
      </div>

      {/* Branch assignment — only shown when editing */}
      {staff && branches?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-700">Sucursales donde trabaja</p>
          {branches.map(branch => (
            <label key={branch.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedBranches.includes(branch.id)}
                onChange={() => toggleBranch(branch.id)}
                className="w-4 h-4 rounded accent-brand-600"
              />
              <span className="text-sm text-gray-700">{branch.name}</span>
            </label>
          ))}
        </div>
      )}

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" className="w-4 h-4 rounded accent-brand-600" {...register('show_in_booking')} />
        <span className="text-sm text-gray-700">Visible en el portal de reservas</span>
      </label>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={creating || updating || savingBranches}>
          {staff ? 'Guardar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
