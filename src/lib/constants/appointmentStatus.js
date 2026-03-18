export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  IN_SERVICE: 'in_service',
  COMPLETED: 'completed',
  CANCELLED_BY_CLIENT: 'cancelled_by_client',
  CANCELLED_BY_STAFF: 'cancelled_by_staff',
  NO_SHOW: 'no_show',
  RESCHEDULED: 'rescheduled',
}

export const APPOINTMENT_STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  checked_in: 'Llegó',
  in_service: 'En servicio',
  completed: 'Completado',
  cancelled_by_client: 'Cancelado por cliente',
  cancelled_by_staff: 'Cancelado por staff',
  no_show: 'No se presentó',
  rescheduled: 'Reprogramado',
}

export const APPOINTMENT_STATUS_COLORS = {
  pending: 'yellow',
  confirmed: 'blue',
  checked_in: 'indigo',
  in_service: 'brand',
  completed: 'green',
  cancelled_by_client: 'gray',
  cancelled_by_staff: 'gray',
  no_show: 'red',
  rescheduled: 'orange',
}

export const APPOINTMENT_SOURCE_LABELS = {
  manual: 'Manual',
  online: 'Online',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  google: 'Google',
  phone: 'Teléfono',
}

// Transiciones permitidas por estado
export const ALLOWED_TRANSITIONS = {
  pending: ['confirmed', 'cancelled_by_client', 'cancelled_by_staff', 'no_show'],
  confirmed: ['checked_in', 'cancelled_by_client', 'cancelled_by_staff', 'no_show', 'rescheduled'],
  checked_in: ['in_service', 'cancelled_by_staff'],
  in_service: ['completed', 'cancelled_by_staff'],
  completed: [],
  cancelled_by_client: [],
  cancelled_by_staff: [],
  no_show: [],
  rescheduled: ['confirmed', 'cancelled_by_client'],
}

export const TERMINAL_STATUSES = ['completed', 'cancelled_by_client', 'cancelled_by_staff', 'no_show']
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked_in', 'in_service']
export const CANCELLED_STATUSES = ['cancelled_by_client', 'cancelled_by_staff']
