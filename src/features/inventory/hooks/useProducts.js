import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import toast from 'react-hot-toast'

const QUERY_KEY = 'products'

export function useProducts({ search, categoryId, lowStockOnly = false } = {}) {
  const { currentOrg } = useOrgContext()

  return useQuery({
    queryKey: [QUERY_KEY, currentOrg?.id, search, categoryId, lowStockOnly],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, category:product_categories(id, name)')
        .eq('organization_id', currentOrg.id)
        .eq('active', true)
        .order('name')

      if (search) query = query.ilike('name', `%${search}%`)
      if (categoryId) query = query.eq('category_id', categoryId)

      const { data, error } = await query
      if (error) throw error
      const products = data || []
      if (lowStockOnly) return products.filter(p => p.track_stock && p.stock_qty <= p.min_stock_qty)
      return products
    },
    enabled: !!currentOrg?.id,
  })
}

export function useInventoryMovements(productId) {
  const { currentOrg } = useOrgContext()

  return useQuery({
    queryKey: ['inventory_movements', productId],
    queryFn: async () => {
      let query = supabase
        .from('inventory_movements')
        .select('*, created_by_profile:profiles!created_by(full_name), product:products(name)')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (productId) query = query.eq('product_id', productId)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrg?.id,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  const { currentOrg } = useOrgContext()

  return useMutation({
    mutationFn: async (data) => {
      const { data: product, error } = await supabase
        .from('products')
        .insert({ ...data, organization_id: currentOrg.id })
        .select()
        .single()
      if (error) throw error
      return product
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Producto creado')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}

export function useAdjustStock() {
  const qc = useQueryClient()
  const { currentOrg, currentBranch } = useOrgContext()

  return useMutation({
    mutationFn: async ({ productId, type, quantity, notes, createdBy, currentStock }) => {
      const movement = type === 'purchase' ? quantity : -Math.abs(quantity)
      const stockAfter = currentStock + movement

      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          organization_id: currentOrg.id,
          branch_id: currentBranch.id,
          product_id: productId,
          type,
          quantity: movement,
          stock_before: currentStock,
          stock_after: stockAfter,
          notes,
          created_by: createdBy,
        })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: ['inventory_movements'] })
      toast.success('Stock actualizado')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })
}
