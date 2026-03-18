import { Badge } from './Badge'
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
} from '@/lib/constants/appointmentStatus'

export function AppointmentStatusBadge({ status }) {
  const label = APPOINTMENT_STATUS_LABELS[status] || status
  const color = APPOINTMENT_STATUS_COLORS[status] || 'gray'
  return <Badge color={color} dot>{label}</Badge>
}

export function PaymentStatusBadge({ status }) {
  const map = {
    pending:   { label: 'Pendiente',  color: 'yellow' },
    partial:   { label: 'Parcial',    color: 'orange' },
    paid:      { label: 'Pagado',     color: 'green'  },
    refunded:  { label: 'Reembolso',  color: 'blue'   },
    cancelled: { label: 'Cancelado',  color: 'gray'   },
  }
  const { label, color } = map[status] || { label: status, color: 'gray' }
  return <Badge color={color} dot>{label}</Badge>
}

export function PackageStatusBadge({ status }) {
  const map = {
    active:    { label: 'Activo',     color: 'green'  },
    completed: { label: 'Completado', color: 'blue'   },
    expired:   { label: 'Vencido',    color: 'red'    },
    cancelled: { label: 'Cancelado',  color: 'gray'   },
  }
  const { label, color } = map[status] || { label: status, color: 'gray' }
  return <Badge color={color} dot>{label}</Badge>
}

export function GiftCardStatusBadge({ status }) {
  const map = {
    active:    { label: 'Activa',     color: 'green' },
    used:      { label: 'Usada',      color: 'blue'  },
    expired:   { label: 'Vencida',    color: 'red'   },
    cancelled: { label: 'Cancelada',  color: 'gray'  },
  }
  const { label, color } = map[status] || { label: status, color: 'gray' }
  return <Badge color={color} dot>{label}</Badge>
}
