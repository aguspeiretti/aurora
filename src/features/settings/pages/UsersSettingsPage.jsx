import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { useAuthContext } from '@/app/providers/AuthProvider'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useForm } from 'react-hook-form'
import { ROLES, ROLE_LABELS } from '@/lib/constants/roles'
import { UserPlus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const roleColors = {
  owner: 'brand',
  manager: 'blue',
  receptionist: 'green',
  technician: 'orange',
  cashier: 'yellow',
}

export function UsersSettingsPage() {
  const { currentOrg, userRole } = useOrgContext()
  const { user } = useAuthContext()
  const qc = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['org_users', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_users')
        .select('*, profile:profiles(id, full_name, email, avatar_url)')
        .eq('organization_id', currentOrg.id)
        .order('created_at')
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrg?.id,
  })

  const { mutate: inviteUser, isPending: isInviting } = useMutation({
    mutationFn: async ({ email, role }) => {
      // Look up profile by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()
      if (profileError || !profile) throw new Error('No existe un usuario con ese email')

      const { error } = await supabase.from('organization_users').insert({
        organization_id: currentOrg.id,
        profile_id: profile.id,
        role,
      })
      if (error) {
        if (error.code === '23505') throw new Error('Este usuario ya es miembro')
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org_users'] })
      toast.success('Usuario agregado')
      setInviteOpen(false)
      reset()
    },
    onError: (err) => toast.error(err.message),
  })

  const { mutate: updateRole } = useMutation({
    mutationFn: async ({ memberId, role }) => {
      const { error } = await supabase
        .from('organization_users')
        .update({ role })
        .eq('id', memberId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org_users'] })
      toast.success('Rol actualizado')
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })

  const { mutate: removeMember, isPending: isRemoving } = useMutation({
    mutationFn: async (memberId) => {
      const { error } = await supabase
        .from('organization_users')
        .delete()
        .eq('id', memberId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org_users'] })
      toast.success('Usuario removido')
      setRemoveTarget(null)
    },
    onError: (err) => toast.error('Error: ' + err.message),
  })

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { role: ROLES.RECEPTIONIST },
  })

  const canManage = userRole === ROLES.OWNER || userRole === ROLES.MANAGER

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="mb-1">Usuarios de la organización</CardTitle>
            <p className="text-sm text-gray-500">Gestioná quién tiene acceso y con qué rol.</p>
          </div>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-4 h-4" />
              Agregar usuario
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(member => {
              const isCurrentUser = member.profile_id === user?.id
              const isOwner = member.role === ROLES.OWNER
              return (
                <div key={member.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
                      {member.profile?.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {member.profile?.full_name}
                        {isCurrentUser && <span className="ml-2 text-xs text-gray-400">(vos)</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{member.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canManage && !isOwner && !isCurrentUser ? (
                      <select
                        className="input-base text-xs py-1 px-2 h-auto"
                        value={member.role}
                        onChange={(e) => updateRole({ memberId: member.id, role: e.target.value })}
                      >
                        {Object.entries(ROLE_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      <Badge color={roleColors[member.role] || 'gray'}>
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    )}
                    {canManage && !isOwner && !isCurrentUser && (
                      <button
                        onClick={() => setRemoveTarget(member)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Invite modal */}
      <Modal open={inviteOpen} onOpenChange={setInviteOpen} title="Agregar usuario">
        <form onSubmit={handleSubmit(inviteUser)} className="space-y-4">
          <Input
            label="Email del usuario"
            type="email"
            required
            placeholder="usuario@ejemplo.com"
            hint="El usuario debe tener una cuenta en Aurora"
            {...register('email')}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Rol</label>
            <select className="input-base" {...register('role')}>
              {Object.entries(ROLE_LABELS)
                .filter(([val]) => val !== ROLES.OWNER)
                .map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={isInviting}>Agregar</Button>
          </div>
        </form>
      </Modal>

      {/* Remove confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => { if (!o) setRemoveTarget(null) }}
        title="Remover usuario"
        description={`¿Removés a ${removeTarget?.profile?.full_name} de la organización? Perderá acceso inmediatamente.`}
        confirmLabel="Remover"
        variant="danger"
        loading={isRemoving}
        onConfirm={() => removeMember(removeTarget.id)}
      />
    </div>
  )
}
