import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clientSchema } from '@/lib/validators/client'
import { useCreateClient, useUpdateClient } from '../hooks/useClients'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import * as Checkbox from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'

export function ClientForm({ client, onSuccess, onCancel }) {
  const { mutate: createClient, isPending: creating } = useCreateClient()
  const { mutate: updateClient, isPending: updating } = useUpdateClient()
  const isPending = creating || updating

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: client || {
      marketing_opt_in_email: false,
      marketing_opt_in_whatsapp: false,
    },
  })

  function onSubmit(data) {
    if (client) {
      updateClient({ id: client.id, ...data }, { onSuccess })
    } else {
      createClient(data, { onSuccess })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nombre completo"
          placeholder="María González"
          error={errors.full_name?.message}
          required
          {...register('full_name')}
        />
        <Input
          label="Teléfono"
          type="tel"
          placeholder="+54 11 9999-0000"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="maria@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Fecha de nacimiento"
          type="date"
          error={errors.birthday?.message}
          {...register('birthday')}
        />
      </div>

      <Input
        label="Instagram"
        placeholder="@mariagonzalez"
        {...register('instagram_handle')}
      />

      {/* Observaciones */}
      <Textarea
        label="Notas"
        placeholder="Observaciones, preferencias, etc."
        {...register('notes')}
        rows={2}
      />

      {/* Alergias / contraindicaciones */}
      <div className="grid grid-cols-2 gap-4">
        <Textarea
          label="Alergias / sensibilidades"
          placeholder="Latex, fragancias, etc."
          {...register('allergies')}
          rows={2}
        />
        <Textarea
          label="Contraindicaciones"
          placeholder="Condiciones a tener en cuenta"
          {...register('contraindications')}
          rows={2}
        />
      </div>

      {/* Consentimientos */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Consentimientos de marketing</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox.Root
            checked={watch('marketing_opt_in_whatsapp')}
            onCheckedChange={(v) => setValue('marketing_opt_in_whatsapp', v)}
            className="w-4 h-4 border-2 border-gray-300 rounded data-[state=checked]:bg-brand-600 data-[state=checked]:border-brand-600 flex items-center justify-center"
          >
            <Checkbox.Indicator>
              <Check className="w-3 h-3 text-white" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <span className="text-sm text-gray-600">Acepta mensajes por WhatsApp</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox.Root
            checked={watch('marketing_opt_in_email')}
            onCheckedChange={(v) => setValue('marketing_opt_in_email', v)}
            className="w-4 h-4 border-2 border-gray-300 rounded data-[state=checked]:bg-brand-600 data-[state=checked]:border-brand-600 flex items-center justify-center"
          >
            <Checkbox.Indicator>
              <Check className="w-3 h-3 text-white" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <span className="text-sm text-gray-600">Acepta emails de marketing</span>
        </label>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isPending}>
          {client ? 'Guardar cambios' : 'Crear clienta'}
        </Button>
      </div>
    </form>
  )
}
