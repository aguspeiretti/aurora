import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'
import { Building2, Plus, Edit, MapPin, Phone, Link, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

function CopyLinkButton({ url }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado' : 'Copiar link'}
    </button>
  )
}

export function BranchesSettingsPage() {
  const { currentOrg, userRole } = useOrgContext()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches_settings', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrg?.id,
  })

  const { mutate: saveBranch, isPending } = useMutation({
    mutationFn: async ({ id, ...data }) => {
      if (id) {
        const { error } = await supabase.from('branches').update(data).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('branches').insert({
          ...data,
          organization_id: currentOrg.id,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches_settings'] })
      qc.invalidateQueries({ queryKey: ['branches'] })
      toast.success(editTarget ? 'Sucursal actualizada' : 'Sucursal creada')
      closeForm()
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })

  const { register, handleSubmit, reset } = useForm()

  function openCreate() {
    setEditTarget(null)
    reset({
      name: '',
      address: '',
      phone: '',
      email: '',
      slug: '',
      active: true,
      online_booking_enabled: true,
    })
    setFormOpen(true)
  }

  function openEdit(branch) {
    setEditTarget(branch)
    reset(branch)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditTarget(null)
  }

  const canManage = userRole === 'owner' || userRole === 'manager'

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="mb-1">Sucursales</CardTitle>
            <p className="text-sm text-gray-500">
              Gestioná las sedes de tu organización. Cada sucursal tiene su propio portal de reservas.
            </p>
          </div>
          {canManage && (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Nueva sucursal
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {branches.map(branch => (
              <div key={branch.id}
                className="flex items-start justify-between gap-3 p-4 rounded-xl border border-gray-100 hover:bg-gray-50">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-gray-900">{branch.name}</p>
                      <Badge color={branch.active ? 'green' : 'gray'}>
                        {branch.active ? 'Activa' : 'Inactiva'}
                      </Badge>
                      {branch.online_booking_enabled && (
                        <Badge color="blue">Reservas online</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {branch.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {branch.address}
                        </span>
                      )}
                      {branch.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {branch.phone}
                        </span>
                      )}
                    </div>
                    {branch.online_booking_enabled && branch.slug && currentOrg?.slug && (() => {
                      const url = `${window.location.origin}/book/${currentOrg.slug}/${branch.slug}`
                      return (
                        <div className="mt-2 flex items-center gap-2 p-2 bg-brand-50 rounded-lg border border-brand-100">
                          <Link className="w-3 h-3 text-brand-500 shrink-0" />
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-brand-700 font-mono truncate hover:underline flex-1">
                            {url}
                          </a>
                          <CopyLinkButton url={url} />
                        </div>
                      )
                    })()}
                  </div>
                </div>
                {canManage && (
                  <button onClick={() => openEdit(branch)}
                    className="p-2 text-gray-400 hover:text-brand-600 rounded-lg shrink-0">
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={formOpen}
        onOpenChange={(o) => { if (!o) closeForm() }}
        title={editTarget ? 'Editar sucursal' : 'Nueva sucursal'}
        size="lg"
      >
        <form onSubmit={handleSubmit(d => saveBranch({ id: editTarget?.id, ...d }))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nombre de la sucursal" required {...register('name')} />
            </div>
            <Input label="Dirección" {...register('address')} />
            <Input label="Teléfono" {...register('phone')} />
            <Input label="Email" type="email" {...register('email')} />
            <div className="flex flex-col gap-1">
              <Input
                label="Slug (URL de reservas)"
                placeholder="palermo"
                hint="Solo letras minúsculas, números y guiones"
                {...register('slug')}
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded" {...register('active')} />
              <span className="text-sm font-medium text-gray-700">Sucursal activa</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded" {...register('online_booking_enabled')} />
              <span className="text-sm font-medium text-gray-700">Reservas online habilitadas</span>
            </label>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={closeForm}>Cancelar</Button>
            <Button type="submit" loading={isPending}>
              {editTarget ? 'Guardar cambios' : 'Crear sucursal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
