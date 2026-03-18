import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import {
  ArrowLeft, Phone, Mail, Instagram, Calendar,
  ShoppingBag, MessageSquare, Camera, Package, Gift, Edit3,
} from 'lucide-react'
import {
  useClientDetail,
  useClientAppointments,
  useClientSales,
  useClientNotes,
  useClientPhotos,
  useAddClientNote,
} from '../hooks/useClients'
import { useAuthContext } from '@/app/providers/AuthProvider'
import { Badge } from '@/components/ui/Badge'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Card } from '@/components/ui/Card'
import { AppointmentStatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ClientForm } from '../components/ClientForm'
import { formatDate, formatDateTime } from '@/lib/formatters/dates'

const tabsList = [
  { value: 'resumen',    label: 'Resumen',  icon: null },
  { value: 'turnos',     label: 'Turnos',   icon: null },
  { value: 'compras',    label: 'Compras',  icon: null },
  { value: 'notas',      label: 'Notas',    icon: null },
  { value: 'fotos',      label: 'Fotos',    icon: null },
]

export function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const [editOpen, setEditOpen] = useState(false)
  const [noteText, setNoteText] = useState('')

  const { data: client, isLoading } = useClientDetail(id)
  const { data: appointments = [] } = useClientAppointments(id)
  const { data: sales = [] } = useClientSales(id)
  const { data: notes = [] } = useClientNotes(id)
  const { data: photos = [] } = useClientPhotos(id)
  const { mutate: addNote, isPending: addingNote } = useAddClientNote()

  if (isLoading) {
    return (
      <div className="page-container max-w-4xl space-y-4">
        <div className="h-8 bg-gray-200 rounded-xl w-32 animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!client) return (
    <div className="page-container">
      <p className="text-gray-500">Clienta no encontrada.</p>
    </div>
  )

  function handleAddNote() {
    if (!noteText.trim()) return
    addNote({ clientId: id, content: noteText, createdBy: user.id }, {
      onSuccess: () => setNoteText(''),
    })
  }

  return (
    <div className="page-container max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <button
          onClick={() => navigate('/app/clients')}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 mt-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          {/* Profile header */}
          <Card className="mb-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xl font-bold">
                  {client.full_name[0]}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">{client.full_name}</h1>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {client.phone && (
                        <a href={`tel:${client.phone}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600">
                          <Phone className="w-3.5 h-3.5" />
                          {client.phone}
                        </a>
                      )}
                      {client.email && (
                        <a href={`mailto:${client.email}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600">
                          <Mail className="w-3.5 h-3.5" />
                          {client.email}
                        </a>
                      )}
                      {client.instagram_handle && (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Instagram className="w-3.5 h-3.5" />
                          {client.instagram_handle}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {[
                    { label: 'Visitas', value: client.total_visits },
                    { label: 'Total gastado', value: <MoneyDisplay amount={client.total_spent} /> },
                    { label: 'Ausentes', value: client.no_show_count },
                    { label: 'Cancelaciones', value: client.cancellation_count },
                  ].map(stat => (
                    <div key={stat.label} className="text-center p-2 bg-gray-50 rounded-xl">
                      <p className="text-base font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags */}
            {client.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100">
                {client.tags.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Tabs */}
          <Tabs.Root defaultValue="resumen">
            <Tabs.List className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
              {tabsList.map(tab => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 text-sm font-medium py-1.5 rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 hover:text-gray-700"
                >
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {/* Resumen */}
            <Tabs.Content value="resumen">
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Info personal</p>
                  <div className="space-y-2 text-sm">
                    {client.birthday && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cumpleaños</span>
                        <span className="font-medium">{formatDate(client.birthday, "d 'de' MMMM")}</span>
                      </div>
                    )}
                    {client.last_visit_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Última visita</span>
                        <span className="font-medium">{formatDate(client.last_visit_at)}</span>
                      </div>
                    )}
                    {client.preferred_staff && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Profesional preferida</span>
                        <span className="font-medium">{client.preferred_staff.display_name}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {(client.allergies || client.contraindications || client.skin_type) && (
                  <Card>
                    <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Salud / Piel</p>
                    <div className="space-y-2 text-sm">
                      {client.skin_type && (
                        <div>
                          <span className="text-gray-500">Tipo de piel: </span>
                          <span className="font-medium">{client.skin_type}</span>
                        </div>
                      )}
                      {client.allergies && (
                        <div>
                          <span className="text-gray-500">Alergias: </span>
                          <span className="font-medium text-orange-700">{client.allergies}</span>
                        </div>
                      )}
                      {client.contraindications && (
                        <div>
                          <span className="text-gray-500">Contraindicaciones: </span>
                          <span className="font-medium text-red-700">{client.contraindications}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {client.notes && (
                  <Card className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Notas</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{client.notes}</p>
                  </Card>
                )}
              </div>
            </Tabs.Content>

            {/* Turnos */}
            <Tabs.Content value="turnos">
              <div className="space-y-2">
                {appointments.length === 0 ? (
                  <EmptyState icon={Calendar} title="Sin turnos" description="Esta clienta no tiene turnos registrados." />
                ) : appointments.map(appt => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-brand-200 cursor-pointer transition-all"
                    onClick={() => navigate(`/app/agenda/${appt.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{formatDate(appt.starts_at)}</p>
                      <p className="text-xs text-gray-400">{appt.services?.map(s => s.service?.name).join(', ')}</p>
                    </div>
                    <div className="ml-auto">
                      <AppointmentStatusBadge status={appt.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Tabs.Content>

            {/* Compras */}
            <Tabs.Content value="compras">
              <div className="space-y-2">
                {sales.length === 0 ? (
                  <EmptyState icon={ShoppingBag} title="Sin compras" description="Esta clienta no tiene compras registradas." />
                ) : sales.map(sale => (
                  <div key={sale.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{formatDate(sale.sold_at)}</p>
                      <p className="text-xs text-gray-400">
                        {sale.items?.map(i => i.description).join(', ')}
                      </p>
                    </div>
                    <MoneyDisplay amount={sale.total} />
                  </div>
                ))}
              </div>
            </Tabs.Content>

            {/* Notas */}
            <Tabs.Content value="notas">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Agregar nota..."
                    className="input-base flex-1"
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddNote()}
                  />
                  <Button size="sm" onClick={handleAddNote} loading={addingNote}>
                    Agregar
                  </Button>
                </div>
                {notes.map(note => (
                  <Card key={note.id}>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{note.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {note.author?.full_name} · {formatDateTime(note.created_at)}
                    </p>
                  </Card>
                ))}
              </div>
            </Tabs.Content>

            {/* Fotos */}
            <Tabs.Content value="fotos">
              {photos.length === 0 ? (
                <EmptyState icon={Camera} title="Sin fotos" description="No hay fotos de antes/después para esta clienta." />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map(photo => (
                    <div key={photo.id} className="relative rounded-xl overflow-hidden aspect-square bg-gray-100">
                      <img
                        src={photo.image_url}
                        alt={photo.photo_type}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge color={photo.photo_type === 'before' ? 'blue' : 'green'}>
                          {photo.photo_type === 'before' ? 'Antes' : 'Después'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Tabs.Content>
          </Tabs.Root>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title="Editar clienta">
        <ClientForm
          client={client}
          onSuccess={() => setEditOpen(false)}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </div>
  )
}
