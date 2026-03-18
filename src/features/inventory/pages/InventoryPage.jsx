import { useInventoryMovements } from '../hooks/useProducts'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { formatDateTime } from '@/lib/formatters/dates'

const movementTypeLabels = {
  purchase: 'Compra', sale: 'Venta', adjustment: 'Ajuste',
  internal_use: 'Uso interno', return: 'Devolución',
  transfer_in: 'Transferencia entrada', transfer_out: 'Transferencia salida', loss: 'Pérdida',
}

const movementTypeColors = {
  purchase: 'green', sale: 'blue', adjustment: 'orange',
  internal_use: 'brand', return: 'cyan', loss: 'red',
}

export function InventoryPage() {
  const { data: movements = [], isLoading } = useInventoryMovements()

  const columns = [
    { key: 'product', header: 'Producto', render: (v) => v?.name || '—' },
    {
      key: 'type',
      header: 'Tipo',
      render: (v) => (
        <Badge color={movementTypeColors[v] || 'gray'}>
          {movementTypeLabels[v] || v}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      render: (v) => (
        <span className={`font-mono font-medium ${v > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {v > 0 ? '+' : ''}{v}
        </span>
      ),
    },
    { key: 'stock_before', header: 'Antes', render: (v) => <span className="font-mono text-gray-500">{v}</span> },
    { key: 'stock_after', header: 'Después', render: (v) => <span className="font-mono font-medium">{v}</span> },
    { key: 'created_by_profile', header: 'Por', render: (v) => v?.full_name || '—' },
    { key: 'created_at', header: 'Fecha', render: (v) => formatDateTime(v) },
    { key: 'notes', header: 'Notas', render: (v) => v || '—' },
  ]

  return (
    <div className="page-container space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Movimientos de inventario</h1>
      <DataTable
        columns={columns}
        data={movements}
        loading={isLoading}
        emptyTitle="Sin movimientos"
        emptyDescription="Los movimientos de stock aparecerán aquí."
      />
    </div>
  )
}
