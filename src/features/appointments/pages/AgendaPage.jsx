import { useState, useMemo } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, parseISO, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, List, Grid3X3, Calendar } from 'lucide-react'
import { useAppointments } from '../hooks/useAppointments'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { AppointmentStatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import { startOfDay, endOfDay, getDayLabel, formatTime } from '@/lib/formatters/dates'
import { APPOINTMENT_STATUS_COLORS } from '@/lib/constants/appointmentStatus'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { es }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

const statusBgColors = {
  pending:             'bg-yellow-400',
  confirmed:           'bg-blue-500',
  checked_in:          'bg-indigo-500',
  in_service:          'bg-brand-500',
  completed:           'bg-emerald-500',
  cancelled_by_client: 'bg-gray-400',
  cancelled_by_staff:  'bg-gray-400',
  no_show:             'bg-red-500',
  rescheduled:         'bg-orange-400',
}

function AppointmentEvent({ event }) {
  return (
    <div className="h-full px-1 py-0.5 overflow-hidden">
      <p className="text-xs font-semibold leading-tight truncate">{event.title}</p>
      {event.resource?.staffName && (
        <p className="text-[10px] opacity-80 truncate">{event.resource.staffName}</p>
      )}
    </div>
  )
}

export function AgendaPage() {
  const navigate = useNavigate()
  const [view, setView] = useState('day')
  const [calendarView, setCalendarView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [staffFilter, setStaffFilter] = useState('')

  const dateFrom = startOfDay(currentDate)
  const dateTo = view === 'week'
    ? endOfDay(addDays(currentDate, 6))
    : endOfDay(currentDate)

  const { data: appointments = [], isLoading } = useAppointments({
    dateFrom,
    dateTo,
  })
  const { data: staffList = [] } = useStaff()

  const HIDDEN_STATUSES = ['cancelled_by_client', 'cancelled_by_staff']

  const filteredAppointments = useMemo(() => {
    let result = appointments.filter(a => !HIDDEN_STATUSES.includes(a.status))
    if (staffFilter) result = result.filter(a => a.primary_staff_id === staffFilter)
    return result
  }, [appointments, staffFilter])

  const calendarEvents = useMemo(() =>
    filteredAppointments.map(appt => ({
      id: appt.id,
      title: appt.client?.full_name || 'Sin clienta',
      start: parseISO(appt.starts_at),
      end:   parseISO(appt.ends_at),
      resource: {
        status: appt.status,
        staffName: appt.staff?.display_name,
        staffColor: appt.staff?.color,
      },
    })),
    [filteredAppointments]
  )

  function eventStyleGetter(event) {
    const color = event.resource?.staffColor || '#a87030'
    const status = event.resource?.status
    const isActive = ['pending','confirmed','checked_in','in_service'].includes(status)
    return {
      style: {
        backgroundColor: isActive ? color : '#9ca3af',
        border: 'none',
        borderRadius: '8px',
        opacity: isActive ? 1 : 0.6,
        color: '#fff',
        fontSize: '12px',
      },
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-gray-100 bg-white shrink-0 flex-wrap gap-y-2">
        {/* Navegación de fecha */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentDate(d => subDays(d, view === 'week' ? 7 : 1))}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Hoy
          </button>
          <button
            onClick={() => setCurrentDate(d => addDays(d, view === 'week' ? 7 : 1))}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Fecha actual */}
        <h2 className="text-sm font-semibold text-gray-900 flex-1">
          {getDayLabel(currentDate)}
        </h2>

        {/* Filtro de staff */}
        <select
          value={staffFilter}
          onChange={e => setStaffFilter(e.target.value)}
          className="input-base text-sm py-1.5 w-auto min-w-[140px]"
        >
          <option value="">Todas las profesionales</option>
          {staffList.map(s => (
            <option key={s.id} value={s.id}>{s.display_name}</option>
          ))}
        </select>

        {/* Vista */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          <button
            onClick={() => setView('day')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors',
              view === 'day' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'
            )}
          >
            <List className="w-3.5 h-3.5" />
            Día
          </button>
          <button
            onClick={() => setView('week')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors border-l border-gray-200',
              view === 'week' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'
            )}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Semana
          </button>
        </div>

        {/* Nuevo turno */}
        <Button size="sm" onClick={() => navigate('/app/agenda/new')}>
          <Plus className="w-3.5 h-3.5" />
          Nuevo turno
        </Button>
      </div>

      {/* Resumen del día (vista diaria) */}
      {view === 'day' && filteredAppointments.length > 0 && (
        <div className="flex gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 overflow-x-auto shrink-0">
          {['pending','confirmed','checked_in','in_service','completed','no_show'].map(status => {
            const count = filteredAppointments.filter(a => a.status === status).length
            if (!count) return null
            return (
              <AppointmentStatusBadge key={status} status={status}>
                {count}
              </AppointmentStatusBadge>
            )
          })}
        </div>
      )}

      {/* Calendar / List */}
      <div className="flex-1 overflow-hidden p-4">
        {isLoading ? (
          <div className="h-full bg-gray-50 rounded-2xl animate-pulse" />
        ) : view === 'day' ? (
          <DayListView
            appointments={filteredAppointments}
            date={currentDate}
            onAppointmentClick={(id) => navigate(`/app/agenda/${id}`)}
          />
        ) : (
          <div className="h-full rounded-2xl overflow-hidden border border-gray-100">
            <BigCalendar
              localizer={localizer}
              events={calendarEvents}
              view={calendarView}
              onView={setCalendarView}
              date={currentDate}
              onNavigate={setCurrentDate}
              onSelectEvent={(event) => navigate(`/app/agenda/${event.id}`)}
              onSelectSlot={({ start }) => navigate(`/app/agenda/new?date=${start.toISOString()}`)}
              selectable
              components={{ event: AppointmentEvent }}
              eventPropGetter={eventStyleGetter}
              culture="es"
              messages={{
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                agenda: 'Agenda',
                today: 'Hoy',
                previous: 'Anterior',
                next: 'Siguiente',
                noEventsInRange: 'Sin turnos en este período',
              }}
              style={{ height: '100%' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function DayListView({ appointments, date, onAppointmentClick }) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 8) // 8:00 — 20:00

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-brand-400" />
        </div>
        <p className="text-base font-semibold text-gray-900">Sin turnos</p>
        <p className="text-sm text-gray-500 mt-1">No hay turnos programados para este día.</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto space-y-2">
      {appointments.map((appt) => (
        <div
          key={appt.id}
          onClick={() => onAppointmentClick(appt.id)}
          className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-soft cursor-pointer transition-all"
        >
          {/* Indicador de color del staff */}
          <div
            className="w-1 rounded-full shrink-0"
            style={{ backgroundColor: appt.staff?.color || '#a87030' }}
          />

          {/* Tiempo */}
          <div className="min-w-[60px]">
            <p className="text-sm font-bold text-gray-900">{formatTime(appt.starts_at)}</p>
            <p className="text-xs text-gray-400">{formatTime(appt.ends_at)}</p>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {appt.client?.full_name || 'Sin clienta'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {appt.services?.map(s => s.service?.name).join(', ') || 'Sin servicios'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {appt.staff?.display_name || '—'}
            </p>
          </div>

          {/* Status */}
          <div className="shrink-0">
            <AppointmentStatusBadge status={appt.status} />
          </div>
        </div>
      ))}
    </div>
  )
}
