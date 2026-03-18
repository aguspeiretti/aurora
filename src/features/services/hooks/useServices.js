import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import toast from 'react-hot-toast'

const QUERY_KEY = 'services'

export function useServiceCategories() {
  const { currentOrg } = useOrgContext()

  return useQuery({
    queryKey: ['service_categories', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name, slug, type, color, icon, sort_order')
        .eq('organization_id', currentOrg.id)
        .eq('active', true)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrg?.id,
  })
}

export function useServices({ categoryId, active = true } = {}) {
  const { currentOrg } = useOrgContext()

  return useQuery({
    queryKey: [QUERY_KEY, currentOrg?.id, categoryId, active],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select(`
          *,
          category:service_categories(id, name, type, color),
          staff:staff_services(staff:staff_profiles(id, display_name, color))
        `)
        .eq('organization_id', currentOrg.id)
        .order('sort_order')

      if (active !== undefined) query = query.eq('active', active)
      if (categoryId) query = query.eq('category_id', categoryId)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrg?.id,
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  const { currentOrg } = useOrgContext()

  return useMutation({
    mutationFn: async (data) => {
      const { data: svc, error } = await supabase
        .from('services')
        .insert({ ...data, organization_id: currentOrg.id })
        .select()
        .single()
      if (error) throw error
      return svc
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Servicio creado')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: svc, error } = await supabase
        .from('services')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return svc
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Servicio actualizado')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}

export function useDeleteService() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('services')
        .update({ active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Servicio desactivado')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') + '-' + Date.now()
}

export function useCreateCategory() {
  const qc = useQueryClient()
  const { currentOrg } = useOrgContext()

  return useMutation({
    mutationFn: async ({ name, icon, color }) => {
      const { data, error } = await supabase
        .from('service_categories')
        .insert({ name, icon, color, slug: slugify(name), type: 'other', organization_id: currentOrg.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_categories'] })
      toast.success('Categoría creada')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name, icon, color }) => {
      const { data, error } = await supabase
        .from('service_categories')
        .update({ name, icon, color })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_categories'] })
      toast.success('Categoría actualizada')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('service_categories')
        .update({ active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_categories'] })
      toast.success('Categoría eliminada')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}
