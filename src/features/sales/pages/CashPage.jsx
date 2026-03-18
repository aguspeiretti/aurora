import { useState } from 'react'
import { DollarSign, Lock, Unlock } from 'lucide-react'
import { useCashSessions, useActiveCashSession } from '../hooks/useSales'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { useAuthContext } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/formatters/dates'
import toast from 'react-hot-toast'

export function CashPage() {
  const { currentOrg, currentBranch } = useOrgContext()
  const { user } = useAuthContext()
  const qc = useQueryClient()
  const [openingAmount, setOpeningAmount] = useState(0)
  const [closingAmount, setClosingAmount] = useState(0)
  const [loading, setLoading] = useState(false)

  const { data: activeSess } = useActiveCashSession()
  const { data: sessions = [] } = useCashSessions()

  async function openCash() {
    setLoading(true)
    try {
      await supabase.from('cash_sessions').insert({
        organization_id: currentOrg.id,
        branch_id: currentBranch.id,
        opened_by: user.id,
        opening_amount: parseFloat(openingAmount) || 0,
        status: 'open',
      })
      toast.success('Caja abierta')
      qc.invalidateQueries({ queryKey: ['cash_sessions'] })
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function closeCash() {
    setLoading(true)
    try {
      await supabase.from('cash_sessions')
        .update({
          closed_by: user.id,
          closed_at: new Date().toISOString(),
          closing_amount_actual: parseFloat(closingAmount) || 0,
          status: 'closed',
        })
        .eq('id', activeSess.id)
      toast.success('Caja cerrada')
      qc.invalidateQueries({ queryKey: ['cash_sessions'] })
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container max-w-3xl space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Caja</h1>

      {/* Estado actual */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeSess ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            {activeSess ? <Unlock className="w-5 h-5 text-emerald-600" /> : <Lock className="w-5 h-5 text-gray-500" />}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {activeSess ? 'Caja abierta' : 'Caja cerrada'}
            </p>
            {activeSess && (
              <p className="text-xs text-gray-500">
                Desde {formatDateTime(activeSess.opened_at)}
              </p>
            )}
          </div>
          <Badge color={activeSess ? 'green' : 'gray'} className="ml-auto">
            {activeSess ? 'Abierta' : 'Cerrada'}
          </Badge>
        </div>

        {!activeSess ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Monto inicial en efectivo</label>
              <input
                type="number"
                min={0}
                value={openingAmount}
                onChange={e => setOpeningAmount(e.target.value)}
                className="input-base max-w-xs"
              />
            </div>
            <Button onClick={openCash} loading={loading}>
              <Unlock className="w-4 h-4" />
              Abrir caja
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Monto apertura</p>
                <MoneyDisplay amount={activeSess.opening_amount} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Monto real en caja</label>
              <input
                type="number"
                min={0}
                value={closingAmount}
                onChange={e => setClosingAmount(e.target.value)}
                className="input-base max-w-xs"
              />
            </div>
            <Button variant="danger" onClick={closeCash} loading={loading}>
              <Lock className="w-4 h-4" />
              Cerrar caja
            </Button>
          </div>
        )}
      </Card>

      {/* Historial */}
      <Card>
        <CardTitle className="mb-3">Historial de sesiones</CardTitle>
        <div className="space-y-2">
          {sessions.slice(0, 10).map(sess => (
            <div key={sess.id} className="flex items-center gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1">
                <p className="text-gray-700">{formatDateTime(sess.opened_at)}</p>
                <p className="text-xs text-gray-400">
                  {sess.opened_by_profile?.full_name}
                  {sess.closed_at && ` → ${formatDateTime(sess.closed_at)}`}
                </p>
              </div>
              <Badge color={sess.status === 'open' ? 'green' : 'gray'}>
                {sess.status === 'open' ? 'Abierta' : 'Cerrada'}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
