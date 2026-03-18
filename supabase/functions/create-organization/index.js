// supabase/functions/create-organization/index.js
// Crea una nueva organización junto con su usuario owner.
// Solo puede ser invocada por super administradores de la plataforma.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cliente con service_role para operaciones privilegiadas
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    )

    // Verificar que el caller está autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(token)
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que el caller es super admin
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('is_super_admin')
      .eq('id', caller.id)
      .single()

    if (!callerProfile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Solo los super administradores pueden crear organizaciones' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const {
      orgName,
      orgSlug,
      ownerName,
      ownerEmail,
      ownerPassword,
      plan = 'basico',
      subscriptionStatus = 'trial',
      trialEndsAt,
      platformNotes,
    } = body

    // Validaciones básicas
    if (!orgName || !orgSlug || !ownerName || !ownerEmail || !ownerPassword) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: orgName, orgSlug, ownerName, ownerEmail, ownerPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Crear usuario auth
    const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { full_name: ownerName },
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: `Error creando usuario: ${authError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = newAuthUser.user.id

    // 2. El trigger trg_on_auth_user_created ya creó el perfil automáticamente.
    // No se inserta manualmente para evitar duplicate key.

    // 3. Crear organización
    const { data: org, error: orgError } = await adminClient.from('organizations').insert({
      name: orgName,
      slug: orgSlug,
      subscription_status: subscriptionStatus,
      subscription_plan: plan,
      trial_ends_at: trialEndsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      platform_notes: platformNotes || null,
    }).select().single()

    if (orgError) {
      await adminClient.auth.admin.deleteUser(newUserId)
      return new Response(
        JSON.stringify({ error: `Error creando organización: ${orgError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Vincular usuario como owner de la organización
    const { error: linkError } = await adminClient.from('organization_users').insert({
      organization_id: org.id,
      profile_id: newUserId,
      role: 'owner',
      active: true,
      joined_at: new Date().toISOString(),
    })

    if (linkError) {
      await adminClient.auth.admin.deleteUser(newUserId)
      await adminClient.from('organizations').delete().eq('id', org.id)
      return new Response(
        JSON.stringify({ error: `Error vinculando usuario: ${linkError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Crear sucursal principal por defecto
    await adminClient.from('branches').insert({
      organization_id: org.id,
      name: 'Principal',
      slug: 'principal',
      active: true,
      sort_order: 0,
    })

    return new Response(
      JSON.stringify({
        success: true,
        organization: org,
        owner: { id: newUserId, email: ownerEmail, name: ownerName },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Error interno: ${err.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
