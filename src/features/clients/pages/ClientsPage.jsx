import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Phone, Mail } from 'lucide-react'
import { useClients } from '../hooks/useClients'
import { useDebounce } from '@/lib/utils/useDebounce'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Modal } from '@/components/ui/Modal'
import { ClientForm } from '../components/ClientForm'
import { formatDate } from '@/lib/formatters/dates'

export function ClientsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [newModalOpen, setNewModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 350)
  const isSearching = debouncedSearch.trim().length > 0
  const { data, isLoading } = useClients({ search: debouncedSearch })
  const clients = data?.data || []
  const total = data?.count || 0

  return (
    <div className="page-container space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {!isLoading && (
              isSearching
                ? `${clients.length} resultado${clients.length !== 1 ? 's' : ''}`
                : `${total} registradas`
            )}
          </p>
        </div>
        <Button onClick={() => setNewModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Nueva clienta
        </Button>
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nombre, teléfono o email..."
        className="max-w-md"
      />

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-12 bg-gray-100 rounded-xl mb-3" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin clientas"
          description={search ? 'No se encontraron resultados.' : 'Empezá agregando tu primera clienta.'}
          action={
            <Button onClick={() => setNewModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Nueva clienta
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => navigate(`/app/clients/${client.id}`)}
            />
          ))}
        </div>
      )}

      {/* New client modal */}
      <Modal
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        title="Nueva clienta"
        size="md"
      >
        <ClientForm
          onSuccess={() => setNewModalOpen(false)}
          onCancel={() => setNewModalOpen(false)}
        />
      </Modal>
    </div>
  )
}

function ClientCard({ client, onClick }) {
  return (
    <div
      onClick={onClick}
      className="card cursor-pointer hover:border-brand-200 hover:shadow-soft transition-all"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">
            {client.full_name[0]?.toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{client.full_name}</p>
          {client.phone && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {client.phone}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{client.total_visits} visitas</span>
        <MoneyDisplay amount={client.total_spent} size="sm" />
      </div>

      {client.last_visit_at && (
        <p className="text-xs text-gray-400 mt-1">
          Última visita: {formatDate(client.last_visit_at)}
        </p>
      )}

      {client.no_show_count > 0 && (
        <Badge color="red" className="mt-2">
          {client.no_show_count} ausente{client.no_show_count !== 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  )
}
