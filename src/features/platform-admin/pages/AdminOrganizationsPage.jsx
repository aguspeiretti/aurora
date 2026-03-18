import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import {
  Plus, Search, RefreshCw, Building2, CheckCircle2,
  Clock, AlertTriangle, XCircle, Pencil, ExternalLink,
  TrendingUp,
} from 'lucide-react'
import { CreateOrganizationModal } from '../components/CreateOrganizationModal'
import { EditSubscriptionModal } from '../components/EditSubscriptionModal'

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  trial:     { label: 'Trial',      color: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
  active:    { label: 'Activo',     color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
  past_due:  { label: 'Vencido',    color: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  suspended: { label: 'Suspendido', color: 'bg-gray-500/15 text-gray-400 border border-gray-500/30' },
  cancelled: { label: 'Cancelado',  color: 'bg-gray-700/50 text-gray-500 border border-gray-700' },
}

const PLAN_CONFIG = {
  basico:     { label: 'Básico',     color: 'text-gray-400' },
  pro:        { label: 'Pro',        color: 'text-amber-400' },
  enterprise: { label: 'Enterprise', color: 'text-amber-400' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.trial
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isExpired(iso) {
  return iso ? new Date(iso) < new Date() : false
}

// ─── growth chart (CSS bars, no lib) ─────────────────────────────────────────

function GrowthChart({ orgs }) {
  // bucket por mes de los últimos 6 meses
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-AR', { month: 'short' }),
      count: 0,
    }
  })

  orgs.forEach(o => {
    const key = o.created_at?.slice(0, 7)
    const bucket = months.find(m => m.key === key)
    if (bucket) bucket.count++
  })

  const max = Math.max(...months.map(m => m.count), 1)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={15} className="text-amber-400" />
        <p className="text-gray-400 text-sm font-medium">Nuevos centros — últimos 6 meses</p>
      </div>
      <div className="flex items-end gap-2 h-20">
        {months.map(m => (
          <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-gray-500 text-[10px]">{m.count || ''}</span>
            <div
              className="w-full rounded-t bg-amber-700/70 hover:bg-amber-600/80 transition-all min-h-[4px]"
              style={{ height: `${Math.max((m.count / max) * 56, 4)}px` }}
              title={`${m.label}: ${m.count}`}
            />
            <span className="text-gray-600 text-[10px]">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-white text-2xl font-bold leading-tight">{value ?? '—'}</p>
      </div>
    </div>
  )
}

// ─── página ───────────────────────────────────────────────────────────────────

export function AdminOrganizationsPage() {
  const navigate = useNavigate()
  const [orgs, setOrgs]               = useState([])
  const [stats, setStats]             = useState(null)
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreate, setShowCreate]   = useState(false)
  const [editOrg, setEditOrg]         = useState(null)
  const [extendingId, setExtendingId] = useState(null)

  const loadData = async () => {
    setLoading(true)
    const [orgsRes, statsRes] = await Promise.all([
      supabase.rpc('get_all_organizations_for_admin'),
      supabase.rpc('get_platform_stats'),
    ])
    if (orgsRes.data)    setOrgs(orgsRes.data)
    if (statsRes.data?.[0]) setStats(statsRes.data[0])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleCreated = () => { setShowCreate(false); loadData() }
  const handleUpdated = (updated) => {
    setOrgs(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o))
    setEditOrg(null)
  }

  async function extendTrial(e, org) {
    e.stopPropagation()
    setExtendingId(org.id)
    const base    = org.trial_ends_at ? new Date(org.trial_ends_at) : new Date()
    const newDate = new Date(Math.max(base, new Date()))
    newDate.setDate(newDate.getDate() + 30)
    await supabase.rpc('update_org_subscription', {
      p_org_id:              org.id,
      p_subscription_status: org.subscription_status,
      p_subscription_plan:   org.subscription_plan,
      p_trial_ends_at:       newDate.toISOString(),
    })
    setExtendingId(null)
    loadData()
  }

  const filtered = orgs.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      o.name.toLowerCase().includes(q) ||
      o.slug.toLowerCase().includes(q) ||
      (o.owner_email || '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || o.subscription_status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="min-h-full bg-gray-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-xl font-semibold">Centros</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestión de organizaciones y suscripciones</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nuevo centro
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <StatCard icon={Building2}     label="Total centros" value={stats.total_organizations}  color="bg-gray-800 text-gray-300" />
          <StatCard icon={CheckCircle2}  label="Activos"       value={stats.active_subscriptions} color="bg-emerald-500/20 text-emerald-400" />
          <StatCard icon={Clock}         label="En trial"      value={stats.trial_count}           color="bg-amber-500/20 text-amber-400" />
          <StatCard icon={AlertTriangle} label="Vencidos"      value={stats.past_due_count}        color="bg-red-500/20 text-red-400" />
          <StatCard icon={XCircle}       label="Suspendidos"   value={Number(stats.suspended_count) + Number(stats.cancelled_count)} color="bg-gray-700 text-gray-400" />
        </div>
      )}

      {/* Growth chart */}
      {orgs.length > 0 && <GrowthChart orgs={orgs} />}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, slug o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-gray-600 placeholder-gray-600"
          />
        </div>
        <div className="flex gap-1.5">
          {['all', 'trial', 'active', 'past_due', 'suspended'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-amber-700 text-white'
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
              }`}
            >
              {s === 'all' ? 'Todos' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={20} className="animate-spin text-gray-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={32} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">
              {orgs.length === 0 ? 'Todavía no hay centros registrados' : 'Sin resultados para este filtro'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Centro</th>
                  <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Owner</th>
                  <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Plan</th>
                  <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Estado</th>
                  <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Vencimiento</th>
                  <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Alta</th>
                  <th className="text-left text-gray-500 text-xs font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(org => {
                  const expiryDate = org.subscription_status === 'trial'
                    ? org.trial_ends_at
                    : org.subscription_ends_at
                  const expired  = isExpired(expiryDate)
                  const planCfg  = PLAN_CONFIG[org.subscription_plan] || PLAN_CONFIG.basico

                  return (
                    <tr
                      key={org.id}
                      onClick={() => navigate(`/admin/organizations/${org.id}`)}
                      className={`hover:bg-gray-800/60 transition-colors cursor-pointer ${!org.active ? 'opacity-50' : ''}`}
                    >
                      {/* Centro */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {org.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium leading-tight">{org.name}</p>
                            <p className="text-gray-500 text-xs">{org.slug}</p>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-4 py-3">
                        <p className="text-gray-300 text-sm">{org.owner_name || '—'}</p>
                        <p className="text-gray-500 text-xs">{org.owner_email || '—'}</p>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${planCfg.color}`}>{planCfg.label}</span>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <StatusBadge status={org.subscription_status} />
                      </td>

                      {/* Vencimiento */}
                      <td className="px-4 py-3">
                        <span className={`text-sm ${expired && expiryDate ? 'text-red-400' : 'text-gray-400'}`}>
                          {formatDate(expiryDate)}
                        </span>
                      </td>

                      {/* Alta */}
                      <td className="px-4 py-3">
                        <span className="text-gray-500 text-sm">{formatDate(org.created_at)}</span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {org.subscription_status === 'trial' && (
                            <button
                              onClick={e => extendTrial(e, org)}
                              disabled={extendingId === org.id}
                              className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-[11px] font-medium transition-colors disabled:opacity-50"
                              title="Extender trial 30 días"
                            >
                              {extendingId === org.id ? '...' : '+30d'}
                            </button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); setEditOrg(org) }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Editar suscripción"
                          >
                            <Pencil size={14} />
                          </button>
                          <a
                            href={`/book/${org.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                            title="Ver portal de reservas"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-gray-600 text-xs mt-3 text-right">
          {filtered.length} de {orgs.length} centros
        </p>
      )}

      {/* Modales */}
      {showCreate && (
        <CreateOrganizationModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {editOrg && (
        <EditSubscriptionModal org={editOrg} onClose={() => setEditOrg(null)} onUpdated={handleUpdated} />
      )}
    </div>
  )
}
