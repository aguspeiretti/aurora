import { Outlet, Navigate, NavLink } from 'react-router-dom'
import { useAuthContext } from '../providers/AuthProvider'
import { LayoutGrid, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export function AdminLayout() {
  const { user, profile, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-10 h-10 rounded-2xl animate-pulse" style={{ background: 'linear-gradient(135deg, #a87030, #2d7a5f)' }} />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!profile?.is_super_admin) return <Navigate to="/app/dashboard" replace />

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar admin */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #a87030, #2d7a5f)' }}
            >
              <span className="text-white font-serif font-bold text-sm">A</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight font-serif">Aurora</p>
              <p className="text-xs" style={{ color: '#C9A96E' }}>Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink
            to="/admin/organizations"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
            style={({ isActive }) => isActive ? { background: '#a87030' } : {}}
          >
            <LayoutGrid size={16} />
            Centros
          </NavLink>
        </nav>

        <div className="px-3 py-4 border-t border-gray-800">
          <div className="px-3 py-2 mb-2">
            <p className="text-gray-500 text-xs truncate">{profile?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
