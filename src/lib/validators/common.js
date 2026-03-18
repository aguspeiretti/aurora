import { z } from 'zod'

export const phoneSchema = z
  .string()
  .min(1, 'El teléfono es requerido')
  .regex(/^\+?[\d\s\-().]{7,20}$/, 'Formato de teléfono inválido')

export const emailSchema = z
  .string()
  .email('Email inválido')
  .or(z.literal(''))
  .optional()

export const uuidSchema = z.string().uuid('ID inválido')

export const priceSchema = z
  .number({ invalid_type_error: 'Debe ser un número' })
  .min(0, 'El precio no puede ser negativo')
  .max(9_999_999, 'Precio demasiado alto')

export const durationSchema = z
  .number({ invalid_type_error: 'Debe ser un número' })
  .int('Debe ser número entero')
  .min(5, 'Mínimo 5 minutos')
  .max(480, 'Máximo 8 horas')

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')

export const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones')
