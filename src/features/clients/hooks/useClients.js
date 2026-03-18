import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import toast from 'react-hot-toast'

const QUERY_KEY = 'clients'

export function useClients({ search = '', page = 1, pageSize = 50 } = {}) {
  const { currentOrg } = useOrgContext()
  const normalizedSearch = search.trim()

  return useQuery({
    // pageSize included so that a change in page size correctly invalidates cache
    queryKey: [QUERY_KEY, currentOrg?.id, normalizedSearch, page, pageSize],
    queryFn: async () => {
      // Exact count on plain listing; estimated during search to avoid a
      // heavy COUNT scan on every keystroke. The UI shows result count
      // separately when searching so the estimated value isn't surfaced.
      const countMode = normalizedSearch ? 'estimated' : 'exact'

      let query = supabase
        .from('client_profiles')
        .select(
          'id, full_name, phone, email, total_visits, total_spent, last_visit_at, no_show_count',
          { count: countMode }
        )
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (normalizedSearch) {
        query = query.or(
          `full_name.ilike.%${normalizedSearch}%,phone.ilike.%${normalizedSearch}%,email.ilike.%${normalizedSearch}%`
        )
      }

      const { data, error, count } = await query
      if (error) throw error
      return { data: data || [], count: count || 0 }
    },
    enabled: !!currentOrg?.id,
    placeholderData: (prev) => prev,
  })
}

export function useClientDetail(id) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_profiles')
        .select(`
          *,
          tags:client_tag_relations(tag:client_tags(id, name, color)),
          preferred_staff:staff_profiles!preferred_staff_id(id, display_name),
          preferred_branch:branches!preferred_branch_id(id, name)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useClientAppointments(clientId) {
  return useQuery({
    queryKey: [QUERY_KEY, 'appointments', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          staff:staff_profiles!primary_staff_id(id, display_name),
          services:appointment_services(service:services(name, price))
        `)
        .eq('client_id', clientId)
        .order('starts_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data || []
    },
    enabled: !!clientId,
  })
}

export function useClientSales(clientId) {
  return useQuery({
    queryKey: [QUERY_KEY, 'sales', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('id, sold_at, total, payment_status, items:sale_items(description)')
        .eq('client_id', clientId)
        .order('sold_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data || []
    },
    enabled: !!clientId,
  })
}

export function useClientNotes(clientId) {
  return useQuery({
    queryKey: [QUERY_KEY, 'notes', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_notes')
        .select('*, author:profiles!created_by(full_name, avatar_url)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!clientId,
  })
}

export function useClientPhotos(clientId) {
  return useQuery({
    queryKey: [QUERY_KEY, 'photos', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('before_after_photos')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!clientId,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  const { currentOrg } = useOrgContext()

  return useMutation({
    mutationFn: async (data) => {
      const { data: client, error } = await supabase
        .from('client_profiles')
        .insert({ ...data, organization_id: currentOrg.id })
        .select()
        .single()
      if (error) throw error
      return client
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Clienta creada correctamente')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: client, error } = await supabase
        .from('client_profiles')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return client
    },
    onSuccess: (client) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', client.id] })
      toast.success('Clienta actualizada')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}

export function useAddClientNote() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, content, createdBy }) => {
      const { data, error } = await supabase
        .from('client_notes')
        .insert({ client_id: clientId, content, created_by: createdBy })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'notes', variables.clientId] })
      toast.success('Nota agregada')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}
