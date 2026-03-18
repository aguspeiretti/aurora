import { Menu, Plus, ExternalLink, Link2, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BranchSwitcher } from './BranchSwitcher'
import { useLocation, useNavigate } from 'react-router-dom'
import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { useState } from 'react'

const pageTitles = {
  '/app/dashboard': 'Dashboard',
  '/app/agenda':    'Agenda',
  '/app/clients':   'Clientas',
  '/app/staff':     'Profesionales',
  '/app/services':  'Servicios',
  '/app/resources': 'Recursos',
  '/app/sales':     'Ventas',
  '/app/cash':      'Caja',
  '/app/packages':  'Paquetes',
  '/app/gift-cards':'Gift Cards',
  '/app/products':  'Productos',
  '/app/inventory': 'Inventario',
  '/app/campaigns': 'Campañas',
  '/app/reports':   'Reportes',
  '/app/settings':  'Configuración',
}

export function Topbar({ onMenuClick }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentOrg, currentBranch } = useOrgContext()
  const title = pageTitles[location.pathname] || ''

  const [copied, setCopied] = useState(false)

  const bookingUrl = currentOrg?.slug && currentBranch?.slug
    ? `/book/${currentOrg.slug}/${currentBranch.slug}`
    : null

  function copyBookingLink() {
    const fullUrl = `${window.location.origin}${bookingUrl}`
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-white/80 backdrop-blur-sm border-b border-gray-100 gap-3">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <h1 className="text-base font-semibold text-gray-900 flex-1 truncate hidden sm:block">
        {title}
      </h1>

      <div className="flex items-center gap-2 ml-auto">
        <BranchSwitcher />

        {/* Portal cliente */}
        {bookingUrl && (
          <div className="hidden sm:flex items-center rounded-xl border border-gray-200 overflow-hidden">
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-600 px-2.5 py-1.5 hover:bg-gray-50 transition-colors border-r border-gray-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver portal
            </a>
            <button
              onClick={copyBookingLink}
              title="Copiar link para clientes"
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 transition-colors hover:bg-gray-50"
              style={{ color: copied ? '#16a34a' : '#6b7280' }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        )}

        {/* Quick action */}
        <Button
          size="sm"
          onClick={() => navigate('/app/agenda/new')}
          className="hidden sm:flex"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo turno
        </Button>

        {/* Notificaciones en tiempo real */}
        <NotificationBell />
      </div>
    </header>
  )
}
