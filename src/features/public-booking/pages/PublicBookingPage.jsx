import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { supabase } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/Input'
import { formatMoney } from '@/lib/formatters/money'
import { formatDuration } from '@/lib/formatters/dates'
import {
  Calendar, Clock, ChevronRight, ChevronLeft, User, Scissors,
  Check, MapPin, Sparkles, AlertCircle, ExternalLink, Download, X,
} from 'lucide-react'
import {
  addDays, addHours, format, startOfToday, addMinutes, setHours, setMinutes,
  isBefore, parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const STEPS = ['service', 'staff', 'datetime', 'client', 'confirm']
const STEP_LABELS = ['Servicio', 'Profesional', 'Fecha', 'Datos', 'Confirmar']
const DAY_ENUM = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function PublicBookingPage() {
  const { orgSlug, branchSlug } = useParams()
  const navigate = useNavigate()

  const [step, setStep] = useState('service')
  const [selected, setSelected] = useState({ service: null, staff: null, date: null, slot: null })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Recuperar turno guardado en localStorage
  const lsKey = `booking_token_${orgSlug}_${branchSlug || 'default'}`
  const savedBooking = (() => {
    try {
      const raw = localStorage.getItem(lsKey)
      if (!raw) return null
      const data = JSON.parse(raw)
      // Descartar si el turno ya pasó
      if (data.startsAt && new Date(data.startsAt) < new Date()) {
        localStorage.removeItem(lsKey)
        return null
      }
      return data
    } catch { return null }
  })()

  // Validar que el turno guardado no esté cancelado en la DB
  const { data: savedApptStatus } = useQuery({
    queryKey: ['saved_booking_status', savedBooking?.token],
    enabled: !!savedBooking?.token,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('appointments')
        .select('status')
        .eq('online_token', savedBooking.token)
        .single()
      if (!data) return null
      const cancelled = ['cancelled_by_client', 'cancelled_by_staff', 'no_show'].includes(data.status)
      if (cancelled) localStorage.removeItem(lsKey)
      return data
    },
  })

  // Ocultar banner si el turno fue cancelado
  const showSavedBanner = savedBooking &&
    savedApptStatus !== undefined &&
    !['cancelled_by_client', 'cancelled_by_staff', 'no_show'].includes(savedApptStatus?.status)

  // Fetch org + branch (incluye configuración de reservas)
  const { data: orgData, isLoading: loadingOrg } = useQuery({
    queryKey: ['public_org', orgSlug, branchSlug],
    queryFn: async () => {
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name, primary_color, logo_url, banner_url, min_booking_notice_hours, booking_advance_days, cancellation_policy_hours')
        .eq('slug', orgSlug)
        .single()
      if (orgErr) throw orgErr

      let branch = null
      if (branchSlug) {
        const { data: b, error: bErr } = await supabase
          .from('branches')
          .select('id, name, address')
          .eq('organization_id', org.id)
          .eq('slug', branchSlug)
          .eq('online_booking_enabled', true)
          .single()
        if (bErr) throw bErr
        branch = b
      } else {
        const { data: b } = await supabase
          .from('branches')
          .select('id, name, address')
          .eq('organization_id', org.id)
          .eq('online_booking_enabled', true)
          .order('name')
          .limit(1)
          .single()
        branch = b
      }
      return { org, branch }
    },
  })

  // Fetch services (activos y con reserva online habilitada)
  const { data: services = [] } = useQuery({
    queryKey: ['public_services', orgData?.org?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*, category:service_categories(name)')
        .eq('organization_id', orgData.org.id)
        .eq('active', true)
        .eq('online_booking_enabled', true)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!orgData?.org?.id,
  })

  // Fetch staff para el servicio seleccionado
  const { data: staffList = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['public_staff', orgData?.branch?.id, selected.service?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_services')
        .select('staff:staff_profiles(id, display_name, color, specialty, active, show_in_booking)')
        .eq('service_id', selected.service.id)
      if (error) throw error

      const filtered = data
        ?.map(d => d.staff)
        .filter(s => s?.active && s?.show_in_booking) || []

      if (orgData.branch?.id) {
        const { data: assignments } = await supabase
          .from('staff_branch_assignments')
          .select('staff_id')
          .eq('branch_id', orgData.branch.id)
        const branchIds = new Set(assignments?.map(a => a.staff_id) || [])
        return filtered.filter(s => branchIds.has(s.id))
      }
      return filtered
    },
    enabled: !!selected.service?.id && !!orgData?.org?.id,
  })

  // Días de la semana en que trabaja el profesional seleccionado
  const { data: staffWorkDays } = useQuery({
    queryKey: ['public_staff_days', selected.staff?.id, orgData?.branch?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_schedules')
        .select('day_of_week')
        .eq('staff_id', selected.staff.id)
        .eq('branch_id', orgData.branch.id)
        .eq('active', true)
      return new Set(data?.map(s => s.day_of_week) || [])
    },
    enabled: !!selected.staff?.id && !!orgData?.branch?.id,
  })

  // Turnos disponibles para la fecha y profesional seleccionados
  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['public_slots', selected.staff?.id, selected.date, selected.service?.id],
    queryFn: async () => {
      if (!selected.date || !selected.staff?.id || !selected.service) return []
      const dateStr = format(selected.date, 'yyyy-MM-dd')
      const dayOfWeek = DAY_ENUM[selected.date.getDay()]

      const { data: schedule } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', selected.staff.id)
        .eq('branch_id', orgData.branch.id)
        .eq('day_of_week', dayOfWeek)
        .eq('active', true)
        .maybeSingle()
      if (!schedule) return []

      const { data: existing = [] } = await supabase
        .from('appointments')
        .select('starts_at, ends_at')
        .eq('primary_staff_id', selected.staff.id)
        .gte('starts_at', `${dateStr}T00:00:00`)
        .lte('starts_at', `${dateStr}T23:59:59`)
        .not('status', 'in', '("cancelled_by_client","cancelled_by_staff","no_show")')

      const slotDuration = selected.service.duration_minutes || 60
      const bufferBefore = selected.service.buffer_before_minutes || 0
      const bufferAfter = selected.service.buffer_after_minutes || 0
      const minNoticeHours = orgData?.org?.min_booking_notice_hours ?? 2
      const minDeadline = addHours(new Date(), minNoticeHours)

      const result = []

      const ranges = [{ start: schedule.start_time, end: schedule.end_time }]
      if (schedule.start_time_2 && schedule.end_time_2) {
        ranges.push({ start: schedule.start_time_2, end: schedule.end_time_2 })
      }

      for (const range of ranges) {
        const [startH, startM] = range.start.split(':').map(Number)
        const [endH, endM] = range.end.split(':').map(Number)
        let current = setMinutes(setHours(selected.date, startH), startM)
        const endTime = setMinutes(setHours(selected.date, endH), endM)

        while (
          isBefore(addMinutes(current, slotDuration), endTime) ||
          addMinutes(current, slotDuration).getTime() === endTime.getTime()
        ) {
          const slotEnd = addMinutes(current, slotDuration)
          // Ventana efectiva considerando buffers del servicio
          const effectiveStart = addMinutes(current, -bufferBefore)
          const effectiveEnd = addMinutes(slotEnd, bufferAfter)

          const hasConflict = existing.some(appt => {
            const s = parseISO(appt.starts_at)
            const e = parseISO(appt.ends_at)
            return effectiveStart < e && effectiveEnd > s
          })

          // Respetar antelación mínima configurada por el centro
          if (!isBefore(current, minDeadline) && !hasConflict) {
            result.push({ time: format(current, 'HH:mm'), datetime: current })
          }
          current = addMinutes(current, 30)
        }
      }
      return result
    },
    enabled: !!selected.date && !!selected.staff?.id && !!selected.service,
  })

  const { register, handleSubmit, formState: { errors } } = useForm()

  async function onConfirm(clientData) {
    if (!orgData?.branch || !selected.service || !selected.staff || !selected.slot) return
    setIsSubmitting(true)
    try {
      const startsAt = selected.slot.datetime
      const endsAt = addMinutes(startsAt, selected.service.duration_minutes)

      // Buscar o crear cliente
      let clientId = null
      const { data: existing } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('organization_id', orgData.org.id)
        .eq('phone', clientData.phone)
        .maybeSingle()

      if (existing) {
        clientId = existing.id
      } else {
        const parts = clientData.full_name.trim().split(' ')
        const { data: newClient, error: clientErr } = await supabase
          .from('client_profiles')
          .insert({
            organization_id: orgData.org.id,
            full_name: clientData.full_name,
            first_name: parts[0],
            last_name: parts.slice(1).join(' ') || '',
            phone: clientData.phone,
            email: clientData.email || null,
          })
          .select('id')
          .single()
        if (clientErr) throw clientErr
        clientId = newClient.id
      }

      // Token único para gestión del turno
      const onlineToken = crypto.randomUUID()

      const { data: appt, error: apptErr } = await supabase
        .from('appointments')
        .insert({
          organization_id: orgData.org.id,
          branch_id: orgData.branch.id,
          client_id: clientId,
          primary_staff_id: selected.staff.id,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          status: 'pending',
          source: 'online',
          notes: clientData.notes || null,
          total_price: selected.service.price,
          online_token: onlineToken,
        })
        .select('id')
        .single()
      if (apptErr) throw apptErr

      await supabase.from('appointment_services').insert({
        appointment_id: appt.id,
        service_id: selected.service.id,
        assigned_staff_id: selected.staff.id,
        price: selected.service.price,
        duration_minutes: selected.service.duration_minutes,
      })

      // Guardar token en localStorage para que el cliente pueda volver a gestionar el turno
      try {
        localStorage.setItem(
          `booking_token_${orgSlug}_${branchSlug || 'default'}`,
          JSON.stringify({
            token: onlineToken,
            startsAt: startsAt.toISOString(),
            serviceName: selected.service.name,
            orgName: orgData.org.name,
          })
        )
      } catch { /* ignorar si localStorage no está disponible */ }

      navigate(
        `/book/${orgSlug}/${branchSlug || ''}/confirm`.replace('//', '/'),
        {
          state: {
            appointmentId: appt.id,
            onlineToken,
            orgName: orgData.org.name,
            branchName: orgData.branch.name,
            serviceName: selected.service.name,
            staffName: selected.staff.display_name,
            startsAt: startsAt.toISOString(),
            clientName: clientData.full_name,
            brandColor: orgData.org.primary_color,
            cancellationPolicyHours: orgData.org.cancellation_policy_hours,
          },
        }
      )
    } catch (err) {
      toast.error('Error al confirmar la reserva: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const brandColor = orgData?.org?.primary_color || '#a87030'

  // PWA install
  const { canInstallNative, showIOSInstructions, triggerInstall } = usePWAInstall({
    orgName: orgData?.org?.name,
    orgSlug,
    branchSlug,
    brandColor,
    logoUrl: orgData?.org?.logo_url,
  })
  const [iosBannerDismissed, setIosBannerDismissed] = useState(false)
  const showInstallBanner = canInstallNative || (showIOSInstructions && !iosBannerDismissed)

  const stepIdx = STEPS.indexOf(step)
  const advanceDays = Math.min(orgData?.org?.booking_advance_days || 30, 60)
  const cancellationHours = orgData?.org?.cancellation_policy_hours

  // Agrupar servicios por categoría
  const servicesByCategory = services.reduce((acc, svc) => {
    const cat = svc.category?.name || 'Servicios'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(svc)
    return acc
  }, {})
  const categoryNames = Object.keys(servicesByCategory)

  if (loadingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div
          className="w-9 h-9 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#a87030', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!orgData?.org || !orgData?.branch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-7 h-7 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Portal no disponible</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Este portal de reservas no está disponible.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="px-4 pt-10 pb-16 text-center text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
      >
        {/* Imagen de fondo: banner de la org si existe, sino og-image.png como fallback */}
        {orgData.org.banner_url ? (
          <img
            src={orgData.org.banner_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.35 }}
          />
        ) : (
          <img
            src="/og-image.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.18 }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}

        {/* Overlay de color de marca */}
        <div className="absolute inset-0" style={{ background: `${brandColor}55` }} />

        {/* Círculos decorativos */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 60%, white 0%, transparent 55%), radial-gradient(circle at 85% 15%, white 0%, transparent 45%)',
          }}
        />

        {/* Logo: de la org si existe, sino apple-touch-icon.png, sino ícono genérico */}
        {orgData.org.logo_url ? (
          <img
            src={orgData.org.logo_url}
            alt={orgData.org.name}
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-lg relative z-10"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 shadow-lg relative z-10 overflow-hidden">
            <img
              src="/apple-touch-icon.png"
              alt=""
              className="w-full h-full object-contain p-1"
              onError={e => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3"/><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3"/><path d="M4 12h16"/></svg>'
              }}
            />
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight relative z-10">{orgData.org.name}</h1>
        {orgData.branch.address && (
          <p className="text-sm opacity-75 mt-1 flex items-center justify-center gap-1 relative z-10">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {orgData.branch.address}
          </p>
        )}
      </div>

      {/* Main card */}
      <div className="max-w-lg mx-auto px-4 -mt-8 pb-12 relative z-10">

        {/* Banner turno existente */}
        {showSavedBanner && (
          <div className="mb-3 bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}18` }}>
              <Calendar className="w-4 h-4" style={{ color: brandColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium">Ya tenés un turno reservado</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{savedBooking.serviceName}</p>
              <p className="text-xs text-gray-400">
                {format(parseISO(savedBooking.startsAt), "EEEE d 'de' MMMM · HH:mm'hs'", { locale: es })}
              </p>
            </div>
            <a
              href={`/manage-booking/${savedBooking.token}`}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl text-white shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              Ver turno
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Banner instalar PWA */}
        {showInstallBanner && (
          <div className="mb-3 bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${brandColor}18` }}
              >
                <Download className="w-4 h-4" style={{ color: brandColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">Guardá el portal en tu celular</p>
                {canInstallNative ? (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Instalalo como app para reservar sin abrir el navegador.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tocá <span className="font-semibold">Compartir</span> <span className="text-base">⎋</span> y luego <span className="font-semibold">"Agregar a inicio"</span> para guardarlo como app.
                  </p>
                )}
              </div>
              <button
                onClick={() => setIosBannerDismissed(true)}
                className="p-1 text-gray-300 hover:text-gray-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {canInstallNative && (
              <button
                onClick={triggerInstall}
                className="mt-3 w-full py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: brandColor }}
              >
                Instalar app
              </button>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Indicador de pasos */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-50">
            <div className="flex items-center">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0"
                    style={
                      stepIdx >= i
                        ? { backgroundColor: brandColor, color: 'white' }
                        : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                    }
                  >
                    {stepIdx > i ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-0.5 mx-1 rounded-full transition-all"
                      style={{ backgroundColor: stepIdx > i ? brandColor : '#e5e7eb' }}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">{STEP_LABELS[stepIdx]}</p>
          </div>

          <div className="p-5">

            {/* ── Paso 1: Servicio ── */}
            {step === 'service' && (
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">¿Qué servicio necesitás?</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Seleccioná el servicio que querés reservar</p>
                </div>

                {services.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    No hay servicios disponibles
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto -mx-1 px-1">
                    {categoryNames.map(cat => (
                      <div key={cat}>
                        {categoryNames.length > 1 && (
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
                            {cat}
                          </p>
                        )}
                        <div className="space-y-2">
                          {servicesByCategory[cat].map(svc => (
                            <button
                              key={svc.id}
                              onClick={() => {
                                setSelected({ service: svc, staff: null, date: null, slot: null })
                                setStep('staff')
                              }}
                              className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm bg-gray-50/50 hover:bg-white transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-1.5 h-12 rounded-full shrink-0"
                                  style={{ backgroundColor: brandColor + '50' }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900">{svc.name}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {formatDuration(svc.duration_minutes)}
                                  </p>
                                </div>
                                <div className="text-right shrink-0 flex items-center gap-2">
                                  <p className="font-bold text-gray-900">{formatMoney(svc.price)}</p>
                                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Paso 2: Profesional ── */}
            {step === 'staff' && (
              <div className="space-y-3">
                <div>
                  <button
                    onClick={() => setStep('service')}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-3 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Volver
                  </button>
                  <h2 className="text-lg font-bold text-gray-900">¿Con quién querés atenderte?</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{selected.service?.name}</p>
                </div>

                {loadingStaff ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                ) : staffList.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm rounded-xl bg-gray-50">
                    No hay profesionales disponibles para este servicio
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Sin preferencia */}
                    <button
                      onClick={() => {
                        setSelected(s => ({ ...s, staff: staffList[0] }))
                        setStep('datetime')
                      }}
                      className="w-full text-left p-4 rounded-xl border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-700">Sin preferencia</p>
                          <p className="text-xs text-gray-400">Se asignará una profesional disponible</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </button>

                    {staffList.map(staff => (
                      <button
                        key={staff.id}
                        onClick={() => { setSelected(s => ({ ...s, staff })); setStep('datetime') }}
                        className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm bg-gray-50/50 hover:bg-white transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm"
                            style={{ backgroundColor: staff.color || brandColor }}
                          >
                            {staff.display_name?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">{staff.display_name}</p>
                            {staff.specialty && (
                              <p className="text-xs text-gray-400 truncate mt-0.5">{staff.specialty}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Paso 3: Fecha y hora ── */}
            {step === 'datetime' && (
              <div className="space-y-4">
                <div>
                  <button
                    onClick={() => setStep('staff')}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-3 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Volver
                  </button>
                  <h2 className="text-lg font-bold text-gray-900">Elegí fecha y hora</h2>
                  <p className="text-sm text-gray-400 mt-0.5">con {selected.staff?.display_name}</p>
                </div>

                {/* Tira de fechas — días sin horario aparecen deshabilitados */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                  {Array.from({ length: advanceDays }, (_, i) => addDays(startOfToday(), i)).map(date => {
                    const isSel = selected.date?.toDateString() === date.toDateString()
                    const dayKey = DAY_ENUM[date.getDay()]
                    // Si ya tenemos los días del profesional, deshabilitar los que no trabaja
                    const unavailable = staffWorkDays && !staffWorkDays.has(dayKey)

                    return (
                      <button
                        key={date.toISOString()}
                        disabled={unavailable}
                        onClick={() => setSelected(s => ({ ...s, date, slot: null }))}
                        className="flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all min-w-[54px] text-center disabled:opacity-30 disabled:cursor-not-allowed"
                        style={isSel
                          ? { backgroundColor: brandColor, borderColor: brandColor, color: 'white' }
                          : { borderColor: '#e5e7eb' }
                        }
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                          {format(date, 'EEE', { locale: es })}
                        </span>
                        <span className="text-xl font-bold leading-tight">{format(date, 'd')}</span>
                        <span className="text-[10px] opacity-60 -mt-0.5">
                          {format(date, 'MMM', { locale: es })}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Horarios disponibles */}
                {selected.date && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" style={{ color: brandColor }} />
                      Horarios disponibles
                    </p>
                    {loadingSlots ? (
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="h-10 rounded-xl bg-gray-100 animate-pulse" />
                        ))}
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm rounded-xl bg-gray-50">
                        Sin horarios disponibles para este día
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {slots.map(slot => {
                          const isSel = selected.slot?.time === slot.time
                          return (
                            <button
                              key={slot.time}
                              onClick={() => setSelected(s => ({ ...s, slot }))}
                              className="py-2.5 rounded-xl border text-sm font-semibold transition-all"
                              style={isSel
                                ? { backgroundColor: brandColor, borderColor: brandColor, color: 'white' }
                                : { borderColor: '#e5e7eb', color: '#374151' }
                              }
                            >
                              {slot.time}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {selected.slot && (
                  <button
                    onClick={() => setStep('client')}
                    className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: brandColor }}
                  >
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* ── Paso 4: Datos del cliente ── */}
            {step === 'client' && (
              <div className="space-y-4">
                <div>
                  <button
                    onClick={() => setStep('datetime')}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-3 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Volver
                  </button>
                  <h2 className="text-lg font-bold text-gray-900">Tus datos</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Para confirmar el turno necesitamos tu información</p>
                </div>
                <form onSubmit={handleSubmit(() => setStep('confirm'))} className="space-y-3">
                  <Input
                    label="Nombre completo"
                    required
                    placeholder="Tu nombre y apellido"
                    {...register('full_name', { required: true })}
                    error={errors.full_name && 'Requerido'}
                  />
                  <Input
                    label="Teléfono (WhatsApp)"
                    type="tel"
                    required
                    placeholder="+5491112345678"
                    {...register('phone', { required: true })}
                    error={errors.phone && 'Requerido'}
                  />
                  <Input
                    label="Email (opcional)"
                    type="email"
                    placeholder="tu@email.com"
                    {...register('email')}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Notas (opcional)</label>
                    <textarea
                      className="input-base"
                      rows={2}
                      placeholder="Alguna preferencia o aclaración..."
                      {...register('notes')}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: brandColor }}
                  >
                    Ver resumen <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* ── Paso 5: Confirmación ── */}
            {step === 'confirm' && (
              <form onSubmit={handleSubmit(onConfirm)} className="space-y-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setStep('client')}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-3 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Volver
                  </button>
                  <h2 className="text-lg font-bold text-gray-900">Resumen de tu reserva</h2>
                </div>

                <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {[
                    {
                      icon: Scissors,
                      label: 'Servicio',
                      primary: selected.service?.name,
                      secondary: formatDuration(selected.service?.duration_minutes),
                    },
                    {
                      icon: User,
                      label: 'Profesional',
                      primary: selected.staff?.display_name,
                    },
                    {
                      icon: Calendar,
                      label: 'Fecha y hora',
                      primary: selected.date
                        ? format(selected.date, "EEEE d 'de' MMMM", { locale: es })
                        : '',
                      secondary: `${selected.slot?.time} hs`,
                    },
                  ].map(({ icon: Icon, label, primary, secondary }) => (
                    <div key={label} className="p-4 flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: brandColor + '18' }}
                      >
                        <Icon className="w-4 h-4" style={{ color: brandColor }} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                        <p className="font-semibold text-gray-900 mt-0.5 capitalize">{primary}</p>
                        {secondary && <p className="text-sm text-gray-500">{secondary}</p>}
                      </div>
                    </div>
                  ))}
                  <div className="p-4 flex items-center justify-between bg-gray-50/80">
                    <p className="text-sm font-medium text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-900">{formatMoney(selected.service?.price)}</p>
                  </div>
                </div>

                {/* Política de cancelación */}
                {cancellationHours > 0 && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Podés cancelar hasta <strong>{cancellationHours} horas</strong> antes del turno sin costo.
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
                  style={{ backgroundColor: brandColor }}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Check className="w-4 h-4" /> Confirmar reserva</>
                  )}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Al confirmar, aceptás recibir un recordatorio por WhatsApp.
                </p>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
