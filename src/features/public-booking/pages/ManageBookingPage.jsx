import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Calendar, Clock, User, MapPin, XCircle, CheckCircle, ArrowLeft, Plus, Scissors } from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function ManageBookingPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [cancelOpen, setCancelOpen] = useState(false)

  const { data: appointment, isLoading, error } = useQuery({
    queryKey: ['manage_booking', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, starts_at, ends_at, status, notes,
          organization:organizations(name, primary_color, logo_url, slug),
          branch:branches(name, address, slug),
          staff:staff_profiles(display_name),
          client:client_profiles(first_name, full_name),
          services:appointment_services(service:services(name, duration_minutes))
        `)
        .eq('online_token', token)
        .single()
      if (error) throw error
      return data
    },
  })

  const { mutate: cancelAppointment, isPending: isCancelling } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled_by_client',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'client_request',
        })
        .eq('id', appointment.id)
      if (error) throw error
    },
    onSuccess: () => {
      setCancelOpen(false)
      // Limpiar localStorage
      if (appointment?.organization?.slug && appointment?.branch?.slug) {
        localStorage.removeItem(
          `booking_token_${appointment.organization.slug}_${appointment.branch.slug}`
        )
        // Redirigir al portal para liberar el slot visualmente
        toast.success('Turno cancelado')
        navigate(`/book/${appointment.organization.slug}/${appointment.branch.slug}`)
      } else {
        toast.success('Turno cancelado')
        queryClient.invalidateQueries(['manage_booking', token])
      }
    },
    onError: err => toast.error('Error: ' + err.message),
  })

  const brandColor = appointment?.organization?.primary_color || '#a87030'
  const bookingUrl = appointment?.organization?.slug && appointment?.branch?.slug
    ? `/book/${appointment.organization.slug}/${appointment.branch.slug}`
    : null

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#a87030', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────
  if (error || !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Turno no encontrado</h1>
          <p className="text-gray-500 mt-2 text-sm">El enlace puede haber expirado o ser inválido.</p>
        </div>
      </div>
    )
  }

  const date = parseISO(appointment.starts_at)
  const isCancelled = ['cancelled_by_client', 'cancelled_by_staff', 'no_show'].includes(appointment.status)
  const isCompleted = appointment.status === 'completed'
  const isPastAppointment = isPast(date)
  const canCancel = !isCancelled && !isCompleted && !isPastAppointment

  const statusConfig = isCancelled
    ? { bg: 'bg-red-50 border-red-100', icon: <XCircle className="w-5 h-5 text-red-500 shrink-0" />, title: 'Turno cancelado', body: 'Este turno fue cancelado.' }
    : isCompleted
    ? { bg: 'bg-green-50 border-green-100', icon: <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />, title: 'Turno completado', body: '¡Gracias por tu visita!' }
    : { bg: 'bg-blue-50 border-blue-100', icon: <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />, title: 'Turno confirmado', body: 'Tu reserva está activa.' }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div
        className="px-4 pt-8 pb-14 text-center text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
      >
        {/* Imagen de fondo */}
        <img
          src="/og-image.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.18 }}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <div className="absolute inset-0" style={{ background: `${brandColor}55` }} />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 60%, white 0%, transparent 55%), radial-gradient(circle at 85% 15%, white 0%, transparent 45%)',
          }}
        />

        {/* Botón volver */}
        {bookingUrl && (
          <button
            onClick={() => navigate(bookingUrl)}
            className="absolute top-4 left-4 z-10 flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        )}

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center">
          {appointment.organization?.logo_url ? (
            <img
              src={appointment.organization.logo_url}
              alt={appointment.organization.name}
              className="w-14 h-14 rounded-2xl object-cover mb-2 shadow-lg"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 shadow-lg overflow-hidden">
              <img
                src="/apple-touch-icon.png"
                alt=""
                className="w-full h-full object-contain p-1"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight">{appointment.organization?.name}</h1>
          {appointment.branch?.name && (
            <p className="text-sm opacity-75 mt-0.5">{appointment.branch.name}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 -mt-6 pb-12 relative z-10">

        {/* Status banner */}
        <div className={`mb-4 p-4 rounded-2xl border flex items-center gap-3 bg-white shadow-sm ${statusConfig.bg}`}>
          {statusConfig.icon}
          <div>
            <p className="font-semibold text-gray-900 text-sm">{statusConfig.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{statusConfig.body}</p>
          </div>
        </div>

        {/* Cliente */}
        {appointment.client?.full_name && (
          <p className="text-sm text-gray-500 mb-3 px-1">
            Hola <span className="font-semibold text-gray-700">{appointment.client.first_name || appointment.client.full_name}</span> 👋
          </p>
        )}

        {/* Detalle del turno */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 mb-4 shadow-sm">
          <div className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}15` }}>
              <Calendar className="w-4 h-4" style={{ color: brandColor }} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Fecha y hora</p>
              <p className="font-semibold text-gray-900 capitalize text-sm">
                {format(date, "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-xs text-gray-500">{format(date, 'HH:mm')} hs</p>
            </div>
          </div>

          {appointment.services?.map(({ service }, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}15` }}>
                <Scissors className="w-4 h-4" style={{ color: brandColor }} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Servicio</p>
                <p className="font-semibold text-gray-900 text-sm">{service?.name}</p>
                {service?.duration_minutes && (
                  <p className="text-xs text-gray-500">{service.duration_minutes} min</p>
                )}
              </div>
            </div>
          ))}

          <div className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}15` }}>
              <User className="w-4 h-4" style={{ color: brandColor }} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Profesional</p>
              <p className="font-semibold text-gray-900 text-sm">{appointment.staff?.display_name}</p>
            </div>
          </div>

          {appointment.branch?.address && (
            <div className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}15` }}>
                <MapPin className="w-4 h-4" style={{ color: brandColor }} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Dirección</p>
                <p className="font-semibold text-gray-900 text-sm">{appointment.branch.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          {canCancel && (
            <button
              onClick={() => setCancelOpen(true)}
              className="w-full py-3 rounded-xl font-semibold text-sm border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Cancelar mi turno
            </button>
          )}

          {bookingUrl && (
            <button
              onClick={() => navigate(bookingUrl)}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ backgroundColor: brandColor }}
            >
              <Plus className="w-4 h-4" />
              Reservar otro turno
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar turno"
        description="¿Confirmás la cancelación de tu turno? Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar"
        variant="danger"
        loading={isCancelling}
        onConfirm={cancelAppointment}
      />
    </div>
  )
}
