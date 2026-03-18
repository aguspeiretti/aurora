import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCreateAppointment } from '../hooks/useAppointments'
import { useServices } from '@/features/services/hooks/useServices'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { useClients } from '@/features/clients/hooks/useClients'
import { useResources } from '@/features/resources/hooks/useResources'
import { useAuthContext } from '@/app/providers/AuthProvider'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { appointmentSchema } from '@/lib/validators/appointment'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatMoney } from '@/lib/formatters/money'
import { format, addMinutes, parseISO } from 'date-fns'

export function NewAppointmentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthContext()
  const { currentBranch } = useOrgContext()

  const defaultDate = searchParams.get('date')
    ? format(parseISO(searchParams.get('date')), "yyyy-MM-dd'T'HH:mm")
    : format(new Date(), "yyyy-MM-dd'T'HH:mm")

  const { mutate: createAppointment, isPending } = useCreateAppointment()
  const { data: services = [] } = useServices()
  const { data: staffList = [] } = useStaff()
  const { data: clientsData } = useClients()
  const { data: resources = [] } = useResources()
  const clients = clientsData?.data || []

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      branch_id: currentBranch?.id || '',
      starts_at: defaultDate,
      source: 'manual',
      services: [{ service_id: '', duration_minutes: 60, price: 0, sort_order: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'services' })
  const watchedServices = watch('services')
  const totalPrice = watchedServices.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0)

  function onServiceChange(index, serviceId) {
    const service = services.find(s => s.id === serviceId)
    if (service) {
      setValue(`services.${index}.duration_minutes`, service.duration_minutes)
      setValue(`services.${index}.price`, service.price)
    }
  }

  function onSubmit(data) {
    // Calcular ends_at basado en la duración total
    const totalMinutes = watchedServices.reduce((sum, s) => sum + (parseInt(s.duration_minutes) || 0), 0)
    const startsAt = new Date(data.starts_at)
    const endsAt = addMinutes(startsAt, totalMinutes)

    createAppointment({
      ...data,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      total_price: totalPrice,
      created_by: user.id,
    }, {
      onSuccess: (appt) => navigate(`/app/agenda/${appt.id}`),
    })
  }

  return (
    <div className="page-container max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/app/agenda')}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Nuevo turno</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Clienta */}
        <Card>
          <CardTitle className="mb-4">Clienta</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Clienta</label>
              <select
                className="input-base"
                {...register('client_id')}
              >
                <option value="">Sin clienta asociada</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Fuente</label>
              <select className="input-base" {...register('source')}>
                <option value="manual">Manual</option>
                <option value="phone">Teléfono</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Fecha y hora */}
        <Card>
          <CardTitle className="mb-4">Fecha y hora</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Fecha y hora de inicio"
              type="datetime-local"
              error={errors.starts_at?.message}
              required
              {...register('starts_at')}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Profesional principal</label>
              <select className="input-base" {...register('primary_staff_id')}>
                <option value="">Sin asignar</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.display_name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Servicios */}
        <Card>
          <CardHeader action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => append({ service_id: '', duration_minutes: 60, price: 0, sort_order: fields.length })}
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </Button>
          }>
            <CardTitle>Servicios</CardTitle>
          </CardHeader>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5 flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Servicio</label>
                  <select
                    className="input-base"
                    {...register(`services.${index}.service_id`)}
                    onChange={(e) => {
                      register(`services.${index}.service_id`).onChange(e)
                      onServiceChange(index, e.target.value)
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {errors.services?.[index]?.service_id && (
                    <p className="text-xs text-red-600">{errors.services[index].service_id.message}</p>
                  )}
                </div>

                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Min</label>
                  <input
                    type="number"
                    min={5}
                    className="input-base"
                    {...register(`services.${index}.duration_minutes`, { valueAsNumber: true })}
                  />
                </div>

                <div className="col-span-3 flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Precio</label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    className="input-base"
                    {...register(`services.${index}.price`, { valueAsNumber: true })}
                  />
                </div>

                <div className="col-span-2 flex justify-end">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {errors.services?.message && (
              <p className="text-xs text-red-600">{errors.services.message}</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <p className="text-sm">
              Total: <span className="font-bold text-lg text-gray-900">{formatMoney(totalPrice)}</span>
            </p>
          </div>
        </Card>

        {/* Notas */}
        <Card>
          <CardTitle className="mb-4">Notas</CardTitle>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Notas para la clienta</label>
              <textarea
                className="input-base resize-none"
                rows={2}
                placeholder="Indicaciones especiales, preparación, etc."
                {...register('notes')}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Notas internas</label>
              <textarea
                className="input-base resize-none"
                rows={2}
                placeholder="Solo visibles para el equipo..."
                {...register('internal_notes')}
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/app/agenda')}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={isPending}>
            Crear turno
          </Button>
        </div>
      </form>
    </div>
  )
}
