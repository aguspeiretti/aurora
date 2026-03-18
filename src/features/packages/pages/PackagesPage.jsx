import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import {
  Package, Plus, ChevronRight, CheckCircle2, Circle, XCircle, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PackageStatusBadge } from '@/components/ui/StatusBadge'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { formatDate, formatDateTime } from '@/lib/formatters/dates'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

// ── Helpers ────────────────────────────────────────────────
function SessionDot({ status }) {
  if (status === 'used')    return <CheckCircle2 className="w-4 h-4 text-brand-500" />
  if (status === 'expired') return <XCircle className="w-4 h-4 text-gray-300" />
  return <Circle className="w-4 h-4 text-gray-300" />
}

export function PackagesPage() {
  const { currentOrg, currentBranch } = useOrgContext()
  const qc = useQueryClient()
  const [newOpen, setNewOpen] = useState(false)
  const [detailPkg, setDetailPkg] = useState(null)

  // ── Listado de paquetes ──────────────────────────────────
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['treatment_packages', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatment_packages')
        .select('*, client:client_profiles(id, full_name), service:services(id, name)')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrg?.id,
  })

  // ── Clientes y servicios para el formulario ──────────────
  const { data: clients = [] } = useQuery({
    queryKey: ['clients_list', currentOrg?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_profiles')
        .select('id, full_name')
        .eq('organization_id', currentOrg.id)
        .order('full_name')
      return data || []
    },
    enabled: !!currentOrg?.id && newOpen,
  })

  const { data: services = [] } = useQuery({
    queryKey: ['services_list', currentOrg?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('id, name')
        .eq('organization_id', currentOrg.id)
        .eq('active', true)
        .order('name')
      return data || []
    },
    enabled: !!currentOrg?.id && newOpen,
  })

  // ── Detalle: sesiones del paquete seleccionado ───────────
  const { data: sessions = [] } = useQuery({
    queryKey: ['package_sessions', detailPkg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('package_sessions')
        .select('*, appointment:appointments(id, starts_at)')
        .eq('package_id', detailPkg.id)
        .order('session_number')
      if (error) throw error
      return data || []
    },
    enabled: !!detailPkg?.id,
  })

  // ── Crear paquete (atomic via RPC) ──────────────────────
  const { mutate: createPackage, isPending: creating } = useMutation({
    mutationFn: async (values) => {
      const { error } = await supabase.rpc('create_package_with_sessions', {
        p_organization_id: currentOrg.id,
        p_branch_id:       currentBranch?.id || null,
        p_client_id:       values.client_id,
        p_service_id:      values.service_id || null,
        p_name:            values.name,
        p_total_sessions:  parseInt(values.total_sessions),
        p_total_price:     values.total_price ? parseFloat(values.total_price) : null,
        p_expires_at:      values.expires_at || null,
        p_notes:           values.notes || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treatment_packages'] })
      toast.success('Paquete creado')
      setNewOpen(false)
      reset()
    },
    onError: err => toast.error('Error: ' + err.message),
  })

  // ── Consumir sesión manualmente (atomic via RPC) ─────────
  const { mutate: consumeSession, isPending: consuming } = useMutation({
    mutationFn: async (pkg) => {
      const { data, error } = await supabase.rpc('consume_package_session', {
        p_package_id: pkg.id,
      })
      if (error) throw error
      return data
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['treatment_packages'] })
      qc.invalidateQueries({ queryKey: ['package_sessions', detailPkg?.id] })
      // Actualizar el pkg local para el modal usando los valores devueltos por el RPC
      setDetailPkg(prev => ({
        ...prev,
        used_sessions: result.used_sessions,
        status: result.status,
      }))
      toast.success('Sesión registrada')
    },
    onError: err => toast.error(err.message),
  })

  const { register, handleSubmit, reset, watch, setValue } = useForm()
  const watchService = watch('service_id')

  // Auto-completar nombre cuando se elige servicio
  function handleServiceChange(e) {
    const svcId = e.target.value
    setValue('service_id', svcId)
    if (svcId) {
      const svc = services.find(s => s.id === svcId)
      if (svc) setValue('name', `Pack de sesiones - ${svc.name}`)
    }
  }

  const availableCount = sessions.filter(s => s.status === 'available').length

  return (
    <div className="page-container space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Paquetes de sesiones</h1>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="w-4 h-4" />
          Nuevo paquete
        </Button>
      </div>

      {/* Listado */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-40" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin paquetes"
          description="Los paquetes de sesiones aparecerán aquí."
          action={<Button onClick={() => setNewOpen(true)}><Plus className="w-4 h-4" />Nuevo paquete</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => setDetailPkg(pkg)}
              className="card text-left hover:border-brand-200 hover:shadow-soft transition-all"
            >
              <div className="flex items-start justify-between mb-1">
                <p className="font-semibold text-gray-900 text-sm leading-snug pr-2">{pkg.name}</p>
                <PackageStatusBadge status={pkg.status} />
              </div>
              <p className="text-sm text-brand-600 font-medium">{pkg.client?.full_name || '—'}</p>
              {pkg.service && <p className="text-xs text-gray-500 mt-0.5">{pkg.service.name}</p>}

              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{pkg.used_sessions} usadas</span>
                  <span>{pkg.total_sessions - pkg.used_sessions} restantes</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${(pkg.used_sessions / pkg.total_sessions) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{pkg.used_sessions}/{pkg.total_sessions} sesiones</p>
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                <MoneyDisplay amount={pkg.total_price} size="sm" />
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  {pkg.expires_at && <>Vence: {formatDate(pkg.expires_at)}</>}
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Modal crear paquete ──────────────────────────── */}
      <Modal open={newOpen} onOpenChange={v => { setNewOpen(v); if (!v) reset() }} title="Nuevo paquete" size="sm">
        <form onSubmit={handleSubmit(createPackage)} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Cliente <span className="text-red-500">*</span></label>
            <select className="input-base" required {...register('client_id', { required: true })}>
              <option value="">Seleccioná un cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Servicio (opcional)</label>
            <select className="input-base" {...register('service_id')} onChange={handleServiceChange}>
              <option value="">Sin servicio específico</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <Input label="Nombre del paquete" required {...register('name', { required: true })} />
          <Input label="Cantidad de sesiones" type="number" min={1} required {...register('total_sessions', { required: true })} />
          <Input label="Precio total (opcional)" type="number" min={0} {...register('total_price')} />
          <Input label="Fecha de vencimiento (opcional)" type="date" {...register('expires_at')} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea className="input-base" rows={2} {...register('notes')} />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={creating}>
              <Package className="w-4 h-4" />
              Crear paquete
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal detalle paquete ────────────────────────── */}
      <Modal
        open={!!detailPkg}
        onOpenChange={v => !v && setDetailPkg(null)}
        title={detailPkg?.name || 'Detalle'}
        size="sm"
      >
        {detailPkg && (
          <div className="space-y-4">
            {/* Info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{detailPkg.client?.full_name}</p>
                {detailPkg.service && <p className="text-xs text-gray-500">{detailPkg.service.name}</p>}
              </div>
              <PackageStatusBadge status={detailPkg.status} />
            </div>

            {/* Progreso */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>{detailPkg.used_sessions} sesiones usadas</span>
                <span>{detailPkg.total_sessions - detailPkg.used_sessions} restantes</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${(detailPkg.used_sessions / detailPkg.total_sessions) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{detailPkg.used_sessions}/{detailPkg.total_sessions} sesiones</p>
            </div>

            {/* Sesiones */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sesiones</p>
              <div className="grid grid-cols-6 gap-1.5">
                {sessions.map(s => (
                  <div key={s.id} className="flex flex-col items-center gap-0.5" title={
                    s.status === 'used'
                      ? `Usada ${s.consumed_at ? formatDateTime(s.consumed_at) : ''}`
                      : s.status === 'expired' ? 'Expirada' : 'Disponible'
                  }>
                    <SessionDot status={s.status} />
                    <span className="text-[10px] text-gray-400">{s.session_number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Historial de sesiones usadas */}
            {sessions.filter(s => s.status === 'used').length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Historial</p>
                <div className="space-y-1.5">
                  {sessions.filter(s => s.status === 'used').map(s => (
                    <div key={s.id} className="flex items-center justify-between text-xs bg-brand-50 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />
                        <span className="font-medium text-gray-700">Sesión {s.session_number}</span>
                      </div>
                      <span className="text-gray-400">
                        {s.consumed_at ? formatDate(s.consumed_at) : '—'}
                        {s.appointment?.starts_at && ` · ${formatDateTime(s.appointment.starts_at)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info extra */}
            <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-3">
              {detailPkg.total_price && <MoneyDisplay amount={detailPkg.total_price} size="sm" />}
              {detailPkg.expires_at && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Vence: {formatDate(detailPkg.expires_at)}
                </p>
              )}
            </div>

            {/* Acción: usar sesión */}
            {detailPkg.status === 'active' && availableCount > 0 && (
              <Button
                className="w-full"
                loading={consuming}
                onClick={() => consumeSession(detailPkg)}
              >
                <CheckCircle2 className="w-4 h-4" />
                Registrar sesión usada
              </Button>
            )}

            {detailPkg.status === 'completed' && (
              <p className="text-center text-sm text-green-600 font-medium py-2">
                ✓ Paquete completado
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
