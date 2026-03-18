/**
 * Edge Function: send-appointment-reminders
 *
 * Cron job que detecta turnos confirmados/pendientes próximos
 * y crea notification_jobs para recordatorios.
 *
 * Schedule sugerido: cada hora (0 * * * *)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )

  // Solo procesar organizaciones con plan enterprise y estado activo o trial
  const { data: enterpriseOrgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('subscription_plan', 'enterprise')
    .in('subscription_status', ['active', 'trial'])

  const enterpriseOrgIds = (enterpriseOrgs || []).map(o => o.id)

  if (!enterpriseOrgIds.length) {
    return new Response(
      JSON.stringify({ created: 0, reason: 'no enterprise orgs' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  const now = new Date()
  const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const window24hEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000)
  const window3hStart  = new Date(now.getTime() + 2.5 * 60 * 60 * 1000)
  const window3hEnd    = new Date(now.getTime() + 3.5 * 60 * 60 * 1000)

  let created = 0

  // ── Recordatorios 24h ──────────────────────────────────────
  const { data: appts24h } = await supabase
    .from('appointments')
    .select(`
      id, organization_id, branch_id, starts_at,
      client:client_profiles(id, full_name, phone, email, marketing_opt_in_whatsapp, marketing_opt_in_email),
      staff:staff_profiles!primary_staff_id(display_name),
      services:appointment_services(service:services(name))
    `)
    .in('status', ['confirmed', 'pending'])
    .in('organization_id', enterpriseOrgIds)
    .gte('starts_at', window24hStart.toISOString())
    .lte('starts_at', window24hEnd.toISOString())

  for (const appt of appts24h || []) {
    if (!appt.client) continue

    // Evitar duplicados
    const { data: existing } = await supabase
      .from('notification_jobs')
      .select('id')
      .eq('appointment_id', appt.id)
      .eq('event_type', 'appointment_reminder_24h')
      .limit(1)

    if (existing?.length) continue

    const payload = buildPayload(appt)

    if (appt.client.marketing_opt_in_whatsapp && appt.client.phone) {
      await supabase.from('notification_jobs').insert({
        organization_id: appt.organization_id,
        branch_id: appt.branch_id,
        channel: 'whatsapp',
        event_type: 'appointment_reminder_24h',
        client_id: appt.client.id,
        appointment_id: appt.id,
        recipient_name: appt.client.full_name,
        recipient_phone: appt.client.phone,
        payload_json: payload,
        scheduled_for: new Date(new Date(appt.starts_at).getTime() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      })
      created++
    }
  }

  // ── Recordatorios 3h ───────────────────────────────────────
  const { data: appts3h } = await supabase
    .from('appointments')
    .select(`
      id, organization_id, branch_id, starts_at,
      client:client_profiles(id, full_name, phone, email, marketing_opt_in_whatsapp),
      staff:staff_profiles!primary_staff_id(display_name),
      services:appointment_services(service:services(name))
    `)
    .in('status', ['confirmed', 'pending'])
    .in('organization_id', enterpriseOrgIds)
    .gte('starts_at', window3hStart.toISOString())
    .lte('starts_at', window3hEnd.toISOString())

  for (const appt of appts3h || []) {
    if (!appt.client) continue

    const { data: existing } = await supabase
      .from('notification_jobs')
      .select('id')
      .eq('appointment_id', appt.id)
      .eq('event_type', 'appointment_reminder_3h')
      .limit(1)

    if (existing?.length) continue

    const payload = buildPayload(appt)

    if (appt.client.marketing_opt_in_whatsapp && appt.client.phone) {
      await supabase.from('notification_jobs').insert({
        organization_id: appt.organization_id,
        branch_id: appt.branch_id,
        channel: 'whatsapp',
        event_type: 'appointment_reminder_3h',
        client_id: appt.client.id,
        appointment_id: appt.id,
        recipient_name: appt.client.full_name,
        recipient_phone: appt.client.phone,
        payload_json: payload,
        scheduled_for: new Date(new Date(appt.starts_at).getTime() - 3 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      })
      created++
    }
  }

  return new Response(
    JSON.stringify({ created, checked24h: appts24h?.length, checked3h: appts3h?.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

function buildPayload(appt) {
  const d = new Date(appt.starts_at)
  return {
    client_name:     appt.client.full_name,
    appointment_date: d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }),
    appointment_time: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    service_name:    appt.services?.[0]?.service?.name || 'Servicio',
    staff_name:      appt.staff?.display_name || '',
  }
}
