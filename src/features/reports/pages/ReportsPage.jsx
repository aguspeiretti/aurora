import { useState } from 'react'
import { BarChart2, Calendar, DollarSign, TrendingUp, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { MetricCard } from '@/components/ui/MetricCard'
import { Card, CardTitle } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { formatMoney } from '@/lib/formatters/money'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns'

export function ReportsPage() {
  const { currentOrg, currentBranch } = useOrgContext()
  const [period, setPeriod] = useState('month')

  const now = new Date()
  const dateFrom = period === 'week'
    ? startOfWeek(now, { weekStartsOn: 1 })
    : startOfMonth(now)
  const dateTo = period === 'week'
    ? endOfWeek(now, { weekStartsOn: 1 })
    : endOfMonth(now)

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['reports', currentOrg?.id, currentBranch?.id, period],
    queryFn: async () => {
      const [salesRes, appointmentsRes, newClientsRes] = await Promise.all([
        // Ventas del período
        supabase.from('sales')
          .select('id, total, sold_at, items:sale_items(item_type, line_total)')
          .eq('organization_id', currentOrg.id)
          .eq('payment_status', 'paid')
          .gte('sold_at', dateFrom.toISOString())
          .lte('sold_at', dateTo.toISOString()),

        // Turnos del período
        supabase.from('appointments')
          .select('id, status')
          .eq('organization_id', currentOrg.id)
          .gte('starts_at', dateFrom.toISOString())
          .lte('starts_at', dateTo.toISOString()),

        // Nuevas clientas
        supabase.from('client_profiles')
          .select('id, full_name, created_at')
          .eq('organization_id', currentOrg.id)
          .gte('created_at', dateFrom.toISOString())
          .lte('created_at', dateTo.toISOString()),
      ])

      const sales = salesRes.data || []
      const appointments = appointmentsRes.data || []
      const newClients = newClientsRes.data || []

      const totalRevenue  = sales.reduce((s, v) => s + parseFloat(v.total), 0)
      const salesCount    = sales.length
      const avgTicket     = salesCount ? totalRevenue / salesCount : 0

      const completed     = appointments.filter(a => a.status === 'completed').length
      const cancelled     = appointments.filter(a => a.status.startsWith('cancelled')).length
      const noShows       = appointments.filter(a => a.status === 'no_show').length
      const totalAppts    = appointments.length

      return {
        totalRevenue,
        salesCount,
        avgTicket,
        appointments: { total: totalAppts, completed, cancelled, noShows },
        newClients: newClients.length,
        topServices: [], // requiere join server-side
        recentSales: sales.slice(0, 10),
      }
    },
    enabled: !!currentOrg?.id,
  })

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {['week', 'month'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium transition-colors
                ${period === p ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {p === 'week' ? 'Esta semana' : 'Este mes'}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ingresos"
          value={isLoading ? '—' : formatMoney(metrics?.totalRevenue || 0)}
          icon={DollarSign}
          iconColor="green"
          loading={isLoading}
        />
        <MetricCard
          title="Ventas"
          value={metrics?.salesCount ?? '—'}
          icon={TrendingUp}
          iconColor="blue"
          loading={isLoading}
        />
        <MetricCard
          title="Ticket promedio"
          value={isLoading ? '—' : formatMoney(metrics?.avgTicket || 0)}
          icon={BarChart2}
          iconColor="brand"
          loading={isLoading}
        />
        <MetricCard
          title="Nuevas clientas"
          value={metrics?.newClients ?? '—'}
          icon={Users}
          iconColor="cyan"
          loading={isLoading}
        />
      </div>

      {/* Turnos */}
      <Card>
        <CardTitle className="mb-4">Resumen de turnos</CardTitle>
        <div className="grid grid-cols-4 gap-4 text-center">
          {[
            { label: 'Total', value: metrics?.appointments?.total, color: 'text-gray-900' },
            { label: 'Completados', value: metrics?.appointments?.completed, color: 'text-emerald-600' },
            { label: 'Cancelados', value: metrics?.appointments?.cancelled, color: 'text-gray-500' },
            { label: 'No se presentaron', value: metrics?.appointments?.noShows, color: 'text-red-600' },
          ].map(item => (
            <div key={item.label} className="p-3 bg-gray-50 rounded-xl">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Ventas recientes */}
      <Card>
        <CardTitle className="mb-4">Ventas del período</CardTitle>
        <DataTable
          data={metrics?.recentSales || []}
          loading={isLoading}
          columns={[
            { key: 'sold_at', header: 'Fecha', render: v => format(new Date(v), 'dd/MM HH:mm') },
            { key: 'total', header: 'Total', render: v => <MoneyDisplay amount={v} /> },
          ]}
          emptyTitle="Sin ventas en este período"
        />
      </Card>
    </div>
  )
}
