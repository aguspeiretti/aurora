import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { useAuthContext } from '@/app/providers/AuthProvider'
import { Megaphone, Plus, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'
import { formatDate } from '@/lib/formatters/dates'
import toast from 'react-hot-toast'

const campaignStatusColors = {
  draft: 'gray', scheduled: 'blue', running: 'brand', completed: 'green', cancelled: 'red',
}

export function CampaignsPage() {
  const { currentOrg } = useOrgContext()
  const { user } = useAuthContext()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)

  const isEnterprise = currentOrg?.subscription_plan === 'enterprise'

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, created_by_profile:profiles!created_by(full_name)')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrg?.id && isEnterprise,
  })

  const { mutate: createCampaign, isPending } = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('campaigns').insert({
        ...data,
        organization_id: currentOrg.id,
        created_by: user.id,
        status: 'draft',
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaña creada')
      setFormOpen(false)
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })

  const { register, handleSubmit } = useForm({
    defaultValues: { channel: 'whatsapp', audience_type: 'all_active' },
  })

  if (!isEnterprise) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Campañas — Plan Enterprise</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            Las campañas de marketing están disponibles en el plan Enterprise.
            Contactá al administrador de la plataforma para actualizar tu plan.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Campañas</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Nueva campaña
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-20" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="Sin campañas"
          description="Creá tu primera campaña de comunicación con clientas."
          action={<Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />Nueva</Button>}
        />
      ) : (
        <div className="space-y-3">
          {campaigns.map(camp => (
            <div key={camp.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{camp.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {camp.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} ·
                    {camp.audience_type === 'all_active' && ' Todas las clientas activas'}
                    {camp.audience_type === 'inactive' && ' Clientas inactivas'}
                    {camp.audience_type === 'birthday_month' && ' Cumpleañeras del mes'}
                  </p>
                </div>
                <Badge color={campaignStatusColors[camp.status] || 'gray'}>
                  {camp.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span>Por: {camp.created_by_profile?.full_name}</span>
                <span>{formatDate(camp.created_at)}</span>
                {camp.sent_count > 0 && (
                  <span className="text-emerald-600">{camp.sent_count} enviados</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={formOpen} onOpenChange={setFormOpen} title="Nueva campaña">
        <form onSubmit={handleSubmit(createCampaign)} className="space-y-4">
          <Input label="Nombre" required {...register('name')} />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Canal</label>
              <select className="input-base" {...register('channel')}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Audiencia</label>
              <select className="input-base" {...register('audience_type')}>
                <option value="all_active">Todas las clientas activas</option>
                <option value="inactive">Clientas inactivas</option>
                <option value="birthday_month">Cumpleañeras del mes</option>
                <option value="no_upcoming_booking">Sin próxima reserva</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Mensaje</label>
            <textarea className="input-base" rows={3}
              placeholder="Hola {{client_name}}, ..."
              {...register('custom_message')} />
          </div>
          <Input label="Programar para (opcional)" type="datetime-local" {...register('scheduled_for')} />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={isPending}>Crear campaña</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
