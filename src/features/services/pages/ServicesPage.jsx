import { useState } from 'react'
import { Scissors, Plus, Edit, Power, Settings } from 'lucide-react'
import { useServices, useServiceCategories, useDeleteService, useDeleteCategory } from '../hooks/useServices'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ServiceForm } from '../components/ServiceForm'
import { CategoryForm } from '../components/CategoryForm'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { formatDuration } from '@/lib/formatters/dates'

export function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [serviceFormOpen, setServiceFormOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [catFormOpen, setCatFormOpen] = useState(false)

  const { data: categories = [] } = useServiceCategories()
  const { data: services = [], isLoading } = useServices({ categoryId: selectedCategory || undefined })
  const { mutate: deactivate } = useDeleteService()
  const { mutate: deleteCategory } = useDeleteCategory()

  function openEditService(service) {
    setEditingService(service)
    setServiceFormOpen(true)
  }

  function closeServiceForm() {
    setEditingService(null)
    setServiceFormOpen(false)
  }

  function openEditCategory(cat) {
    setEditingCategory(cat)
    setCatFormOpen(true)
  }

  function closeCatForm() {
    setEditingCategory(null)
    setCatFormOpen(false)
  }

  return (
    <div className="page-container space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Servicios</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCatModalOpen(true)}>
            <Settings className="w-4 h-4" />
            Categorías
          </Button>
          <Button onClick={() => setServiceFormOpen(true)}>
            <Plus className="w-4 h-4" />
            Nuevo servicio
          </Button>
        </div>
      </div>

      {/* Filtro por categoría */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors
            ${!selectedCategory ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todos
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors
              ${selectedCategory === cat.id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Lista de servicios */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Sin servicios"
          description="Comenzá creando los servicios de tu centro."
          action={<Button onClick={() => setServiceFormOpen(true)}><Plus className="w-4 h-4" />Nuevo servicio</Button>}
        />
      ) : (
        <div className="space-y-2">
          {services.map(service => (
            <div key={service.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-soft transition-all">
              <div
                className="w-2 h-10 rounded-full shrink-0"
                style={{ backgroundColor: service.category?.color || '#a87030' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">{service.name}</p>
                  {service.online_booking_enabled && (
                    <Badge color="green">Online</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {formatDuration(service.duration_minutes)}
                  {service.buffer_after_minutes > 0 && ` + ${service.buffer_after_minutes}min buffer`}
                  {service.category && ` · ${service.category.name}`}
                </p>
              </div>
              <MoneyDisplay amount={service.price} />
              <div className="flex gap-1">
                <button
                  onClick={() => openEditService(service)}
                  className="p-2 text-gray-400 hover:text-brand-600 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deactivate(service.id)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg"
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: nuevo/editar servicio */}
      <Modal
        open={serviceFormOpen}
        onOpenChange={(open) => { if (!open) closeServiceForm() }}
        title={editingService ? 'Editar servicio' : 'Nuevo servicio'}
        size="lg"
      >
        <ServiceForm
          service={editingService}
          categories={categories}
          onSuccess={closeServiceForm}
          onCancel={closeServiceForm}
        />
      </Modal>

      {/* Modal: gestionar categorías */}
      <Modal
        open={catModalOpen}
        onOpenChange={(open) => { if (!open) setCatModalOpen(false) }}
        title="Gestionar categorías"
        size="md"
      >
        <div className="space-y-3">
          <div className="space-y-2">
            {categories.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin categorías. Creá la primera.</p>
            )}
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-lg">{cat.icon}</span>
                <span className="text-sm font-medium text-gray-800 flex-1">{cat.name}</span>
                <button
                  onClick={() => openEditCategory(cat)}
                  className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={() => { setCatFormOpen(true) }}
          >
            <Plus className="w-4 h-4" />
            Nueva categoría
          </Button>
        </div>
      </Modal>

      {/* Modal: form de categoría */}
      <Modal
        open={catFormOpen}
        onOpenChange={(open) => { if (!open) closeCatForm() }}
        title={editingCategory ? 'Editar categoría' : 'Nueva categoría'}
        size="sm"
      >
        <CategoryForm
          category={editingCategory}
          onSuccess={closeCatForm}
          onCancel={closeCatForm}
        />
      </Modal>
    </div>
  )
}
