import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useState } from 'react'
import { Edit, Lock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const eventLabels = {
  appointment_confirmed:    'Confirmación de turno',
  appointment_reminder_24h: 'Recordatorio 24 horas',
  appointment_reminder_3h:  'Recordatorio 3 horas',
  appointment_cancelled:    'Cancelación',
  post_visit_followup:      'Follow-up post visita',
  birthday_greeting:        'Saludo de cumpleaños',
  client_inactive:          'Clienta inactiva',
}

const ENTERPRISE_EVENT_TYPES = [
  'appointment_reminder_24h',
  'appointment_reminder_3h',
  'birthday_greeting',
  'post_visit_followup',
  'client_inactive',
]

export function NotificationSettingsPage() {
  const { currentOrg } = useOrgContext()
  const isEnterprise = currentOrg?.subscription_plan === 'enterprise'
  const qc = useQueryClient()
  const [editTemplate, setEditTemplate] = useState(null)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['message_templates', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('event_type')
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrg?.id,
  })

  const { mutate: saveTemplate, isPending } = useMutation({
    mutationFn: async ({ id, ...data }) => {
      if (id) {
        const { error } = await supabase.from('message_templates').update(data).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('message_templates').insert({
          ...data,
          organization_id: currentOrg.id,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['message_templates'] })
      toast.success('Plantilla guardada')
      setEditTemplate(null)
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })

  const { register, handleSubmit, reset } = useForm()

  function openEdit(template) {
    setEditTemplate(template)
    reset(template)
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle className="mb-1">Plantillas de mensajes</CardTitle>
        <p className="text-sm text-gray-500 mb-4">
          Editá los mensajes automáticos. Usá {'{{variable}}'} para insertar datos dinámicos.
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map(template => {
              const isPremium = ENTERPRISE_EVENT_TYPES.includes(template.event_type)
              const locked = isPremium && !isEnterprise
              return (
                <div key={template.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl border ${locked ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        {eventLabels[template.event_type] || template.event_type}
                      </p>
                      <Badge color={template.channel === 'whatsapp' ? 'green' : 'blue'}>
                        {template.channel}
                      </Badge>
                      {isPremium ? (
                        <Badge color="purple">Enterprise</Badge>
                      ) : (
                        <Badge color={template.active ? 'green' : 'gray'}>
                          {template.active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{template.body?.slice(0, 100)}...</p>
                  </div>
                  {locked ? (
                    <div className="p-2 text-gray-300">
                      <Lock className="w-4 h-4" />
                    </div>
                  ) : (
                    <button onClick={() => openEdit(template)}
                      className="p-2 text-gray-400 hover:text-brand-600 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal open={!!editTemplate} onOpenChange={(o) => { if (!o) setEditTemplate(null) }}
        title="Editar plantilla" size="lg">
        {editTemplate && (
          <form onSubmit={handleSubmit(d => saveTemplate({ id: editTemplate.id, ...d }))} className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Evento</p>
              <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                {eventLabels[editTemplate.event_type] || editTemplate.event_type}
              </p>
            </div>
            {editTemplate.channel === 'email' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Asunto del email</label>
                <input className="input-base" {...register('subject')} />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Cuerpo del mensaje</label>
              <textarea className="input-base" rows={5} {...register('body')} />
              <p className="text-xs text-gray-400">
                Variables disponibles: {'{{client_name}}'}, {'{{appointment_date}}'}, {'{{appointment_time}}'},
                {'{{service_name}}'}, {'{{staff_name}}'}, {'{{org_name}}'}, {'{{branch_name}}'}, {'{{manage_url}}'}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => setEditTemplate(null)}>Cancelar</Button>
              <Button type="submit" loading={isPending}>Guardar</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
