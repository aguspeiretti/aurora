import { useState } from 'react'
import { Plus, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSales } from '../hooks/useSales'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { formatDateTime } from '@/lib/formatters/dates'

export function SalesPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useSales()
  const sales = data?.data || []

  const columns = [
    { key: 'sale_number', header: 'N° Venta', render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: 'client', header: 'Clienta', render: (v) => v?.full_name || 'Consumidor final' },
    { key: 'sold_at', header: 'Fecha', render: (v) => formatDateTime(v) },
    {
      key: 'total',
      header: 'Total',
      render: (v) => <MoneyDisplay amount={v} />,
      cellClassName: 'font-medium text-right',
    },
    {
      key: 'payment_status',
      header: 'Estado',
      render: (v) => <PaymentStatusBadge status={v} />,
    },
  ]

  return (
    <div className="page-container space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Ventas</h1>
        <Button onClick={() => navigate('/app/sales/new')}>
          <Plus className="w-4 h-4" />
          Nueva venta
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={sales}
        loading={isLoading}
        emptyTitle="Sin ventas"
        emptyDescription="Las ventas registradas aparecerán aquí."
      />
    </div>
  )
}
