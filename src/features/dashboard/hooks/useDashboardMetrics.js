import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, format
} from '@/lib/formatters/dates'

export function useDashboardMetrics() {
  const { currentOrg, currentBranch } = useOrgContext()
  const now = new Date()

  return useQuery({
    queryKey: ['dashboard_metrics', currentOrg?.id, currentBranch?.id],
    queryFn: async () => {
      const orgId    = currentOrg.id
      const branchId = currentBranch?.id
      const todayStart = startOfDay(now).toISOString()
      const todayEnd   = endOfDay(now).toISOString()
      const monthStart = startOfMonth(now).toISOString()
      const monthEnd   = endOfMonth(now).toISOString()

      // Parallelizar queries
      const [
        todayAppts,
        monthAppts,
        monthSales,
        lowStock,
        expiringPackages,
        recentSales,
      ] = await Promise.all([
        // Turnos hoy
        supabase.from('appointments')
          .select('id, status, starts_at, total_price, client:client_profiles(full_name), staff:staff_profiles!primary_staff_id(display_name)')
          .eq('organization_id', orgId)
          .gte('starts_at', todayStart)
          .lte('starts_at', todayEnd)
          .not('status', 'in', '(cancelled_by_client,cancelled_by_staff)')
          .order('starts_at'),

        // Turnos del mes
        supabase.from('appointments')
          .select('id, status')
          .eq('organization_id', orgId)
          .gte('starts_at', monthStart)
          .lte('starts_at', monthEnd),

        // Ventas del mes
        supabase.from('sales')
          .select('id, total, sold_at, client:client_profiles(full_name)')
          .eq('organization_id', orgId)
          .eq('payment_status', 'paid')
          .gte('sold_at', monthStart)
          .lte('sold_at', monthEnd)
          .order('sold_at', { ascending: false }),

        // Productos bajo stock
        supabase.from('products')
          .select('id, name, stock_qty, min_stock_qty')
          .eq('organization_id', orgId)
          .eq('track_stock', true),

        // Paquetes próximos a vencer (7 días)
        supabase.from('treatment_packages')
          .select('id, name, expires_at, client:client_profiles(full_name), used_sessions, total_sessions')
          .eq('organization_id', orgId)
          .eq('status', 'active')
          .lte('expires_at', format(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
          .limit(5),

        // Ventas recientes
        supabase.from('sales')
          .select('id, total, sold_at, payment_status, client:client_profiles(full_name)')
          .eq('organization_id', orgId)
          .order('sold_at', { ascending: false })
          .limit(10),
      ])

      const todayApptList  = todayAppts.data  || []
      const monthApptList  = monthAppts.data  || []
      const monthSaleList  = monthSales.data  || []
      const lowStockList   = (lowStock.data || []).filter(p => p.stock_qty <= p.min_stock_qty).slice(0, 5)
      const expiringPkgs   = expiringPackages.data || []
      const recentSaleList = recentSales.data || []

      // Calcular métricas
      const totalToday      = todayApptList.length
      const confirmedToday  = todayApptList.filter(a => ['confirmed','checked_in','in_service'].includes(a.status)).length
      const completedToday  = todayApptList.filter(a => a.status === 'completed').length
      const noShowsToday    = todayApptList.filter(a => a.status === 'no_show').length
      const occupancy       = totalToday > 0 ? Math.round((confirmedToday / totalToday) * 100) : 0

      const monthRevenue    = monthSaleList.reduce((sum, s) => sum + parseFloat(s.total || 0), 0)
      const monthSalesCount = monthSaleList.length
      const avgTicket       = monthSalesCount > 0 ? monthRevenue / monthSalesCount : 0

      const completedMonth  = monthApptList.filter(a => a.status === 'completed').length
      const cancelledMonth  = monthApptList.filter(a => a.status.startsWith('cancelled')).length

      return {
        today: {
          total: totalToday,
          confirmed: confirmedToday,
          completed: completedToday,
          noShows: noShowsToday,
          occupancyPct: occupancy,
          appointments: todayApptList,
        },
        month: {
          revenue: monthRevenue,
          salesCount: monthSalesCount,
          avgTicket,
          completedAppointments: completedMonth,
          cancelledAppointments: cancelledMonth,
        },
        alerts: {
          lowStock: lowStockList,
          expiringPackages: expiringPkgs,
        },
        recentSales: recentSaleList,
      }
    },
    enabled: !!currentOrg?.id,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}
