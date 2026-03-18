import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { startOfDay, endOfDay, format } from '@/lib/formatters/dates'
import toast from 'react-hot-toast'

const QUERY_KEY = 'appointments'

// ── Fetch helpers ─────────────────────────────────────────────

async function fetchAppointments({ orgId, branchId, dateFrom, dateTo, staffId, status }) {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      client:client_profiles(id, full_name, phone, email),
      staff:staff_profiles!primary_staff_id(id, display_name, color),
      resource:resources(id, name, type),
      services:appointment_services(
        *,
        service:services(id, name, duration_minutes, price),
        staff:staff_profiles!assigned_staff_id(id, display_name)
      )
    `)
    .eq('organization_id', orgId)
    .order('starts_at', { ascending: true })

  if (branchId) query = query.eq('branch_id', branchId)
  if (dateFrom) query = query.gte('starts_at', dateFrom.toISOString())
  if (dateTo)   query = query.lte('starts_at', dateTo.toISOString())
  if (staffId)  query = query.eq('primary_staff_id', staffId)
  if (status)   query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data
}

async function createAppointmentFn(payload) {
  const { services, ...appointmentData } = payload

  // Insertar turno
  const { data: appt, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single()

  if (error) throw error

  // Insertar servicios del turno
  if (services?.length) {
    const { error: svcError } = await supabase
      .from('appointment_services')
      .insert(
        services.map((svc, idx) => ({
          ...svc,
          appointment_id: appt.id,
          sort_order: idx,
        }))
      )
    if (svcError) throw svcError
  }

  // Insertar historial de estado
  await supabase.from('appointment_status_history').insert({
    appointment_id: appt.id,
    to_status: appt.status,
    changed_by: appointmentData.created_by,
  })

  return appt
}

async function updateAppointmentStatusFn({ id, status, reason, changedBy }) {
  const { data: appt, error } = await supabase
    .from('appointments')
    .update({
      status,
      ...(status === 'confirmed'   && { confirmed_at: new Date().toISOString() }),
      ...(status === 'checked_in'  && { checked_in_at: new Date().toISOString() }),
      ...(status === 'in_service'  && { started_at: new Date().toISOString() }),
      ...(status === 'completed'   && { completed_at: new Date().toISOString() }),
      ...(status.startsWith('cancel') && { cancelled_at: new Date().toISOString(), cancellation_reason: reason }),
      ...(status === 'no_show'     && { cancelled_at: new Date().toISOString() }),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  await supabase.from('appointment_status_history').insert({
    appointment_id: id,
    to_status: status,
    changed_by: changedBy,
    reason,
  })

  return appt
}

// ── Hooks ─────────────────────────────────────────────────────

export function useAppointments({ dateFrom, dateTo, staffId, status } = {}) {
  const { currentOrg, currentBranch } = useOrgContext()

  return useQuery({
    queryKey: [QUERY_KEY, currentOrg?.id, currentBranch?.id, dateFrom, dateTo, staffId, status],
    queryFn: () => fetchAppointments({
      orgId:    currentOrg.id,
      branchId: currentBranch?.id,
      dateFrom,
      dateTo,
      staffId,
      status,
    }),
    enabled: !!currentOrg?.id,
  })
}

export function useTodayAppointments() {
  const today = new Date()
  return useAppointments({
    dateFrom: startOfDay(today),
    dateTo:   endOfDay(today),
  })
}

export function useAppointment(id) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:client_profiles(*),
          staff:staff_profiles!primary_staff_id(id, display_name, color, bio),
          resource:resources(id, name, type),
          services:appointment_services(
            *,
            service:services(id, name, duration_minutes, price, description),
            staff:staff_profiles!assigned_staff_id(id, display_name)
          ),
          status_history:appointment_status_history(*, changed_by_profile:profiles!changed_by(full_name))
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  const { currentOrg, currentBranch } = useOrgContext()

  return useMutation({
    mutationFn: (payload) => createAppointmentFn({
      ...payload,
      organization_id: currentOrg.id,
      branch_id: payload.branch_id || currentBranch?.id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Turno creado correctamente')
    },
    onError: (err) => {
      toast.error('Error al crear el turno: ' + err.message)
    },
  })
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: updateAppointmentStatusFn,
    onSuccess: (appt) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', appt.id] })
    },
    onError: (err) => {
      toast.error('Error al actualizar el estado: ' + err.message)
    },
  })
}

export function useUpdateAppointment() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: appt, error } = await supabase
        .from('appointments')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return appt
    },
    onSuccess: (appt) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', appt.id] })
      toast.success('Turno actualizado')
    },
    onError: (err) => {
      toast.error('Error: ' + err.message)
    },
  })
}
