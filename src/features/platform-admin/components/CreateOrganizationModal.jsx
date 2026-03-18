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
  { value: 'active', label: 'Activo' },
]

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export function CreateOrganizationModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    orgName: '',
    orgSlug: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    plan: 'basico',
    subscriptionStatus: 'trial',
    trialEndsAt: '',
    platformNotes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleNameChange = (e) => {
    const name = e.target.value
    setForm(f => ({
      ...f,
      orgName: name,
      orgSlug: f.orgSlug || slugify(name),
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-organization', {
        body: {
          orgName: form.orgName,
          orgSlug: form.orgSlug,
          ownerName: form.ownerName,
          ownerEmail: form.ownerEmail,
          ownerPassword: form.ownerPassword,
          plan: form.plan,
          subscriptionStatus: form.subscriptionStatus,
          trialEndsAt: form.trialEndsAt || null,
          platformNotes: form.platformNotes || null,
        },
      })

      if (fnError) {
        let msg = fnError.message || 'Error al crear la organización'
        try {
          const body = await fnError.context?.json()
          if (body?.error) msg = body.error
        } catch {}
        throw new Error(msg)
      }

      onCreated(data.organization)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">Nuevo centro</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Datos del centro */}
          <div>
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">Centro</p>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Nombre del centro *</label>
                <input
                  type="text"
                  name="orgName"
                  value={form.orgName}
                  onChange={handleNameChange}
                  required
                  placeholder="Ej: Centro Estética Palermo"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Slug (URL de reservas) *</label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-sm">/book/</span>
                  <input
                    type="text"
                    name="orgSlug"
                    value={form.orgSlug}
                    onChange={handleChange}
                    required
                    placeholder="centro-palermo"
                    className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Datos del owner */}
          <div>
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">Propietario/a</p>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Nombre completo *</label>
                <input
                  type="text"
                  name="ownerName"
                  value={form.ownerName}
                  onChange={handleChange}
                  required
                  placeholder="Valentina Russo"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Email *</label>
                <input
                  type="email"
                  name="ownerEmail"
                  value={form.ownerEmail}
                  onChange={handleChange}
                  required
                  placeholder="owner@email.com"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Contraseña inicial *</label>
                <input
                  type="text"
                  name="ownerPassword"
                  value={form.ownerPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
                <p className="text-gray-600 text-xs mt-1">El cliente deberá cambiarla en su primer ingreso</p>
              </div>
            </div>
          </div>

          {/* Suscripción */}
          <div>
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">Suscripción</p>
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
                <label className="block text-gray-400 text-sm mb-1">Estado inicial</label>
                <select
                  name="subscriptionStatus"
                  value={form.subscriptionStatus}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-gray-400 text-sm mb-1">
                  {form.subscriptionStatus === 'trial' ? 'Trial hasta' : 'Vence el'}
                </label>
                <input
                  type="date"
                  name="trialEndsAt"
                  value={form.trialEndsAt}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Notas internas */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Notas internas</label>
            <textarea
              name="platformNotes"
              value={form.platformNotes}
              onChange={handleChange}
              rows={2}
              placeholder="Notas solo visibles para el equipo de Aurora..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
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
              {loading ? <><Loader2 size={15} className="animate-spin" /> Creando...</> : 'Crear centro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
