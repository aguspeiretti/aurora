import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import {
  ArrowLeft, Calendar, Users, DollarSign, Scissors,
  Building2, Globe, Phone, Mail, ExternalLink,
  CheckCircle2, Clock, AlertTriangle, XCircle, Pencil,
  Check, X, RefreshCw,
} from 'lucide-react'
import { EditSubscriptionModal } from '../components/EditSubscriptionModal'

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  trial:     { label: 'Trial',      color: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',   icon: Clock },
  active:    { label: 'Activo',     color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30', icon: CheckCircle2 },
  past_due:  { label: 'Vencido',    color: 'bg-red-500/15 text-red-400 border border-red-500/30',         icon: AlertTriangle },
  suspended: { label: 'Suspendido', color: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',      icon: XCircle },
  cancelled: { label: 'Cancelado',  color: 'bg-gray-700/50 text-gray-500 border border-gray-700',         icon: XCircle },
}

const PLAN_CONFIG = {
  basico:     { label: 'Básico',     color: 'text-gray-400' },
  pro:        { label: 'Pro',        color: 'text-amber-400' },
  enterprise: { label: 'Enterprise', color: 'text-amber-400' },
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtMoney(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
}

function isExpired(iso) {
  return iso ? new Date(iso) < new Date() : false
}

// ─── componentes internos ──────────────────────────────────────────────────────

function UsageStat({ icon: Icon, label, value, sub, color = 'text-amber-400' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color} bg-current/10`}
        style={{ backgroundColor: 'transparent' }}>
        <Icon size={16} className={color} />
      </div>
      <p className="text-white text-2xl font-bold leading-tight">{value ?? '—'}</p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
      {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function InlineNotes({ orgId, initialNotes }) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes]     = useState(initialNotes || '')
  const [saving, setSaving]   = useState(false)
  const ref = useRef()

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  async function save() {
    setSaving(true)
    await supabase.rpc('update_org_platform_notes', { p_org_id: orgId, p_notes: notes })
    setSaving(false)
    setEditing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Notas internas</p>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-gray-600 hover:text-gray-400 transition-colors">
            <Pencil size={13} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={ref}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-amber-500"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
              Guardar
            </button>
            <button
              onClick={() => { setNotes(initialNotes || ''); setEditing(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-xs font-medium transition-colors"
            >
              <X size={12} /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap min-h-[2.5rem]">
          {notes || <span className="text-gray-600 italic">Sin notas</span>}
        </p>
      )}
    </div>
  )
}

// ─── página principal ──────────────────────────────────────────────────────────

export function AdminOrgDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [org, setOrg]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_org_detail_for_admin', { p_org_id: id })
    if (!error && data) setOrg(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  function handleUpdated(updated) {
    setOrg(prev => ({ ...prev, ...updated }))
    setEditOpen(false)
    load() // reload to get fresh data
  }

  if (loading) {
    return (
      <div className="min-h-full bg-gray-950 flex items-center justify-center">
        <RefreshCw size={20} className="animate-spin text-gray-600" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="min-h-full bg-gray-950 p-6 text-gray-500">
        Organización no encontrada.
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[org.subscription_status] || STATUS_CONFIG.trial
  const planCfg   = PLAN_CONFIG[org.subscription_plan]     || PLAN_CONFIG.basico
  const expiryDate = org.subscription_status === 'trial' ? org.trial_ends_at : org.subscription_ends_at
  const expired    = isExpired(expiryDate)

  async function extendTrial() {
    const current = org.trial_ends_at ? new Date(org.trial_ends_at) : new Date()
    const newDate  = new Date(Math.max(current, new Date()))
    newDate.setDate(newDate.getDate() + 30)
    await supabase.rpc('update_org_subscription', {
      p_org_id:              org.id,
      p_subscription_status: org.subscription_status,
      p_subscription_plan:   org.subscription_plan,
      p_trial_ends_at:       newDate.toISOString(),
    })
    load()
  }

  async function toggleActive() {
    await supabase.rpc('update_org_subscription', {
      p_org_id:              org.id,
      p_subscription_status: org.subscription_status,
      p_subscription_plan:   org.subscription_plan,
      p_active:              !org.active,
    })
    load()
  }

  return (
    <div className="min-h-full bg-gray-950 p-6">
      {/* Back + header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/organizations')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={15} /> Volver a centros
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${org.primary_color || '#a87030'}, #8b5a24)` }}
            >
              {org.name[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white text-xl font-semibold">{org.name}</h1>
                {!org.active && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-xs">
                    Desactivado
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">{org.slug}</p>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {org.subscription_status === 'trial' && (
              <button
                onClick={extendTrial}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 text-xs font-medium transition-colors"
              >
                +30 días trial
              </button>
            )}
            <button
              onClick={toggleActive}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                org.active
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {org.active ? 'Suspender acceso' : 'Reactivar acceso'}
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium transition-colors"
            >
              Editar suscripción
            </button>
            <a
              href={`/book/${org.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 border border-gray-800 transition-colors"
              title="Ver portal"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        </div>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <UsageStat icon={Calendar}    label="Turnos este mes"   value={org.usage?.appts_month}   sub={`${org.usage?.appts_total} totales`} color="text-amber-400" />
        <UsageStat icon={Users}       label="Clientes activos"  value={org.usage?.clients_total}  color="text-sky-400" />
        <UsageStat icon={DollarSign}  label="Ventas este mes"   value={fmtMoney(org.usage?.revenue_month)} color="text-emerald-400" />
        <UsageStat icon={Scissors}    label="Profesionales"     value={org.usage?.staff_count}    sub={`${org.usage?.services_count} servicios`} color="text-rose-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Suscripción */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Suscripción</p>

          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
              <statusCfg.icon size={11} className="mr-1" /> {statusCfg.label}
            </span>
            <span className={`text-sm font-semibold ${planCfg.color}`}>{planCfg.label}</span>
          </div>

          <div className="space-y-2 text-sm">
            {org.subscription_status === 'trial' && (
              <div className="flex justify-between">
                <span className="text-gray-500">Fin de trial</span>
                <span className={expired ? 'text-red-400' : 'text-gray-300'}>{fmt(org.trial_ends_at)}</span>
              </div>
            )}
            {org.subscription_ends_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Vencimiento</span>
                <span className={isExpired(org.subscription_ends_at) ? 'text-red-400' : 'text-gray-300'}>
                  {fmt(org.subscription_ends_at)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Alta</span>
              <span className="text-gray-300">{fmt(org.created_at)}</span>
            </div>
          </div>

          <hr className="border-gray-800" />
          <InlineNotes orgId={org.id} initialNotes={org.platform_notes} />
        </div>

        {/* Owner + contacto */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Owner</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold flex-shrink-0">
              {(org.owner_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{org.owner_name || '—'}</p>
              <p className="text-gray-500 text-xs">{org.owner_email || '—'}</p>
            </div>
          </div>

          <hr className="border-gray-800" />
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Contacto del centro</p>
          <div className="space-y-2">
            {[
              { icon: Phone,  value: org.phone },
              { icon: Mail,   value: org.email },
              { icon: Globe,  value: org.website, href: org.website },
            ].map(({ icon: Icon, value, href }) => value ? (
              <div key={value} className="flex items-center gap-2 text-sm">
                <Icon size={13} className="text-gray-600 flex-shrink-0" />
                {href
                  ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline truncate">{value}</a>
                  : <span className="text-gray-400 truncate">{value}</span>
                }
              </div>
            ) : null)}
            {!org.phone && !org.email && !org.website && (
              <p className="text-gray-600 text-sm italic">Sin datos de contacto</p>
            )}
          </div>
        </div>

        {/* Sucursales */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-4">
            Sucursales ({org.branches?.length || 0})
          </p>
          {org.branches?.length > 0 ? (
            <div className="space-y-2">
              {org.branches.map(b => (
                <div key={b.id} className={`flex items-start justify-between py-2 border-b border-gray-800 last:border-0 ${!b.active ? 'opacity-40' : ''}`}>
                  <div>
                    <p className="text-gray-200 text-sm font-medium">{b.name}</p>
                    {b.address && <p className="text-gray-600 text-xs mt-0.5">{b.address}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {b.online_booking_enabled && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px]">Online</span>
                    )}
                    {!b.active && (
                      <span className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-500 text-[10px]">Inactiva</span>
                    )}
                    <a
                      href={`/book/${org.slug}/${b.name.toLowerCase().replace(/\s+/g, '-')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm italic">Sin sucursales registradas</p>
          )}
        </div>
      </div>

      {editOpen && (
        <EditSubscriptionModal
          org={org}
          onClose={() => setEditOpen(false)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
