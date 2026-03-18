/**
 * Edge Function: process-notification-queue
 *
 * Procesa los notification_jobs pendientes y envía mensajes vía
 * el provider configurado (WhatsApp / Email).
 *
 * Disparado por: Supabase Cron / pg_cron (cada 1-5 minutos)
 * O invocación directa desde la app.
 *
 * Variables de entorno requeridas:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   WHATSAPP_PROVIDER     (mock | meta | twilio)
 *   META_WHATSAPP_TOKEN
 *   META_WHATSAPP_PHONE_ID
 *   EMAIL_PROVIDER        (mock | resend | postmark)
 *   RESEND_API_KEY
 *   EMAIL_FROM_ADDRESS
 *   EMAIL_FROM_NAME
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BATCH_SIZE = 20

// Resolver variables en template
function resolveTemplate(template, variables) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match
  })
}

// Provider de WhatsApp (mock)
async function sendWhatsApp(message, config) {
  const provider = config.whatsappProvider || 'mock'

  if (provider === 'meta') {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.metaPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: message.to.replace('+', ''),
          type: 'text',
          text: { body: message.body },
        }),
      }
    )
    const data = await response.json()
    if (!response.ok) return { success: false, error: data.error?.message, raw: data }
    return { success: true, messageId: data.messages?.[0]?.id, raw: data }
  }

  // Mock: log y success simulado
  console.log('[Mock WhatsApp]', JSON.stringify({ to: message.to, body: message.body.slice(0, 80) }))
  return { success: true, messageId: `mock_${Date.now()}` }
}

// Provider de Email (mock/resend)
async function sendEmail(message, config) {
  const provider = config.emailProvider || 'mock'

  if (provider === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.emailFromName || 'BeautyDesk'} <${config.emailFromAddress}>`,
        to: [message.to],
        subject: message.subject,
        html: message.html,
      }),
    })
    const data = await response.json()
    if (!response.ok) return { success: false, error: data.message, raw: data }
    return { success: true, messageId: data.id, raw: data }
  }

  // Mock
  console.log('[Mock Email]', JSON.stringify({ to: message.to, subject: message.subject }))
  return { success: true, messageId: `mock_email_${Date.now()}` }
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const config = {
      whatsappProvider: Deno.env.get('WHATSAPP_PROVIDER') || 'mock',
      metaToken: Deno.env.get('META_WHATSAPP_TOKEN'),
      metaPhoneId: Deno.env.get('META_WHATSAPP_PHONE_ID'),
      emailProvider: Deno.env.get('EMAIL_PROVIDER') || 'mock',
      resendApiKey: Deno.env.get('RESEND_API_KEY'),
      emailFromAddress: Deno.env.get('EMAIL_FROM_ADDRESS') || 'noreply@beautydesk.app',
      emailFromName: Deno.env.get('EMAIL_FROM_NAME') || 'BeautyDesk',
    }

    // Fetch pending jobs whose scheduled_for has passed.
    // max_retries is checked per-job in the loop (PostgREST can't compare two columns).
    const { data: jobs, error: fetchError } = await supabase
      .from('notification_jobs')
      .select(`
        id, channel, event_type, recipient_name, recipient_phone, recipient_email,
        payload_json, retry_count, max_retries, provider,
        template:message_templates(channel, body, subject),
        client:client_profiles(full_name, phone, email)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(BATCH_SIZE)
      .order('scheduled_for')

    if (fetchError) throw fetchError
    if (!jobs?.length) {
      return new Response(JSON.stringify({ processed: 0, message: 'No pending jobs' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let processed = 0, errors = 0

    for (const job of jobs) {
      // Respect per-job max_retries (default 3 if missing)
      const maxRetries = job.max_retries ?? 3
      if (job.retry_count >= maxRetries) {
        // Mark permanently failed and skip — shouldn't normally reach here
        await supabase
          .from('notification_jobs')
          .update({ status: 'failed', last_error: 'max_retries exceeded' })
          .eq('id', job.id)
        errors++
        continue
      }

      // Atomic claim: only proceed if the job is still 'pending'.
      // Prevents two concurrent invocations from processing the same job.
      const { data: claimed } = await supabase
        .from('notification_jobs')
        .update({ status: 'processing' })
        .eq('id', job.id)
        .eq('status', 'pending') // guard
        .select('id')

      if (!claimed || claimed.length === 0) {
        // Another worker already claimed this job
        continue
      }

      let result
      try {
        const body = job.template
          ? resolveTemplate(job.template.body, job.payload_json)
          : job.payload_json.body || ''

        let usedProvider
        if (job.channel === 'whatsapp') {
          result = await sendWhatsApp({ to: job.recipient_phone, body }, config)
          usedProvider = config.whatsappProvider
        } else if (job.channel === 'email') {
          result = await sendEmail({
            to: job.recipient_email,
            subject: job.template?.subject
              ? resolveTemplate(job.template.subject, job.payload_json)
              : 'Notificación BeautyDesk',
            html: body,
          }, config)
          usedProvider = config.emailProvider
        } else {
          result = { success: false, error: `Unknown channel: ${job.channel}` }
          usedProvider = 'unknown'
        }

        const doneAt = new Date().toISOString()

        await supabase
          .from('notification_jobs')
          .update({
            status: result.success ? 'sent' : 'failed',
            provider: usedProvider,
            provider_message_id: result.messageId || null,
            last_error: result.error || null,
            processed_at: doneAt,
            retry_count: result.success ? job.retry_count : job.retry_count + 1,
          })
          .eq('id', job.id)

        await supabase.from('notification_logs').insert({
          job_id: job.id,
          status: result.success ? 'sent' : 'failed',
          provider_response: result.raw || null,
          error_message: result.error || null,
          sent_at: result.success ? doneAt : null,
        })

        if (result.success) processed++
        else errors++
      } catch (err) {
        await supabase
          .from('notification_jobs')
          .update({
            status: 'failed',
            last_error: err.message,
            processed_at: new Date().toISOString(),
            retry_count: job.retry_count + 1,
          })
          .eq('id', job.id)
        errors++
      }
    }

    return new Response(
      JSON.stringify({ processed, errors, total: jobs.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
