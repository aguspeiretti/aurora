import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Check, X, UserCheck, Play, Clock,
  Phone, Mail, MessageSquare, MoreVertical, ChevronRight, Package, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppointment, useUpdateAppointmentStatus } from '../hooks/useAppointments'
import { useAuthContext } from '@/app/providers/AuthProvider'
import { AppointmentStatusBadge, PackageStatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime, formatDate, formatDuration, formatTime } from '@/lib/formatters/dates'
import { ALLOWED_TRANSITIONS, APPOINTMENT_STATUS_LABELS } from '@/lib/constants/appointmentStatus'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

const actionButtons = {
  confirmed:           { label: 'Confirmar',         icon: Check,      variant: 'success',    status: 'confirmed'    },
  checked_in:          { label: 'Llegó',              icon: UserCheck,  variant: 'primary',    status: 'checked_in'   },
  in_service:          { label: 'Iniciar servicio',   icon: Play,       variant: 'primary',    status: 'in_service'   },
  completed:           { label: 'Completar',          icon: Check,      variant: 'success',    status: 'completed'    },
  cancelled_by_staff:  { label: 'Cancelar',           icon: X,          variant: 'danger',     status: 'cancelled_by_staff' },
  no_show:             { label: 'No se presentó',     icon: Clock,      variant: 'danger',     status: 'no_show'      },
}

export function AppointmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const { data: appt, isLoading } = useAppointment(id)
  const { mutate: updateStatus, isPending } = useUpdateAppointmentStatus()
  const qc = useQueryClient()

  // Paquetes activos del cliente
  const { data: clientPackages = [] } = useQuery({
    queryKey: ['client_packages', appt?.client?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatment_packages')
        .select('*, service:services(id, name)')
        .eq('client_id', appt.client.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!appt?.client?.id,
  })

  const { mutate: consumeSession, isPending: consuming, variables: consumingPkgId } = useMutation({
    mutationFn: async (pkg) => {
      // Primera sesión disponible
      const { data: nextSessions, error: sErr } = await supabase
        .from('package_sessions')
        .select('id')
        .eq('package_id', pkg.id)
        .eq('status', 'available')
        .order('session_number')
        .limit(1)
      if (sErr) throw sErr
      if (!nextSessions?.length) throw new Error('No hay sesiones disponibles')

      const sessionId = nextSessions[0].id
      const { error: uErr } = await supabase
        .from('package_sessions')
        .update({ status: 'used', appointment_id: id, consumed_at: new Date().toISOString() })
        .eq('id', sessionId)
      if (uErr) throw uErr

      const newUsed = pkg.used_sessions + 1
      const { error: pErr } = await supabase
        .from('treatment_packages')
        .update({
          used_sessions: newUsed,
          ...(newUsed >= pkg.total_sessions ? { status: 'completed' } : {}),
        })
        .eq('id', pkg.id)
      if (pErr) throw pErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client_packages', appt?.client?.id] })
      qc.invalidateQueries({ queryKey: ['treatment_packages'] })
      toast.success('Sesión del paquete registrada')
    },
    onError: err => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="page-container max-w-2xl space-y-4">
        <div className="h-8 bg-gray-200 rounded-xl w-32 animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!appt) {
    return (
      <div className="page-container max-w-2xl">
        <p className="text-gray-500">Turno no encontrado.</p>
      </div>
    )
  }

  const allowedTransitions = ALLOWED_TRANSITIONS[appt.status] || []

  function handleStatusChange(newStatus) {
    updateStatus({
      id: appt.id,
      status: newStatus,
      changedBy: user.id,
    }, {
      onSuccess: () => toast.success(`Estado actualizado a: ${APPOINTMENT_STATUS_LABELS[newStatus]}`),
    })
  }

  return (
    <div className="page-container max-w-2xl">
      {/* Back */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/app/agenda')}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Detalle del turno</h1>
          <p className="text-xs text-gray-500">{formatDateTime(appt.starts_at)}</p>
        </div>
      </div>

      {/* Status + actions */}
      <div className="flex items-center justify-between mb-5">
        <AppointmentStatusBadge status={appt.status} />
        <div className="flex gap-2">
          {allowedTransitions
            .filter(t => t !== 'cancelled_by_staff' && t !== 'no_show')
            .map(transition => {
              const action = actionButtons[transition]
              if (!action) return null
              return (
                <Button
                  key={transition}
                  variant={action.variant}
                  size="sm"
                  onClick={() => handleStatusChange(transition)}
                  loading={isPending}
                >
                  <action.icon className="w-3.5 h-3.5" />
                  {action.label}
                </Button>
              )
            })}

          {(allowedTransitions.includes('cancelled_by_staff') || allowedTransitions.includes('no_show')) && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setCancelDialogOpen(true)}
            >
              <X className="w-3.5 h-3.5" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Clienta */}
        <Card>
          <CardTitle className="mb-3">Clienta</CardTitle>
          {appt.client ? (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-bold">
                  {appt.client.full_name[0]}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{appt.client.full_name}</p>
                {appt.client.phone && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <a href={`tel:${appt.client.phone}`} className="text-sm text-gray-600">
                      {appt.client.phone}
                    </a>
                  </div>
                )}
                {appt.client.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <a href={`mailto:${appt.client.email}`} className="text-sm text-gray-600">
                      {appt.client.email}
                    </a>
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate(`/app/clients/${appt.client.id}`)}
                className="text-brand-600 hover:text-brand-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Sin clienta asociada</p>
          )}
        </Card>

        {/* Servicios */}
        <Card>
          <CardTitle className="mb-3">Servicios</CardTitle>
          <div className="space-y-3">
            {appt.services?.map((svc, i) => (
              <div key={svc.id} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{svc.service?.name || '—'}</p>
                  <p className="text-xs text-gray-500">
                    {formatDuration(svc.duration_minutes)}
                    {svc.staff?.display_name && ` · ${svc.staff.display_name}`}
                  </p>
                </div>
                <MoneyDisplay amount={svc.price} />
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
            <p className="text-sm font-medium text-gray-600">Total</p>
            <MoneyDisplay amount={appt.total_price} size="lg" />
          </div>
        </Card>

        {/* Profesional / Recurso */}
        <Card>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Profesional</p>
              <div className="flex items-center gap-2">
                {appt.staff?.color && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: appt.staff.color }} />
                )}
                <p className="text-sm font-medium text-gray-900">{appt.staff?.display_name || '—'}</p>
              </div>
            </div>
            {appt.resource && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Recurso</p>
                <p className="text-sm font-medium text-gray-900">{appt.resource.name}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Notas */}
        {(appt.notes || appt.internal_notes) && (
          <Card>
            {appt.notes && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notas</p>
                <p className="text-sm text-gray-700">{appt.notes}</p>
              </div>
            )}
            {appt.internal_notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notas internas</p>
                <p className="text-sm text-gray-700">{appt.internal_notes}</p>
              </div>
            )}
          </Card>
        )}

        {/* Paquetes del cliente */}
        {clientPackages.length > 0 && (
          <Card>
            <CardTitle className="mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-500" />
              Paquetes activos
            </CardTitle>
            <div className="space-y-3">
              {clientPackages.map(pkg => (
                <div key={pkg.id} className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{pkg.name}</p>
                    {pkg.service && <p className="text-xs text-gray-500">{pkg.service.name}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${(pkg.used_sessions / pkg.total_sessions) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">
                        {pkg.used_sessions}/{pkg.total_sessions}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={consuming && consumingPkgId?.id === pkg.id}
                    disabled={consuming}
                    onClick={() => consumeSession(pkg)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Usar sesión
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Historial */}
        {appt.status_history?.length > 0 && (
          <Card>
            <CardTitle className="mb-3">Historial</CardTitle>
            <div className="space-y-2">
              {appt.status_history.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <AppointmentStatusBadge status={h.to_status} />
                    {h.changed_by_profile && (
                      <span className="text-gray-400 text-xs">
                        por {h.changed_by_profile.full_name}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{formatDateTime(h.created_at)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Cancel dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="¿Cancelar el turno?"
        description="Esta acción se registrará en el historial y notificará a la clienta si está configurado."
        confirmLabel="Sí, cancelar"
        onConfirm={() => {
          handleStatusChange('cancelled_by_staff')
          setCancelDialogOpen(false)
        }}
        loading={isPending}
      />
    </div>
  )
}
