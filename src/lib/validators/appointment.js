import { z } from 'zod'
import { APPOINTMENT_STATUS } from '../constants/appointmentStatus'

export const appointmentSchema = z.object({
  branch_id: z.string().uuid('Seleccioná una sucursal'),
  client_id: z.string().uuid('Seleccioná una clienta').optional().nullable(),
  primary_staff_id: z.string().uuid('Seleccioná una profesional').optional().nullable(),
  resource_id: z.string().uuid().optional().nullable(),
  starts_at: z.string().min(1, 'La fecha y hora son requeridas'),
  services: z.array(z.object({
    service_id: z.string().uuid('Seleccioná un servicio'),
    assigned_staff_id: z.string().uuid().optional().nullable(),
    assigned_resource_id: z.string().uuid().optional().nullable(),
    duration_minutes: z.number().min(5),
    price: z.number().min(0),
    sort_order: z.number().default(0),
    notes: z.string().optional(),
  })).min(1, 'Debés agregar al menos un servicio'),
  notes: z.string().max(500).optional(),
  internal_notes: z.string().max(500).optional(),
  source: z.enum(['manual', 'online', 'whatsapp', 'instagram', 'google', 'phone']).default('manual'),
})

export const appointmentStatusUpdateSchema = z.object({
  status: z.enum(Object.values(APPOINTMENT_STATUS)),
  reason: z.string().max(300).optional(),
})
