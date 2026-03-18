import { z } from 'zod'
import { durationSchema, priceSchema } from './common'

export const serviceSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido').max(100),
  description: z.string().max(500).optional().nullable(),
  category_id: z.string().uuid('Seleccioná una categoría').optional().nullable(),
  service_type: z.enum([
    'nails', 'laser_hair_removal', 'waxing', 'massage',
    'facial', 'lashes_brows', 'body_treatment', 'other'
  ]),
  duration_minutes: durationSchema,
  buffer_before_minutes: z.number().int().min(0).max(60).default(0),
  buffer_after_minutes: z.number().int().min(0).max(60).default(0),
  price: priceSchema,
  requires_staff: z.boolean().default(true),
  requires_resource: z.boolean().default(false),
  online_booking_enabled: z.boolean().default(true),
  deposit_required: z.boolean().default(false),
  deposit_type: z.enum(['fixed', 'percentage']).default('percentage'),
  deposit_value: z.number().min(0).max(100).default(30),
  default_rebooking_days: z.number().int().min(1).max(365).optional().nullable(),
  pre_service_notes: z.string().max(500).optional().nullable(),
  contraindications: z.string().max(500).optional().nullable(),
  active: z.boolean().default(true),
})
