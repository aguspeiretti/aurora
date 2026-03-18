import {
  Calendar, DollarSign, Users, TrendingUp,
  AlertTriangle, Package, Clock, CheckCircle2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { MetricCard } from '@/components/ui/MetricCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { AppointmentStatusBadge } from '@/components/ui/StatusBadge'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { formatMoney } from '@/lib/formatters/money'
import { formatTime, formatDate } from '@/lib/formatters/dates'

export function DashboardPage() {
  const { data, isLoading } = useDashboardMetrics()
  const { currentOrg } = useOrgContext()
  const navigate = useNavigate()

  const today = data?.today
  const month = data?.month
  const alerts = data?.alerts

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Buenos días 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {currentOrg?.name} — {new Date().toLocaleDateString('es-AR', {
            weekday: 'long', day: 'numeric', month: 'long'
          })}
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Turnos hoy"
          value={today?.total ?? '—'}
          subtitle={`${today?.confirmed ?? 0} confirmados`}
          icon={Calendar}
          iconColor="brand"
          loading={isLoading}
        />
        <MetricCard
          title="Completados hoy"
          value={today?.completed ?? '—'}
          subtitle={`${today?.noShows ?? 0} ausentes`}
          icon={CheckCircle2}
          iconColor="green"
          loading={isLoading}
        />
        <MetricCard
          title="Ingresos del mes"
          value={isLoading ? '—' : formatMoney(month?.revenue || 0)}
          subtitle={`${month?.salesCount ?? 0} ventas`}
          icon={DollarSign}
          iconColor="cyan"
          loading={isLoading}
        />
        <MetricCard
          title="Ticket promedio"
          value={isLoading ? '—' : formatMoney(month?.avgTicket || 0)}
          subtitle="Este mes"
          icon={TrendingUp}
          iconColor="brand"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Agenda de hoy */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              action={
                <button
                  onClick={() => navigate('/app/agenda')}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  Ver agenda →
                </button>
              }
            >
              <CardTitle>Agenda de hoy</CardTitle>
            </CardHeader>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !today?.appointments?.length ? (
              <EmptyState
                icon={Calendar}
                title="Sin turnos hoy"
                description="No hay turnos programados para hoy."
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {today.appointments.map((appt) => (
                  <div
                    key={appt.id}
                    onClick={() => navigate(`/app/agenda/${appt.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <div className="text-center min-w-[44px]">
                      <p className="text-sm font-bold text-gray-900">
                        {formatTime(appt.starts_at)}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {appt.client?.full_name || 'Sin clienta'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {appt.staff?.display_name || '—'}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Panel derecho */}
        <div className="space-y-5">
          {/* Ocupación */}
          <Card>
            <CardTitle className="mb-3">Ocupación hoy</CardTitle>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-900">
                {today?.occupancyPct ?? 0}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-700"
                style={{ width: `${today?.occupancyPct ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {today?.confirmed ?? 0} confirmados de {today?.total ?? 0} totales
            </p>
          </Card>

          {/* Alertas de stock */}
          {alerts?.lowStock?.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <CardTitle>Stock bajo</CardTitle>
                </div>
              </CardHeader>
              <div className="space-y-2">
                {alerts.lowStock.map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <p className="text-sm text-gray-700 truncate flex-1">{product.name}</p>
                    <Badge color="yellow">{product.stock_qty} restantes</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Paquetes por vencer */}
          {alerts?.expiringPackages?.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  <CardTitle>Paquetes por vencer</CardTitle>
                </div>
              </CardHeader>
              <div className="space-y-2">
                {alerts.expiringPackages.map((pkg) => (
                  <div key={pkg.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 truncate">{pkg.client?.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{pkg.name}</p>
                    </div>
                    <Badge color="orange">
                      {formatDate(pkg.expires_at)}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Ventas recientes */}
      <Card>
        <CardHeader
          action={
            <button
              onClick={() => navigate('/app/sales')}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              Ver todas →
            </button>
          }
        >
          <CardTitle>Ventas recientes</CardTitle>
        </CardHeader>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !data?.recentSales?.length ? (
          <EmptyState
            icon={DollarSign}
            title="Sin ventas recientes"
            className="py-6"
          />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-4 sm:px-6 py-2 text-left text-xs text-gray-400 font-medium">Clienta</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">Fecha</th>
                  <th className="px-4 py-2 text-right text-xs text-gray-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.slice(0, 8).map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 sm:px-6 py-2.5 font-medium text-gray-900">
                      {sale.client?.full_name || 'Consumidor final'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {formatDate(sale.sold_at, 'dd/MM HH:mm')}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      <MoneyDisplay amount={sale.total} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
