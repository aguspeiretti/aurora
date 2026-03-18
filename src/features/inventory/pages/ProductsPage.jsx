import { useState } from 'react'
import { Plus, Boxes, Edit } from 'lucide-react'
import { useProducts, useCreateProduct, useAdjustStock } from '../hooks/useProducts'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { StockBadge } from '@/components/ui/StockBadge'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [stockModal, setStockModal] = useState(null)

  const { data: products = [], isLoading } = useProducts({ search })

  return (
    <div className="page-container space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Productos</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Nuevo producto
        </Button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar producto..." className="max-w-sm" />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon={Boxes} title="Sin productos"
          action={<Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />Nuevo</Button>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {products.map((product, i) => (
            <div key={product.id} className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''} hover:bg-gray-50/50`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{product.name}</p>
                <p className="text-xs text-gray-400">
                  {product.sku && <span className="font-mono mr-2">{product.sku}</span>}
                  {product.category?.name}
                  {product.is_retail && <Badge color="blue" className="ml-1">Reventa</Badge>}
                  {product.is_supply && <Badge color="brand" className="ml-1">Insumo</Badge>}
                </p>
              </div>
              <MoneyDisplay amount={product.sale_price} />
              <StockBadge stock={product.stock_qty} minStock={product.min_stock_qty} trackStock={product.track_stock} />
              <div className="flex gap-1">
                <button
                  onClick={() => setStockModal(product)}
                  className="p-1.5 text-xs text-gray-400 hover:text-brand-600 border border-gray-200 rounded-lg"
                >
                  Ajustar stock
                </button>
                <button
                  onClick={() => { setEditingProduct(product); setFormOpen(true) }}
                  className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onOpenChange={(o) => { if (!o) { setEditingProduct(null); setFormOpen(false) } }}
        title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
      >
        <ProductForm
          product={editingProduct}
          onSuccess={() => { setEditingProduct(null); setFormOpen(false) }}
          onCancel={() => { setEditingProduct(null); setFormOpen(false) }}
        />
      </Modal>

      <Modal open={!!stockModal} onOpenChange={(o) => { if (!o) setStockModal(null) }} title="Ajustar stock" size="sm">
        {stockModal && (
          <StockAdjustForm
            product={stockModal}
            onSuccess={() => setStockModal(null)}
            onCancel={() => setStockModal(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function ProductForm({ product, onSuccess, onCancel }) {
  const { mutate: create, isPending: creating } = useCreateProduct()
  const { register, handleSubmit } = useForm({
    defaultValues: product || { sale_price: 0, cost_price: 0, stock_qty: 0, min_stock_qty: 0, is_retail: true, is_supply: false, track_stock: true },
  })

  function onSubmit(data) {
    create({ ...data, sale_price: parseFloat(data.sale_price), cost_price: parseFloat(data.cost_price) }, { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Nombre" required {...register('name')} />
        </div>
        <Input label="SKU" {...register('sku')} />
        <Input label="Marca" {...register('brand')} />
        <Input label="Precio de venta" type="number" min={0} step={50} {...register('sale_price')} />
        <Input label="Precio de costo" type="number" min={0} step={50} {...register('cost_price')} />
        <Input label="Stock inicial" type="number" min={0} {...register('stock_qty', { valueAsNumber: true })} />
        <Input label="Stock mínimo" type="number" min={0} {...register('min_stock_qty', { valueAsNumber: true })} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={creating}>{product ? 'Guardar' : 'Crear'}</Button>
      </div>
    </form>
  )
}

function StockAdjustForm({ product, onSuccess, onCancel }) {
  const { mutate: adjustStock, isPending } = useAdjustStock()
  const { user } = { user: { id: null } } // placeholder
  const { register, handleSubmit } = useForm({ defaultValues: { type: 'purchase', quantity: 1 } })

  function onSubmit(data) {
    adjustStock({
      productId: product.id,
      type: data.type,
      quantity: parseFloat(data.quantity),
      notes: data.notes,
      createdBy: user?.id,
      currentStock: parseFloat(product.stock_qty),
    }, { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-gray-500">Producto: <strong>{product.name}</strong> — Stock: {product.stock_qty}</p>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Tipo</label>
        <select className="input-base" {...register('type')}>
          <option value="purchase">Ingreso (compra)</option>
          <option value="adjustment">Ajuste</option>
          <option value="loss">Pérdida</option>
          <option value="internal_use">Uso interno</option>
        </select>
      </div>
      <Input label="Cantidad" type="number" min={0.001} step={0.001} required
        {...register('quantity', { valueAsNumber: true })} />
      <Input label="Notas" {...register('notes')} />
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={isPending}>Guardar</Button>
      </div>
    </form>
  )
}
