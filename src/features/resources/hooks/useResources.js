import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import toast from 'react-hot-toast'

const QUERY_KEY = 'resources'

export function useResources() {
  const { currentOrg, currentBranch } = useOrgContext()

  return useQuery({
    queryKey: [QUERY_KEY, currentOrg?.id, currentBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('resources')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('active', true)
        .order('sort_order')

      if (currentBranch?.id) query = query.eq('branch_id', currentBranch.id)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrg?.id,
  })
}

export function useCreateResource() {
  const qc = useQueryClient()
  const { currentOrg, currentBranch } = useOrgContext()

  return useMutation({
    mutationFn: async (data) => {
      const { data: resource, error } = await supabase
        .from('resources')
        .insert({
          ...data,
          organization_id: currentOrg.id,
          branch_id: data.branch_id || currentBranch.id,
        })
        .select()
        .single()
      if (error) throw error
      return resource
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Recurso creado')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}

export function useUpdateResource() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: resource, error } = await supabase
        .from('resources')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return resource
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Recurso actualizado')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}
