import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import toast from 'react-hot-toast'

const QUERY_KEY = 'sales'

export function useSales({ page = 1, pageSize = 30, clientId, dateFrom, dateTo } = {}) {
  const { currentOrg, currentBranch } = useOrgContext()

  return useQuery({
    queryKey: [QUERY_KEY, currentOrg?.id, currentBranch?.id, page, clientId, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select(`
          *,
          client:client_profiles(id, full_name, phone),
          items:sale_items(
            id, item_type, description, quantity, unit_price, line_total,
            service:services(name),
            product:products(name)
          ),
          payments(method, amount, status)
        `, { count: 'exact' })
        .eq('organization_id', currentOrg.id)
        .order('sold_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (currentBranch?.id) query = query.eq('branch_id', currentBranch.id)
      if (clientId) query = query.eq('client_id', clientId)
      if (dateFrom) query = query.gte('sold_at', dateFrom)
      if (dateTo)   query = query.lte('sold_at', dateTo)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data || [], count: count || 0 }
    },
    enabled: !!currentOrg?.id,
  })
}

export function useCreateSale() {
  const qc = useQueryClient()
  const { currentOrg, currentBranch } = useOrgContext()

  return useMutation({
    mutationFn: async ({ items, payments, clientId, appointmentId, notes, soldBy, discountTotal = 0, tipAmount = 0 }) => {
      const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0)
      const total = subtotal - discountTotal + tipAmount

      // Generar número de venta
      const { data: saleNumberData } = await supabase
        .rpc('generate_sale_number', { org_id: currentOrg.id })

      // Crear venta
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          organization_id: currentOrg.id,
          branch_id: currentBranch.id,
          client_id: clientId || null,
          appointment_id: appointmentId || null,
          sale_number: saleNumberData || `VTA-${Date.now()}`,
          subtotal,
          discount_total: discountTotal,
          tip_amount: tipAmount,
          total,
          payment_status: 'paid',
          sold_by: soldBy,
          notes,
        })
        .select()
        .single()
      if (saleError) throw saleError

      // Insertar ítems
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(
          items.map(item => ({
            sale_id: sale.id,
            item_type: item.item_type || 'service',
            service_id: item.service_id || null,
            product_id: item.product_id || null,
            description: item.description,
            quantity: item.quantity || 1,
            unit_price: item.unit_price,
            discount_total: item.discount_total || 0,
            line_total: item.quantity * item.unit_price - (item.discount_total || 0),
            staff_id: item.staff_id || null,
          }))
        )
      if (itemsError) throw itemsError

      // Insertar pagos
      if (payments?.length) {
        const { error: payError } = await supabase
          .from('payments')
          .insert(payments.map(p => ({ ...p, sale_id: sale.id })))
        if (payError) throw payError
      }

      // Descontar stock de productos
      for (const item of items.filter(i => i.product_id)) {
        await supabase.from('inventory_movements').insert({
          organization_id: currentOrg.id,
          branch_id: currentBranch.id,
          product_id: item.product_id,
          type: 'sale',
          quantity: -(item.quantity || 1),
          stock_before: item.current_stock || 0,
          stock_after: (item.current_stock || 0) - (item.quantity || 1),
          reference_type: 'sale',
          reference_id: sale.id,
          created_by: soldBy,
        })
      }

      return sale
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Venta registrada correctamente')
    },
    onError: (err) => toast.error('Error al registrar la venta: ' + err.message),
  })
}

export function useCashSessions() {
  const { currentOrg, currentBranch } = useOrgContext()

  return useQuery({
    queryKey: ['cash_sessions', currentOrg?.id, currentBranch?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*, opened_by_profile:profiles!opened_by(full_name), closed_by_profile:profiles!closed_by(full_name)')
        .eq('organization_id', currentOrg.id)
        .eq('branch_id', currentBranch.id)
        .order('opened_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrg?.id && !!currentBranch?.id,
  })
}

export function useActiveCashSession() {
  const { currentOrg, currentBranch } = useOrgContext()

  return useQuery({
    queryKey: ['cash_sessions', 'active', currentOrg?.id, currentBranch?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('branch_id', currentBranch.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!currentOrg?.id && !!currentBranch?.id,
  })
}
