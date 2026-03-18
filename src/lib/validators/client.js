import { z } from 'zod'

export const clientSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  birthday: z.string().optional().nullable(),
  instagram_handle: z.string().max(50).optional().nullable(),
  referral_source: z.string().max(100).optional().nullable(),
  marketing_opt_in_email: z.boolean().default(false),
  marketing_opt_in_whatsapp: z.boolean().default(false),
  notes: z.string().max(1000).optional().nullable(),
  skin_type: z.string().max(100).optional().nullable(),
  allergies: z.string().max(500).optional().nullable(),
  sensitivities: z.string().max(500).optional().nullable(),
  contraindications: z.string().max(500).optional().nullable(),
  preferred_staff_id: z.string().uuid().optional().nullable(),
  preferred_branch_id: z.string().uuid().optional().nullable(),
})
