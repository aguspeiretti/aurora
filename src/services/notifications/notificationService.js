import { supabase } from '@/lib/supabase/client'

/**
 * NotificationService
 *
 * Orquesta la creación de notification_jobs en la base de datos.
 * Los jobs son procesados por la Edge Function process-notification-queue.
 *
 * NO envía directamente — encola para procesamiento asíncrono.
 */

/**
 * Resuelve las variables de un template con los valores del payload
 *
 * @param {string} template  - Texto con {{variables}}
 * @param {Object} variables - Mapa de variables a reemplazar
 * @returns {string}
 */
export function resolveTemplate(template, variables) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match
  })
}

/**
 * Crear un notification_job para ser procesado asincrónicamente
 */
export async function enqueueNotification({
  organizationId,
  branchId,
  channel,
  eventType,
  templateId,
  clientId,
  appointmentId,
  recipientName,
  recipientPhone,
  recipientEmail,
  payload,
  scheduledFor,
}) {
  const { data, error } = await supabase
    .from('notification_jobs')
    .insert({
      organization_id: organizationId,
      branch_id: branchId,
      channel,
      event_type: eventType,
      template_id: templateId || null,
      client_id: clientId || null,
      appointment_id: appointmentId || null,
      recipient_name: recipientName,
      recipient_phone: recipientPhone || null,
      recipient_email: recipientEmail || null,
      payload_json: payload || {},
      scheduled_for: scheduledFor || new Date().toISOString(),
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Encolar notificaciones de turno (múltiples eventos)
 */
export async function enqueueAppointmentNotifications(appointment, organization, branch, client, services) {
  if (!client) return

  const appointmentDate = new Date(appointment.starts_at)
  const dateStr = appointmentDate.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
  const timeStr = appointmentDate.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit'
  })

  const payload = {
    client_name:     client.full_name,
    org_name:        organization.name,
    branch_name:     branch.name,
    branch_address:  branch.address || '',
    appointment_date: dateStr,
    appointment_time: timeStr,
    service_name:    services?.[0]?.service?.name || 'Servicio',
    staff_name:      appointment.staff?.display_name || 'Profesional',
    manage_url:      `${window.location.origin}/manage-booking/${appointment.online_token || appointment.id}`,
  }

  const jobs = []

  // Confirmación inmediata
  if (client.marketing_opt_in_whatsapp && client.phone) {
    jobs.push(enqueueNotification({
      organizationId: organization.id,
      branchId: branch.id,
      channel: 'whatsapp',
      eventType: 'appointment_confirmed',
      clientId: client.id,
      appointmentId: appointment.id,
      recipientName: client.full_name,
      recipientPhone: client.phone,
      payload,
      scheduledFor: new Date().toISOString(),
    }))
  }

  if (client.marketing_opt_in_email && client.email) {
    jobs.push(enqueueNotification({
      organizationId: organization.id,
      branchId: branch.id,
      channel: 'email',
      eventType: 'appointment_confirmed',
      clientId: client.id,
      appointmentId: appointment.id,
      recipientName: client.full_name,
      recipientEmail: client.email,
      payload,
      scheduledFor: new Date().toISOString(),
    }))
  }

  // Recordatorio 24h antes
  const reminder24h = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000)
  if (reminder24h > new Date()) {
    if (client.marketing_opt_in_whatsapp && client.phone) {
      jobs.push(enqueueNotification({
        organizationId: organization.id,
        branchId: branch.id,
        channel: 'whatsapp',
        eventType: 'appointment_reminder_24h',
        clientId: client.id,
        appointmentId: appointment.id,
        recipientName: client.full_name,
        recipientPhone: client.phone,
        payload,
        scheduledFor: reminder24h.toISOString(),
      }))
    }
  }

  // Recordatorio 3h antes
  const reminder3h = new Date(appointmentDate.getTime() - 3 * 60 * 60 * 1000)
  if (reminder3h > new Date()) {
    if (client.marketing_opt_in_whatsapp && client.phone) {
      jobs.push(enqueueNotification({
        organizationId: organization.id,
        branchId: branch.id,
        channel: 'whatsapp',
        eventType: 'appointment_reminder_3h',
        clientId: client.id,
        appointmentId: appointment.id,
        recipientName: client.full_name,
        recipientPhone: client.phone,
        payload,
        scheduledFor: reminder3h.toISOString(),
      }))
    }
  }

  return Promise.allSettled(jobs)
}
