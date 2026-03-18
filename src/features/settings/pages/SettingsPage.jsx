import { NavLink, Outlet } from 'react-router-dom'
import { Settings, Palette, Bell, Plug, Users, Building2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const settingsNav = [
  { to: '/app/settings/general',       label: 'General',         icon: Settings },
  { to: '/app/settings/branding',      label: 'Marca y estilo',  icon: Palette },
  { to: '/app/settings/notifications', label: 'Notificaciones',  icon: Bell },
  { to: '/app/settings/branches',      label: 'Sucursales',      icon: Building2 },
  { to: '/app/settings/users',         label: 'Usuarios',        icon: Users },
]

export function SettingsPage() {
  return (
    <div className="page-container">
      <h1 className="text-xl font-bold text-gray-900 mb-5">Configuración</h1>
      <div className="flex gap-6">
        {/* Sidebar nav */}
        <aside className="w-48 shrink-0">
          <nav className="space-y-0.5">
            {settingsNav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
