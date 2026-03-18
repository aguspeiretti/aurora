import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const PLAN_OPTIONS = [
  { value: 'basico', label: 'Básico' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

const STATUS_OPTIONS = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Activo — al día' },
  { value: 'past_due', label: 'Vencido — no pagó' },
  { value: 'suspended', label: 'Suspendido' },
  { value: 'cancelled', label: 'Cancelado' },
]

function toDateInput(iso) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export function EditSubscriptionModal({ org, onClose, onUpdated }) {
  const [form, setForm] = useState({
    plan: org.subscription_plan || 'basico',
    status: org.subscription_status || 'trial',
    trialEndsAt: toDateInput(org.trial_ends_at),
    subscriptionEndsAt: toDateInput(org.subscription_ends_at),
    platformNotes: org.platform_notes || '',
    active: org.active,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc('update_org_subscription', {
        p_org_id: org.id,
        p_subscription_status: form.status,
        p_subscription_plan: form.plan,
        p_trial_ends_at: form.trialEndsAt || null,
        p_subscription_ends_at: form.subscriptionEndsAt || null,
        p_platform_notes: form.platformNotes || null,
        p_active: form.active,
      })

      if (rpcError) throw new Error(rpcError.message)

      onUpdated({
        ...org,
        subscription_status: form.status,
        subscription_plan: form.plan,
        trial_ends_at: form.trialEndsAt || null,
        subscription_ends_at: form.subscriptionEndsAt || null,
        platform_notes: form.platformNotes || null,
        active: form.active,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-white font-semibold">Editar suscripción</h2>
            <p className="text-gray-500 text-sm">{org.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Plan</label>
              <select
                name="plan"
                value={form.plan}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                {PLAN_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Estado</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Trial hasta</label>
              <input
                type="date"
                name="trialEndsAt"
                value={form.trialEndsAt}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Vence el</label>
              <input
                type="date"
                name="subscriptionEndsAt"
                value={form.subscriptionEndsAt}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Notas internas</label>
            <textarea
              name="platformNotes"
              value={form.platformNotes}
              onChange={handleChange}
              rows={3}
              placeholder="Notas de seguimiento, acuerdos especiales, etc."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 py-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="active"
                checked={form.active}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-amber-700 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
            </label>
            <span className="text-gray-400 text-sm">
              Centro {form.active ? 'activo' : 'desactivado'}
            </span>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
