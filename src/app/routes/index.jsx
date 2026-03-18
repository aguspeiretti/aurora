import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'

// Auth
import { LoginPage } from '@/features/auth/pages/LoginPage'

// App pages
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { AgendaPage } from '@/features/appointments/pages/AgendaPage'
import { NewAppointmentPage } from '@/features/appointments/pages/NewAppointmentPage'
import { AppointmentDetailPage } from '@/features/appointments/pages/AppointmentDetailPage'
import { ClientsPage } from '@/features/clients/pages/ClientsPage'
import { ClientDetailPage } from '@/features/clients/pages/ClientDetailPage'
import { StaffPage } from '@/features/staff/pages/StaffPage'
import { ServicesPage } from '@/features/services/pages/ServicesPage'
import { ResourcesPage } from '@/features/resources/pages/ResourcesPage'
import { SalesPage } from '@/features/sales/pages/SalesPage'
import { NewSalePage } from '@/features/sales/pages/NewSalePage'
import { CashPage } from '@/features/sales/pages/CashPage'
import { ProductsPage } from '@/features/inventory/pages/ProductsPage'
import { InventoryPage } from '@/features/inventory/pages/InventoryPage'
import { PackagesPage } from '@/features/packages/pages/PackagesPage'
import { GiftCardsPage } from '@/features/giftcards/pages/GiftCardsPage'
import { CampaignsPage } from '@/features/campaigns/pages/CampaignsPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { GeneralSettingsPage } from '@/features/settings/pages/GeneralSettingsPage'
import { BrandingSettingsPage } from '@/features/settings/pages/BrandingSettingsPage'
import { NotificationSettingsPage } from '@/features/settings/pages/NotificationSettingsPage'
import { UsersSettingsPage } from '@/features/settings/pages/UsersSettingsPage'
import { BranchesSettingsPage } from '@/features/settings/pages/BranchesSettingsPage'

// Public
import { PublicBookingPage } from '@/features/public-booking/pages/PublicBookingPage'
import { BookingConfirmPage } from '@/features/public-booking/pages/BookingConfirmPage'
import { ManageBookingPage } from '@/features/public-booking/pages/ManageBookingPage'

// Platform admin
import { AdminLayout } from '../layouts/AdminLayout'
import { AdminOrganizationsPage } from '@/features/platform-admin/pages/AdminOrganizationsPage'
import { AdminOrgDetailPage } from '@/features/platform-admin/pages/AdminOrgDetailPage'

export const router = createBrowserRouter([
  // Auth routes
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },

  // App routes
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },

      // Agenda
      { path: 'agenda', element: <AgendaPage /> },
      { path: 'agenda/new', element: <NewAppointmentPage /> },
      { path: 'agenda/:id', element: <AppointmentDetailPage /> },

      // Clientes
      { path: 'clients', element: <ClientsPage /> },
      { path: 'clients/:id', element: <ClientDetailPage /> },

      // Staff
      { path: 'staff', element: <StaffPage /> },

      // Servicios
      { path: 'services', element: <ServicesPage /> },

      // Recursos
      { path: 'resources', element: <ResourcesPage /> },

      // Ventas / POS
      { path: 'sales', element: <SalesPage /> },
      { path: 'sales/new', element: <NewSalePage /> },
      { path: 'cash', element: <CashPage /> },

      // Productos / Inventario
      { path: 'products', element: <ProductsPage /> },
      { path: 'inventory', element: <InventoryPage /> },

      // Paquetes
      { path: 'packages', element: <PackagesPage /> },

      // Gift cards
      { path: 'gift-cards', element: <GiftCardsPage /> },

      // Campañas
      { path: 'campaigns', element: <CampaignsPage /> },

      // Reportes
      { path: 'reports', element: <ReportsPage /> },

      // Configuración
      {
        path: 'settings',
        element: <SettingsPage />,
        children: [
          { index: true, element: <GeneralSettingsPage /> },
          { path: 'general', element: <GeneralSettingsPage /> },
          { path: 'branding', element: <BrandingSettingsPage /> },
          { path: 'notifications', element: <NotificationSettingsPage /> },
          { path: 'users', element: <UsersSettingsPage /> },
          { path: 'branches', element: <BranchesSettingsPage /> },
        ],
      },
    ],
  },

  // Public booking
  { path: '/book/:orgSlug', element: <PublicBookingPage /> },
  { path: '/book/:orgSlug/:branchSlug', element: <PublicBookingPage /> },
  { path: '/book/:orgSlug/:branchSlug/confirm', element: <BookingConfirmPage /> },
  { path: '/manage-booking/:token', element: <ManageBookingPage /> },

  // Platform admin routes
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/organizations" replace /> },
      { path: 'organizations', element: <AdminOrganizationsPage /> },
      { path: 'organizations/:id', element: <AdminOrgDetailPage /> },
    ],
  },

  // Redirect root
  { path: '/', element: <Navigate to="/login" replace /> },
])
