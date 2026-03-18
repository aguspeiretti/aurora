import { useState } from 'react'
import { Plus, Building2, Edit } from 'lucide-react'
import { useResources, useCreateResource, useUpdateResource } from '../hooks/useResources'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/serviceCategories'

export function ResourcesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingResource, setEditingResource] = useState(null)
  const { data: resources = [], isLoading } = useResources()

  const resourceTypeColors = {
    cabin: 'pink', box: 'brand', stretcher: 'green',
    chair: 'blue', laser_machine: 'indigo', machine: 'orange', general: 'gray',
  }

  return (
    <div className="page-container space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Recursos</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Nuevo recurso
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-28" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <EmptyState icon={Building2} title="Sin recursos"
          description="Agregá las cabinas, equipos y recursos de tu centro."
          action={<Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />Nuevo</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map(res => (
            <div key={res.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{res.name}</p>
                  <Badge color={resourceTypeColors[res.type] || 'gray'} className="mt-1">
                    {RESOURCE_TYPE_LABELS[res.type] || res.type}
                  </Badge>
                </div>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: res.color }}
                >
                  {res.name[0]}
                </div>
              </div>
              {res.notes && <p className="text-xs text-gray-500 mt-2">{res.notes}</p>}
              <button
                onClick={() => { setEditingResource(res); setFormOpen(true) }}
                className="mt-2 text-xs text-gray-400 hover:text-brand-600 flex items-center gap-1"
              >
                <Edit className="w-3 h-3" /> Editar
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onOpenChange={(o) => { if (!o) { setEditingResource(null); setFormOpen(false) } }}
        title={editingResource ? 'Editar recurso' : 'Nuevo recurso'}
      >
        <ResourceForm
          resource={editingResource}
          onSuccess={() => { setEditingResource(null); setFormOpen(false) }}
          onCancel={() => { setEditingResource(null); setFormOpen(false) }}
        />
      </Modal>
    </div>
  )
}

function ResourceForm({ resource, onSuccess, onCancel }) {
  const { mutate: create, isPending: creating } = useCreateResource()
  const { mutate: update, isPending: updating } = useUpdateResource()
  const { register, handleSubmit } = useForm({
    defaultValues: resource || { type: 'cabin', color: '#06b6d4' },
  })

  function onSubmit(data) {
    if (resource) {
      update({ id: resource.id, ...data }, { onSuccess })
    } else {
      create(data, { onSuccess })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nombre" required {...register('name')} />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Tipo</label>
        <select className="input-base" {...register('type')}>
          {Object.entries(RESOURCE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Color en agenda</label>
        <input type="color" className="h-10 w-full rounded-xl border border-gray-200 cursor-pointer" {...register('color')} />
      </div>
      <Input label="Notas" {...register('notes')} />
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={creating || updating}>{resource ? 'Guardar' : 'Crear'}</Button>
      </div>
    </form>
  )
}
