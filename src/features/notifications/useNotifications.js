import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useOrgContext } from '@/app/providers/OrganizationProvider'

const PAGE_SIZE = 20

export function useNotifications() {
  const { currentOrg } = useOrgContext()
  const orgId = currentOrg?.id

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!orgId) return

    let cancelled = false

    // Carga inicial
    async function fetchNotifications() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('app_notifications')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE)

        if (error) throw error
        if (cancelled) return

        const list = data ?? []
        setNotifications(list)
        setUnreadCount(list.filter(n => !n.read).length)
      } catch (err) {
        // La tabla puede no existir aún (migración pendiente)
        console.warn('[useNotifications] Error al cargar notificaciones:', err?.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchNotifications()

    // Suscripción realtime
    try {
      const channel = supabase
        .channel(`app_notifications:org:${orgId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'app_notifications',
            filter: `organization_id=eq.${orgId}`,
          },
          payload => {
            if (cancelled) return
            setNotifications(prev => [payload.new, ...prev].slice(0, PAGE_SIZE))
            setUnreadCount(prev => prev + 1)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'app_notifications',
            filter: `organization_id=eq.${orgId}`,
          },
          payload => {
            if (cancelled) return
            setNotifications(prev =>
              prev.map(n => (n.id === payload.new.id ? payload.new : n))
            )
            if (payload.new.read && !payload.old.read) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          }
        )
        .subscribe()

      channelRef.current = channel
    } catch (err) {
      console.warn('[useNotifications] Error al suscribirse a realtime:', err?.message)
    }

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [orgId])

  async function markAsRead(id) {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount(prev => Math.max(0, prev - 1))
    try {
      await supabase.from('app_notifications').update({ read: true }).eq('id', id)
    } catch {/* silently ignore */}
  }

  async function markAllAsRead() {
    if (!orgId) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await supabase
        .from('app_notifications')
        .update({ read: true })
        .eq('organization_id', orgId)
        .eq('read', false)
    } catch {/* silently ignore */}
  }

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead }
}
