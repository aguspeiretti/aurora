import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { Gift, Plus, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { GiftCardStatusBadge } from '@/components/ui/StatusBadge'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'
import { formatDate } from '@/lib/formatters/dates'
import toast from 'react-hot-toast'

export function GiftCardsPage() {
  const { currentOrg, currentBranch } = useOrgContext()
  const qc = useQueryClient()
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)

  const { data: giftCards = [], isLoading } = useQuery({
    queryKey: ['gift_cards', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('id, code, recipient_name, status, current_balance, original_amount, expires_at, purchaser:client_profiles!purchaser_client_id(full_name)')
        .eq('organization_id', currentOrg.id)
        .order('issued_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrg?.id,
  })

  const { mutate: issueCard, isPending: issuing } = useMutation({
    mutationFn: async (data) => {
      const { data: codeData } = await supabase.rpc('generate_gift_card_code')
      const { error } = await supabase.from('gift_cards').insert({
        organization_id: currentOrg.id,
        branch_id: currentBranch?.id,
        code: codeData,
        original_amount: parseFloat(data.amount),
        current_balance: parseFloat(data.amount),
        recipient_name: data.recipient_name || null,
        recipient_email: data.recipient_email || null,
        personal_message: data.personal_message || null,
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
        status: 'active',
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gift_cards'] })
      toast.success('Gift card emitida')
      setNewModalOpen(false)
      reset()
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })

  const { mutate: deleteCard, isPending: deleting } = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('gift_cards').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gift_cards'] })
      toast.success('Gift card eliminada')
      setDeleteId(null)
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })

  const { register, handleSubmit, reset } = useForm()

  return (
    <div className="page-container space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Gift Cards</h1>
        <Button onClick={() => setNewModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Emitir gift card
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-36" />
          ))}
        </div>
      ) : giftCards.length === 0 ? (
        <EmptyState icon={Gift} title="Sin gift cards"
          description="Las gift cards emitidas aparecerán aquí."
          action={<Button onClick={() => setNewModalOpen(true)}><Plus className="w-4 h-4" />Emitir</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {giftCards.map(gc => (
            <div key={gc.id} className="card bg-gradient-to-br from-brand-50 to-brand-100 border-brand-100 relative">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-mono text-sm font-bold text-brand-700">{gc.code}</p>
                  {gc.recipient_name && (
                    <p className="text-xs text-gray-600">Para: {gc.recipient_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <GiftCardStatusBadge status={gc.status} />
                  {/* Menú opciones */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === gc.id ? null : gc.id)}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen === gc.id && (
                      <>
                        {/* Overlay para cerrar */}
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px]">
                          <button
                            onClick={() => { setDeleteId(gc.id); setMenuOpen(null) }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-end justify-between mt-3">
                <div>
                  <p className="text-xs text-gray-400">Saldo</p>
                  <MoneyDisplay amount={gc.current_balance} size="lg" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Original</p>
                  <MoneyDisplay amount={gc.original_amount} size="sm" />
                </div>
              </div>
              {gc.expires_at && (
                <p className="text-xs text-gray-400 mt-2">
                  Vence: {formatDate(gc.expires_at)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal nueva gift card */}
      <Modal open={newModalOpen} onOpenChange={setNewModalOpen} title="Emitir Gift Card" size="sm">
        <form onSubmit={handleSubmit(d => issueCard(d))} className="space-y-4">
          <Input label="Monto" type="number" min={1} required {...register('amount')} />
          <Input label="Nombre del destinatario" {...register('recipient_name')} />
          <Input label="Email del destinatario" type="email" {...register('recipient_email')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Mensaje personal</label>
            <textarea className="input-base" rows={2} {...register('personal_message')} />
          </div>
          <Input label="Fecha de vencimiento (opcional)" type="date" {...register('expires_at')} />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setNewModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={issuing}>
              <Gift className="w-4 h-4" />
              Emitir
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmar eliminación */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Eliminar gift card"
        description="¿Eliminás esta gift card? Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        variant="danger"
        loading={deleting}
        onConfirm={() => deleteCard(deleteId)}
      />
    </div>
  )
}
