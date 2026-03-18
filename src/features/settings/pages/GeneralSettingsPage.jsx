import { useForm } from 'react-hook-form'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { supabase } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardTitle } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import { useState } from 'react'

export function GeneralSettingsPage() {
  const { currentOrg, refetch } = useOrgContext()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: currentOrg?.name || '',
      phone: currentOrg?.phone || '',
      email: currentOrg?.email || '',
      website: currentOrg?.website || '',
      instagram_handle: currentOrg?.instagram_handle || '',
      timezone: currentOrg?.timezone || 'America/Argentina/Buenos_Aires',
      currency: currentOrg?.currency || 'ARS',
      cancellation_policy_hours: currentOrg?.cancellation_policy_hours || 24,
      booking_advance_days: currentOrg?.booking_advance_days || 60,
      min_booking_notice_hours: currentOrg?.min_booking_notice_hours || 2,
    },
  })

  async function onSubmit(data) {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', currentOrg.id)
      if (error) throw error
      toast.success('Configuración guardada')
      refetch?.()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card>
        <CardTitle className="mb-4">Información del negocio</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Nombre del negocio" required {...register('name')} />
          </div>
          <Input label="Teléfono" {...register('phone')} />
          <Input label="Email" type="email" {...register('email')} />
          <Input label="Sitio web" type="url" {...register('website')} />
          <Input label="Instagram" placeholder="@tunegocio" {...register('instagram_handle')} />
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-4">Configuración regional</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Zona horaria</label>
            <select className="input-base" {...register('timezone')}>
              <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC-3)</option>
              <option value="America/Bogota">Bogotá (UTC-5)</option>
              <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
              <option value="America/Lima">Lima (UTC-5)</option>
              <option value="America/Santiago">Santiago (UTC-3)</option>
              <option value="Europe/Madrid">Madrid (UTC+1)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Moneda</label>
            <select className="input-base" {...register('currency')}>
              <option value="ARS">ARS — Peso Argentino</option>
              <option value="CLP">CLP — Peso Chileno</option>
              <option value="COP">COP — Peso Colombiano</option>
              <option value="MXN">MXN — Peso Mexicano</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-4">Política de reservas</CardTitle>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Horas mínimas de aviso"
            type="number"
            min={0}
            hint="Horas mínimas antes de reservar"
            {...register('min_booking_notice_hours', { valueAsNumber: true })}
          />
          <Input
            label="Días máximos de anticipación"
            type="number"
            min={1}
            {...register('booking_advance_days', { valueAsNumber: true })}
          />
          <Input
            label="Horas política de cancelación"
            type="number"
            min={0}
            hint="Cuántas horas antes puede cancelar la clienta"
            {...register('cancellation_policy_hours', { valueAsNumber: true })}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>Guardar cambios</Button>
      </div>
    </form>
  )
}
