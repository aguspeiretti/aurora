import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle, Calendar, Clock, User, MapPin, Scissors, Settings } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function BookingConfirmPage() {
  const { state } = useLocation()
  const { orgSlug, branchSlug } = useParams()
  const navigate = useNavigate()

  const brandColor = state?.brandColor || '#a87030'

  if (!state?.appointmentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-7 h-7 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sin datos de reserva</h1>
          <p className="text-gray-500 mt-2 text-sm">Esta página requiere completar el proceso de reserva.</p>
          <button
            className="mt-5 px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
            style={{ backgroundColor: brandColor }}
            onClick={() => navigate(`/book/${orgSlug}/${branchSlug || ''}`)}
          >
            Hacer una reserva
          </button>
        </div>
      </div>
    )
  }

  const { orgName, branchName, serviceName, staffName, startsAt, clientName, onlineToken, cancellationPolicyHours } = state
  const date = parseISO(startsAt)

  const details = [
    { icon: MapPin, label: 'Lugar', primary: orgName, secondary: branchName },
    {
      icon: Calendar,
      label: 'Fecha',
      primary: format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }),
    },
    { icon: Clock, label: 'Horario', primary: `${format(date, 'HH:mm')} hs` },
    { icon: User, label: 'Servicio y profesional', primary: serviceName, secondary: `con ${staffName}` },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top accent bar */}
      <div className="h-2 w-full" style={{ backgroundColor: brandColor }} />

      <div className="max-w-md mx-auto px-4 py-12">

        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: brandColor + '18' }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: brandColor }} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center">¡Reserva confirmada!</h1>
        <p className="text-gray-500 text-center mt-2 mb-8 text-sm leading-relaxed">
          Hola <span className="font-semibold text-gray-700">{clientName}</span>, tu turno fue registrado.
          <br />Te llegará un recordatorio por WhatsApp.
        </p>

        {/* Details card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 mb-6 overflow-hidden">
          {details.map(({ icon: Icon, label, primary, secondary }) => (
            <div key={label} className="p-4 flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: brandColor + '15' }}
              >
                <Icon className="w-4 h-4" style={{ color: brandColor }} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="font-semibold text-gray-900 capitalize mt-0.5">{primary}</p>
                {secondary && <p className="text-sm text-gray-500">{secondary}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Política de cancelación */}
        {cancellationPolicyHours > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-center mb-5">
            Podés cancelar hasta <strong>{cancellationPolicyHours} horas</strong> antes del turno sin costo.
          </p>
        )}

        {/* Link para gestionar el turno */}
        {onlineToken && (
          <button
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-3 text-white"
            style={{ backgroundColor: brandColor }}
            onClick={() => navigate(`/manage-booking/${onlineToken}`)}
          >
            <Settings className="w-4 h-4" />
            Ver o cancelar mi turno
          </button>
        )}

        <button
          className="w-full py-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => navigate(`/book/${orgSlug}/${branchSlug || ''}`)}
        >
          Hacer otra reserva
        </button>
      </div>
    </div>
  )
}
