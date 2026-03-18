// supabase/functions/process-campaigns/index.js
// Processes scheduled campaigns: fetches audience, enqueues notification jobs per recipient.
// Triggered via cron or manually. Set CRON: "*/15 * * * *" in supabase/config.toml.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
)

Deno.serve(async (req) => {
  try {
    const now = new Date().toISOString()

    // Solo procesar organizaciones con plan enterprise y estado activo o trial
    const { data: enterpriseOrgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('subscription_plan', 'enterprise')
      .in('subscription_status', ['active', 'trial'])

    const enterpriseOrgIds = (enterpriseOrgs || []).map(o => o.id)

    if (!enterpriseOrgIds.length) {
      return new Response(JSON.stringify({ processed: 0, reason: 'no enterprise orgs' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch campaigns ready to run
    const { data: campaigns, error: campErr } = await supabase
      .from('campaigns')
      .select('id, name, organization_id, audience_type, channel, custom_message, sent_count, scheduled_for, status')
      .eq('status', 'scheduled')
      .in('organization_id', enterpriseOrgIds)
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .limit(10)

    if (campErr) throw campErr
    if (!campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { 'Content-Type': 'application/json' } })
    }

    let totalEnqueued = 0

    for (const campaign of campaigns) {
      try {
        // Atomic claim: only proceed if the campaign is still 'scheduled'.
        // This prevents two concurrent invocations from processing the same campaign.
        const { data: claimed } = await supabase
          .from('campaigns')
          .update({ status: 'running', started_at: now })
          .eq('id', campaign.id)
          .eq('status', 'scheduled') // guard
          .select('id')

        if (!claimed || claimed.length === 0) {
          // Another instance already claimed this campaign
          console.log(`Campaign ${campaign.id}: skipped (already claimed)`)
          continue
        }

        // Build audience using set-based SQL RPCs to avoid client-side filtering
        let audience = []

        if (campaign.audience_type === 'inactive') {
          const { data, error: audErr } = await supabase.rpc('get_inactive_clients', {
            p_organization_id: campaign.organization_id,
            p_days_inactive:   90,
          })
          if (audErr) throw audErr
          audience = data || []

        } else if (campaign.audience_type === 'birthday_month') {
          // Birthday month filter fully in SQL via the new RPC (avoids full-table JS filter)
          const { data, error: audErr } = await supabase.rpc('get_birthday_month_clients', {
            p_organization_id: campaign.organization_id,
            p_month:           new Date().getMonth() + 1,
          })
          if (audErr) throw audErr
          audience = data || []

        } else if (campaign.audience_type === 'no_upcoming_booking') {
          const { data, error: audErr } = await supabase.rpc('get_clients_without_upcoming_booking', {
            p_organization_id: campaign.organization_id,
          })
          if (audErr) throw audErr
          audience = data || []

        } else {
          // Default: all non-blocked clients
          const { data, error: audErr } = await supabase
            .from('client_profiles')
            .select('id, full_name, phone, email')
            .eq('organization_id', campaign.organization_id)
            .eq('is_blocked', false)
          if (audErr) throw audErr
          audience = data || []
        }

        // Exclude clients already delivered to (idempotency guard)
        const { data: existing } = await supabase
          .from('campaign_deliveries')
          .select('client_id')
          .eq('campaign_id', campaign.id)
        const deliveredIds = new Set((existing || []).map(d => d.client_id))

        const newAudience = audience.filter(c => !deliveredIds.has(c.id))

        const messageBody = campaign.custom_message || ''

        if (newAudience.length > 0) {
          const jobs = newAudience.map(client => {
            const clientName = client.full_name || ''
            return {
              organization_id: campaign.organization_id,
              event_type: 'campaign_message',
              channel: campaign.channel,
              recipient_name: clientName,
              recipient_phone: client.phone,
              recipient_email: client.email,
              payload_json: {
                body: messageBody.replace(/\{\{client_name\}\}/g, clientName),
                campaign_id: campaign.id,
                client_id: client.id,
              },
              status: 'pending',
            }
          })

          // Insert notification jobs in batches of 50
          for (let i = 0; i < jobs.length; i += 50) {
            const { error: jobErr } = await supabase.from('notification_jobs').insert(jobs.slice(i, i + 50))
            if (jobErr) console.error('Error inserting job batch:', jobErr.message)
          }

          // Record campaign deliveries for idempotency
          const deliveries = newAudience.map(client => ({
            campaign_id: campaign.id,
            client_id: client.id,
            channel: campaign.channel,
            status: 'pending',
          }))
          for (let i = 0; i < deliveries.length; i += 50) {
            await supabase.from('campaign_deliveries').insert(deliveries.slice(i, i + 50))
          }

          totalEnqueued += jobs.length
        }

        // Mark campaign completed
        await supabase
          .from('campaigns')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            sent_count: (campaign.sent_count || 0) + newAudience.length,
          })
          .eq('id', campaign.id)

        console.log(`Campaign ${campaign.id} (${campaign.name}): enqueued ${newAudience.length} messages`)
      } catch (err) {
        console.error(`Campaign ${campaign.id} failed:`, err.message)
        // Revert to 'scheduled' (not 'draft') so the cron retries on the next run
        await supabase
          .from('campaigns')
          .update({ status: 'scheduled', error_message: err.message })
          .eq('id', campaign.id)
      }
    }

    return new Response(
      JSON.stringify({ processed: campaigns.length, enqueued: totalEnqueued }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('process-campaigns error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
