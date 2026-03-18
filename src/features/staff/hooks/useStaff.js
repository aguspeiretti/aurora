import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import toast from 'react-hot-toast'

const QUERY_KEY = 'staff'

export function useStaff({ branchId, active = true } = {}) {
  const { currentOrg, currentBranch } = useOrgContext()
  // null = sin filtro de sucursal; undefined = usar sucursal actual
  const effectiveBranchId = branchId !== undefined ? branchId : currentBranch?.id

  return useQuery({
    queryKey: [QUERY_KEY, currentOrg?.id, effectiveBranchId, active],
    queryFn: async () => {
      let query = supabase
        .from('staff_profiles')
        .select(`
          *,
          profile:profiles(id, email, avatar_url),
          branches:staff_branch_assignments(branch:branches(id, name)),
          services:staff_services(service:services(id, name))
        `)
        .eq('organization_id', currentOrg.id)
        .order('sort_order')

      if (active !== undefined) query = query.eq('active', active)

      if (effectiveBranchId) {
        const { data: assignments } = await supabase
          .from('staff_branch_assignments')
          .select('staff_id')
          .eq('branch_id', effectiveBranchId)
        const staffIds = assignments?.map(a => a.staff_id) || []
        if (staffIds.length === 0) return []
        query = query.in('id', staffIds)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrg?.id,
  })
}

export function useStaffSchedule(staffId) {
  const { currentBranch } = useOrgContext()

  return useQuery({
    queryKey: [QUERY_KEY, 'schedule', staffId, currentBranch?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', staffId)
        .eq('branch_id', currentBranch.id)
        .eq('active', true)
        .order('day_of_week')
      if (error) throw error
      return data || []
    },
    enabled: !!staffId && !!currentBranch?.id,
  })
}

export function useCreateStaff() {
  const qc = useQueryClient()
  const { currentOrg, currentBranch } = useOrgContext()

  return useMutation({
    mutationFn: async (data) => {
      const { data: staff, error } = await supabase
        .from('staff_profiles')
        .insert({ ...data, organization_id: currentOrg.id })
        .select()
        .single()
      if (error) throw error

      if (currentBranch?.id) {
        const { error: assignErr } = await supabase
          .from('staff_branch_assignments')
          .insert({ staff_id: staff.id, branch_id: currentBranch.id, is_primary: true })
        if (assignErr) throw assignErr
      }

      return staff
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Profesional creada')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}

export function useUpdateStaff() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: staff, error } = await supabase
        .from('staff_profiles')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return staff
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Profesional actualizada')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}

export function useStaffBranchAssignments(staffId) {
  return useQuery({
    queryKey: [QUERY_KEY, 'branches', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_branch_assignments')
        .select('branch_id')
        .eq('staff_id', staffId)
      if (error) throw error
      return (data || []).map(r => r.branch_id)
    },
    enabled: !!staffId,
  })
}

export function useSaveStaffBranchAssignments(staffId) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (branchIds) => {
      const { error: delErr } = await supabase
        .from('staff_branch_assignments')
        .delete()
        .eq('staff_id', staffId)
      if (delErr) throw delErr

      if (branchIds.length) {
        const { error } = await supabase
          .from('staff_branch_assignments')
          .insert(branchIds.map((branch_id, i) => ({ staff_id: staffId, branch_id, is_primary: i === 0 })))
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
    onError: (err) => toast.error('Error al guardar sucursales: ' + err.message),
  })
}

export function useStaffServices(staffId) {
  const { currentOrg } = useOrgContext()

  return useQuery({
    queryKey: [QUERY_KEY, 'services', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_services')
        .select('service_id')
        .eq('staff_id', staffId)
      if (error) throw error
      return (data || []).map(r => r.service_id)
    },
    enabled: !!staffId && !!currentOrg?.id,
  })
}

export function useSaveStaffServices(staffId) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (serviceIds) => {
      // Delete all current, then insert selected
      const { error: delErr } = await supabase
        .from('staff_services')
        .delete()
        .eq('staff_id', staffId)
      if (delErr) throw delErr

      if (serviceIds.length) {
        const { error } = await supabase
          .from('staff_services')
          .insert(serviceIds.map(service_id => ({ staff_id: staffId, service_id })))
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Servicios guardados')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}

export function useSaveStaffSchedule(staffId) {
  const qc = useQueryClient()
  const { currentBranch } = useOrgContext()

  return useMutation({
    mutationFn: async (days) => {
      // days: [{ day_of_week, active, start_time, end_time, split, start_time_2, end_time_2 }]
      const toUpsert = days
        .filter(d => d.active)
        .map(d => ({
          staff_id: staffId,
          branch_id: currentBranch.id,
          day_of_week: d.day_of_week,
          start_time: d.start_time,
          end_time: d.end_time,
          start_time_2: d.split ? (d.start_time_2 || null) : null,
          end_time_2: d.split ? (d.end_time_2 || null) : null,
          active: true,
        }))

      const toDeactivate = days
        .filter(d => !d.active)
        .map(d => d.day_of_week)

      if (toUpsert.length) {
        const { error } = await supabase
          .from('staff_schedules')
          .upsert(toUpsert, { onConflict: 'staff_id,branch_id,day_of_week' })
        if (error) throw error
      }

      if (toDeactivate.length) {
        const { error } = await supabase
          .from('staff_schedules')
          .update({ active: false })
          .eq('staff_id', staffId)
          .eq('branch_id', currentBranch.id)
          .in('day_of_week', toDeactivate)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'schedule', staffId] })
      toast.success('Horarios guardados')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}
