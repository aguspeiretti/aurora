import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { serviceSchema } from '@/lib/validators/service'
import { useCreateService, useUpdateService } from '../hooks/useServices'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SERVICE_CATEGORY_LABELS } from '@/lib/constants/serviceCategories'
import * as Switch from '@radix-ui/react-switch'

export function ServiceForm({ service, categories = [], onSuccess, onCancel }) {
  const { mutate: createService, isPending: creating } = useCreateService()
  const { mutate: updateService, isPending: updating } = useUpdateService()
  const isPending = creating || updating

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: service || {
      service_type: 'other',
      duration_minutes: 60,
      buffer_before_minutes: 0,
      buffer_after_minutes: 0,
      price: 0,
      requires_staff: true,
      requires_resource: false,
      online_booking_enabled: true,
      deposit_required: false,
      deposit_type: 'percentage',
      deposit_value: 30,
      active: true,
    },
  })

  function onSubmit(data) {
    if (service) {
      updateService({ id: service.id, ...data }, { onSuccess })
    } else {
      createService(data, { onSuccess })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Nombre" required error={errors.name?.message} {...register('name')} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Categoría</label>
          <select className="input-base" {...register('category_id')}>
            <option value="">Sin categoría</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Tipo de servicio</label>
          <select className="input-base" {...register('service_type')}>
            {Object.entries(SERVICE_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <Textarea label="Descripción" rows={2} {...register('description')} />

      <div className="grid grid-cols-3 gap-4">
        <Input label="Duración (min)" type="number" min={5} required
          error={errors.duration_minutes?.message}
          {...register('duration_minutes', { valueAsNumber: true })} />
        <Input label="Buffer antes (min)" type="number" min={0}
          {...register('buffer_before_minutes', { valueAsNumber: true })} />
        <Input label="Buffer después (min)" type="number" min={0}
          {...register('buffer_after_minutes', { valueAsNumber: true })} />
      </div>

      <Input label="Precio" type="number" min={0} step={50} required
        error={errors.price?.message}
        {...register('price', { valueAsNumber: true })} />

      {/* Toggles */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { key: 'online_booking_enabled', label: 'Reserva online habilitada' },
          { key: 'deposit_required', label: 'Requiere seña' },
          { key: 'requires_staff', label: 'Requiere profesional' },
          { key: 'requires_resource', label: 'Requiere recurso' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl cursor-pointer">
            <span className="text-sm text-gray-700">{label}</span>
            <Switch.Root
              checked={watch(key)}
              onCheckedChange={v => setValue(key, v)}
              className="w-10 h-5 rounded-full bg-gray-300 data-[state=checked]:bg-brand-600 transition-colors relative"
            >
              <Switch.Thumb className="w-4 h-4 rounded-full bg-white shadow-sm block transition-transform data-[state=checked]:translate-x-5 translate-x-0.5" />
            </Switch.Root>
          </label>
        ))}
      </div>

      <Input label="Días sugeridos para próxima visita" type="number" min={1}
        hint="Ej: 21 para uñas, 30 para depilación"
        {...register('default_rebooking_days', { valueAsNumber: true })} />

      <Textarea label="Notas pre-servicio" rows={2}
        placeholder="Indicaciones para la clienta antes del servicio"
        {...register('pre_service_notes')} />

      <Textarea label="Contraindicaciones" rows={2}
        placeholder="Condiciones que contraindican el servicio"
        {...register('contraindications')} />

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={isPending}>
          {service ? 'Guardar cambios' : 'Crear servicio'}
        </Button>
      </div>
    </form>
  )
}
