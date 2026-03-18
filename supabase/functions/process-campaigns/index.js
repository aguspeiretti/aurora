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

    // Fetch campaigns ready to run: scheduled_for is in the past (or null) and status is 'scheduled'
    const { data: campaigns, error: campErr } = await supabase
      .from('campaigns')
      .select('*')
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
        // Mark campaign as running
        await supabase
          .from('campaigns')
          .update({ status: 'running', started_at: now })
          .eq('id', campaign.id)

        // Build audience query based on audience_type
        let clientQuery = supabase
          .from('client_profiles')
          .select('id, first_name, last_name, phone, email')
          .eq('organization_id', campaign.organization_id)
          .eq('is_active', true)

        if (campaign.audience_type === 'inactive') {
          // Clients with no appointment in the last 90 days
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - 90)
          const { data: activeClientIds } = await supabase
            .from('appointments')
            .select('client_id')
            .eq('organization_id', campaign.organization_id)
            .gte('starts_at', cutoff.toISOString())
            .not('status', 'in', '("cancelled","no_show")')
          const activeIds = activeClientIds?.map(r => r.client_id) || []
          if (activeIds.length > 0) {
            clientQuery = clientQuery.not('id', 'in', `(${activeIds.join(',')})`)
          }
        } else if (campaign.audience_type === 'birthday_month') {
          const currentMonth = new Date().getMonth() + 1
          clientQuery = clientQuery.filter('birth_date', 'not.is', null)
          // Filter by birth month via RPC or manual filter after fetching
        } else if (campaign.audience_type === 'no_upcoming_booking') {
          const { data: bookedClientIds } = await supabase
            .from('appointments')
            .select('client_id')
            .eq('organization_id', campaign.organization_id)
            .gte('starts_at', now)
            .not('status', 'in', '("cancelled","no_show")')
          const bookedIds = bookedClientIds?.map(r => r.client_id) || []
          if (bookedIds.length > 0) {
            clientQuery = clientQuery.not('id', 'in', `(${bookedIds.join(',')})`)
          }
        }

        const { data: clients, error: clientErr } = await clientQuery
        if (clientErr) throw clientErr

        let audience = clients || []

        // Post-filter for birthday_month
        if (campaign.audience_type === 'birthday_month') {
          const currentMonth = new Date().getMonth() + 1
          audience = audience.filter(c => {
            if (!c.birth_date) return false
            return new Date(c.birth_date).getMonth() + 1 === currentMonth
          })
        }

        // Check for already-delivered clients to avoid duplicates
        const { data: existing } = await supabase
          .from('campaign_deliveries')
          .select('client_id')
          .eq('campaign_id', campaign.id)
        const deliveredIds = new Set((existing || []).map(d => d.client_id))

        const newAudience = audience.filter(c => !deliveredIds.has(c.id))

        // Resolve message template
        const messageBody = campaign.custom_message || ''

        // Enqueue notification jobs and record deliveries
        const jobs = newAudience.map(client => {
          const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ')
          const body = messageBody.replace(/\{\{client_name\}\}/g, clientName)

          return {
            organization_id: campaign.organization_id,
            event_type: 'campaign_message',
            channel: campaign.channel,
            recipient_name: clientName,
            recipient_phone: client.phone,
            recipient_email: client.email,
            payload_json: {
              body,
              campaign_id: campaign.id,
              client_id: client.id,
            },
            status: 'pending',
          }
        })

        if (jobs.length > 0) {
          // Insert notification jobs in batches of 50
          for (let i = 0; i < jobs.length; i += 50) {
            const batch = jobs.slice(i, i + 50)
            const { error: jobErr } = await supabase.from('notification_jobs').insert(batch)
            if (jobErr) console.error('Error inserting batch:', jobErr.message)
          }

          // Record campaign deliveries
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

        // Mark campaign as completed
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
        // Mark as draft on error so it can be retried
        await supabase
          .from('campaigns')
          .update({ status: 'draft', error_message: err.message })
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
