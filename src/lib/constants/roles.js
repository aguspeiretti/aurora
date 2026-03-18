export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  RECEPTIONIST: 'receptionist',
  TECHNICIAN: 'technician',
  CASHIER: 'cashier',
}

export const ROLE_LABELS = {
  owner: 'Propietario',
  manager: 'Gerente',
  receptionist: 'Recepcionista',
  technician: 'Técnico/a',
  cashier: 'Cajero/a',
}

export const ROLE_HIERARCHY = {
  owner: 5,
  manager: 4,
  receptionist: 3,
  cashier: 2,
  technician: 1,
}

// Permisos por módulo
export const PERMISSIONS = {
  // Agenda
  'agenda.view': ['owner', 'manager', 'receptionist', 'technician', 'cashier'],
  'agenda.create': ['owner', 'manager', 'receptionist'],
  'agenda.update': ['owner', 'manager', 'receptionist'],
  'agenda.cancel': ['owner', 'manager', 'receptionist'],
  'agenda.view_own_only': ['technician'],

  // Clientes
  'clients.view': ['owner', 'manager', 'receptionist'],
  'clients.create': ['owner', 'manager', 'receptionist'],
  'clients.update': ['owner', 'manager', 'receptionist'],
  'clients.delete': ['owner'],
  'clients.view_notes': ['owner', 'manager', 'receptionist', 'technician'],

  // Ventas
  'sales.view': ['owner', 'manager', 'receptionist', 'cashier'],
  'sales.create': ['owner', 'manager', 'receptionist', 'cashier'],
  'sales.void': ['owner', 'manager'],
  'cash.manage': ['owner', 'manager', 'cashier', 'receptionist'],

  // Servicios
  'services.view': ['owner', 'manager', 'receptionist', 'technician'],
  'services.manage': ['owner', 'manager'],

  // Staff
  'staff.view': ['owner', 'manager', 'receptionist'],
  'staff.manage': ['owner', 'manager'],

  // Inventario
  'inventory.view': ['owner', 'manager', 'receptionist'],
  'inventory.manage': ['owner', 'manager'],

  // Reportes
  'reports.view': ['owner', 'manager'],
  'reports.export': ['owner'],

  // Campañas
  'campaigns.view': ['owner', 'manager'],
  'campaigns.manage': ['owner', 'manager'],

  // Configuración
  'settings.view': ['owner'],
  'settings.manage': ['owner'],
  'settings.users': ['owner'],
}

export function hasPermission(userRole, permission) {
  const allowedRoles = PERMISSIONS[permission]
  if (!allowedRoles) return false
  return allowedRoles.includes(userRole)
}

export function roleHasHigherOrEqualLevel(role, requiredRole) {
  return (ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
}
