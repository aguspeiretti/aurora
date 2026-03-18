/**
 * Edge Function: send-birthday-messages
 *
 * Detecta clientas que cumplen años hoy y enqueue mensajes de saludo.
 * Schedule sugerido: una vez por día a las 9:00 AM (0 9 * * *)
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

  const today = new Date()
  const month = today.getMonth() + 1
  const day   = today.getDate()

  // Buscar clientes con cumpleaños hoy (sin importar el año)
  const { data: clients } = await supabase
    .from('client_profiles')
    .select('id, full_name, phone, email, organization_id, marketing_opt_in_whatsapp, marketing_opt_in_email')
    .filter('birthday', 'not.is', null)
    .filter(`EXTRACT(MONTH FROM birthday)`, 'eq', month)
    .filter(`EXTRACT(DAY FROM birthday)`, 'eq', day)
    .eq('marketing_opt_in_whatsapp', true)
    .in('organization_id', enterpriseOrgIds)

  // Alternativa: usar función SQL para filtrar por mes/día
  // Por limitaciones del cliente JS de Supabase, usamos RPC:
  const { data: birthdayClients } = await supabase
    .rpc('get_birthday_clients_today')
    .select('*')

  const list = birthdayClients || clients || []
  let created = 0

  for (const client of list) {
    if (!client.phone && !client.email) continue

    // Evitar duplicados del mismo día
    const todayStr = today.toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('notification_jobs')
      .select('id')
      .eq('client_id', client.id)
      .eq('event_type', 'birthday_greeting')
      .gte('created_at', todayStr)
      .limit(1)

    if (existing?.length) continue

    const payload = { client_name: client.full_name }

    if (client.marketing_opt_in_whatsapp && client.phone) {
      await supabase.from('notification_jobs').insert({
        organization_id: client.organization_id,
        channel: 'whatsapp',
        event_type: 'birthday_greeting',
        client_id: client.id,
        recipient_name: client.full_name,
        recipient_phone: client.phone,
        payload_json: payload,
        scheduled_for: new Date().toISOString(),
        status: 'pending',
      })
      created++
    }
  }

  return new Response(
    JSON.stringify({ created, clientsFound: list.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
