import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, ArrowLeft, ShoppingCart } from 'lucide-react'
import { useCreateSale } from '../hooks/useSales'
import { useServices } from '@/features/services/hooks/useServices'
import { useProducts } from '@/features/inventory/hooks/useProducts'
import { useClients } from '@/features/clients/hooks/useClients'
import { useAuthContext } from '@/app/providers/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { formatMoney } from '@/lib/formatters/money'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/lib/constants/paymentMethods'

export function NewSalePage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { mutate: createSale, isPending } = useCreateSale()

  const { data: servicesData = [] } = useServices()
  const { data: productsData = [] } = useProducts()
  const { data: clientsData } = useClients()
  const clients = clientsData?.data || []

  const [clientId, setClientId] = useState('')
  const [items, setItems] = useState([])
  const [payments, setPayments] = useState([{ method: PAYMENT_METHODS.CASH, amount: 0 }])
  const [discount, setDiscount] = useState(0)
  const [tipAmount, setTipAmount] = useState(0)

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const total = subtotal - parseFloat(discount || 0) + parseFloat(tipAmount || 0)

  function addService(service) {
    setItems(prev => [
      ...prev,
      {
        item_type: 'service',
        service_id: service.id,
        description: service.name,
        quantity: 1,
        unit_price: parseFloat(service.price),
        discount_total: 0,
      },
    ])
    // Actualizar monto del primer pago
    const newTotal = subtotal + parseFloat(service.price) - parseFloat(discount || 0) + parseFloat(tipAmount || 0)
    setPayments(prev => prev.map((p, i) => i === 0 ? { ...p, amount: newTotal } : p))
  }

  function addProduct(product) {
    setItems(prev => [
      ...prev,
      {
        item_type: 'product',
        product_id: product.id,
        description: product.name,
        quantity: 1,
        unit_price: parseFloat(product.sale_price),
        discount_total: 0,
        current_stock: parseFloat(product.stock_qty),
      },
    ])
  }

  function removeItem(index) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function updateItemQty(index, qty) {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity: Math.max(1, qty) } : item
    ))
  }

  function handleSubmit() {
    if (!items.length) return

    createSale({
      items,
      payments: payments.filter(p => parseFloat(p.amount) > 0),
      clientId: clientId || null,
      discountTotal: parseFloat(discount || 0),
      tipAmount: parseFloat(tipAmount || 0),
      soldBy: user.id,
    }, {
      onSuccess: () => navigate('/app/sales'),
    })
  }

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/app/sales')} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Nueva venta</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Catálogo */}
        <div className="lg:col-span-2 space-y-4">
          {/* Clienta */}
          <Card>
            <CardTitle className="mb-3">Clienta (opcional)</CardTitle>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="input-base"
            >
              <option value="">Consumidor final</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>
              ))}
            </select>
          </Card>

          {/* Servicios */}
          <Card>
            <CardTitle className="mb-3">Agregar servicios</CardTitle>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {servicesData.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => addService(svc)}
                  className="text-left p-2.5 rounded-xl border border-gray-100 hover:border-brand-300 hover:bg-brand-50 transition-all"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{svc.name}</p>
                  <p className="text-xs text-brand-600 font-medium">{formatMoney(svc.price)}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Productos */}
          <Card>
            <CardTitle className="mb-3">Agregar productos</CardTitle>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {productsData.filter(p => p.is_retail).map(prod => (
                <button
                  key={prod.id}
                  onClick={() => addProduct(prod)}
                  className="text-left p-2.5 rounded-xl border border-gray-100 hover:border-brand-300 hover:bg-brand-50 transition-all"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{prod.name}</p>
                  <p className="text-xs text-brand-600 font-medium">{formatMoney(prod.sale_price)}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Ticket */}
        <div>
          <Card className="sticky top-20">
            <CardTitle className="mb-3">Ticket</CardTitle>

            {/* Items */}
            <div className="space-y-2 mb-4 min-h-[80px]">
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Agregá items al ticket</p>
              ) : items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{item.description}</p>
                    <p className="text-xs text-gray-400">{formatMoney(item.unit_price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateItemQty(i, item.quantity - 1)}
                      className="w-5 h-5 rounded text-gray-500 hover:bg-gray-100 text-xs font-bold"
                    >−</button>
                    <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateItemQty(i, item.quantity + 1)}
                      className="w-5 h-5 rounded text-gray-500 hover:bg-gray-100 text-xs font-bold"
                    >+</button>
                  </div>
                  <MoneyDisplay amount={item.quantity * item.unit_price} size="sm" />
                  <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="space-y-1.5 text-sm border-t border-gray-100 pt-3 mb-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <MoneyDisplay amount={subtotal} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Descuento</span>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  className="input-base w-24 py-1 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Propina</span>
                <input
                  type="number"
                  min={0}
                  value={tipAmount}
                  onChange={e => setTipAmount(e.target.value)}
                  className="input-base w-24 py-1 text-right"
                />
              </div>
              <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
                <span>Total</span>
                <MoneyDisplay amount={total} size="lg" />
              </div>
            </div>

            {/* Métodos de pago */}
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold uppercase text-gray-400">Pago</p>
              {payments.map((pay, i) => (
                <div key={i} className="flex gap-2">
                  <select
                    value={pay.method}
                    onChange={e => setPayments(prev => prev.map((p, idx) =>
                      idx === i ? { ...p, method: e.target.value } : p
                    ))}
                    className="input-base flex-1 py-1.5"
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={pay.amount}
                    onChange={e => setPayments(prev => prev.map((p, idx) =>
                      idx === i ? { ...p, amount: e.target.value } : p
                    ))}
                    className="input-base w-28 py-1.5 text-right"
                  />
                </div>
              ))}
              <button
                onClick={() => setPayments(prev => [...prev, { method: 'cash', amount: 0 }])}
                className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Agregar método
              </button>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={items.length === 0}
              loading={isPending}
            >
              <ShoppingCart className="w-4 h-4" />
              Confirmar venta
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
