import { Badge } from './Badge'

export function StockBadge({ stock, minStock = 0, trackStock = true }) {
  if (!trackStock) return <Badge color="gray">Sin seguimiento</Badge>

  const qty = parseFloat(stock) || 0
  const min = parseFloat(minStock) || 0

  if (qty <= 0) return <Badge color="red" dot>Sin stock</Badge>
  if (min > 0 && qty <= min) return <Badge color="yellow" dot>Stock bajo</Badge>
  return <Badge color="green" dot>{qty} unidades</Badge>
}
