import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, Scissors, Package,
  ShoppingCart, BarChart2, Settings, ChevronRight, LogOut,
  Boxes, CreditCard, Gift, Megaphone, Wrench, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { useAuthContext } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { ROLES } from '@/lib/constants/roles'

const navigation = [
  {
    label: 'Principal',
    items: [
      { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/app/agenda',    label: 'Agenda',    icon: Calendar },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { to: '/app/clients',   label: 'Clientas', icon: Users },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/app/sales',     label: 'Ventas',      icon: ShoppingCart },
      { to: '/app/cash',      label: 'Caja',         icon: CreditCard },
      { to: '/app/packages',  label: 'Paquetes',    icon: Package },
      { to: '/app/gift-cards',label: 'Gift Cards',  icon: Gift },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { to: '/app/services',  label: 'Servicios',   icon: Scissors },
      { to: '/app/staff',     label: 'Profesionales', icon: Wrench },
      { to: '/app/resources', label: 'Recursos',    icon: Building2 },
      { to: '/app/products',  label: 'Productos',   icon: Boxes },
      { to: '/app/inventory', label: 'Inventario',  icon: Boxes, hidden: true },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { to: '/app/campaigns', label: 'Campañas',    icon: Megaphone },
    ],
    minRole: ROLES.MANAGER,
  },
  {
    label: 'Reportes',
    items: [
      { to: '/app/reports',   label: 'Reportes',    icon: BarChart2 },
    ],
    minRole: ROLES.MANAGER,
  },
]

export function Sidebar({ onClose }) {
  const { currentOrg, currentBranch } = useOrgContext()
  const { profile } = useAuthContext()
  const location = useLocation()

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <aside className="flex flex-col h-full bg-white border-r border-gray-100 w-64">
      {/* Logo / Brand */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          {currentOrg?.logo_url ? (
            <img
              src={currentOrg.logo_url}
              alt={currentOrg.name}
              className="w-8 h-8 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))` }}
            >
              <span className="text-white text-xs font-bold">
                {currentOrg?.name?.[0]?.toUpperCase() || 'B'}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {currentOrg?.name || 'Aurora'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {currentBranch?.name || 'Cargando...'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navigation.map((section) => (
          <div key={section.label}>
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.filter(i => !i.hidden).map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all',
                        isActive
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Settings + User */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-0.5">
        <NavLink
          to="/app/settings"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )
          }
        >
          <Settings className="w-4 h-4 shrink-0" />
          Configuración
        </NavLink>

        <div className="flex items-center gap-2.5 px-2.5 py-2 mt-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #a87030, #c4856a)' }}>
            <span className="text-white text-xs font-bold">
              {profile?.full_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{profile?.full_name}</p>
            <p className="text-[10px] text-gray-400 truncate">{profile?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
