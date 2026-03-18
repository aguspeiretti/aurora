-- ============================================================
-- BeautyDesk — Detalle de org y métricas de crecimiento para Super Admin
-- ============================================================

-- Detalle completo de una org (uso real + suscripción + sucursales)
CREATE OR REPLACE FUNCTION get_org_detail_for_admin(p_org_id UUID)
RETURNS JSON AS $$
DECLARE
  v_org            RECORD;
  v_month_start    TIMESTAMPTZ := date_trunc('month', NOW());
  v_appts_month    BIGINT;
  v_appts_total    BIGINT;
  v_clients_total  BIGINT;
  v_revenue_month  NUMERIC;
  v_staff_count    BIGINT;
  v_services_count BIGINT;
  v_branches       JSON;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Solo los super administradores pueden acceder a esta función';
  END IF;

  -- Org + owner
  SELECT
    o.id, o.name, o.slug, o.active, o.phone, o.email, o.website,
    o.subscription_status, o.subscription_plan,
    o.trial_ends_at, o.subscription_ends_at, o.platform_notes,
    o.created_at, o.primary_color,
    p.full_name AS owner_name, p.email AS owner_email
  INTO v_org
  FROM organizations o
  LEFT JOIN organization_users ou ON ou.organization_id = o.id AND ou.role = 'owner' AND ou.active = true
  LEFT JOIN profiles p ON p.id = ou.profile_id
  WHERE o.id = p_org_id;

  -- Métricas de uso
  SELECT COUNT(*) INTO v_appts_month FROM appointments
    WHERE organization_id = p_org_id AND starts_at >= v_month_start;

  SELECT COUNT(*) INTO v_appts_total FROM appointments
    WHERE organization_id = p_org_id;

  SELECT COUNT(*) INTO v_clients_total FROM client_profiles
    WHERE organization_id = p_org_id AND active = true;

  SELECT COALESCE(SUM(total), 0) INTO v_revenue_month FROM sales
    WHERE organization_id = p_org_id
      AND sold_at >= v_month_start
      AND payment_status = 'paid';

  SELECT COUNT(*) INTO v_staff_count FROM staff_profiles
    WHERE organization_id = p_org_id AND active = true;

  SELECT COUNT(*) INTO v_services_count FROM services
    WHERE organization_id = p_org_id AND active = true;

  -- Sucursales
  SELECT json_agg(json_build_object(
    'id', b.id, 'name', b.name, 'address', b.address,
    'phone', b.phone, 'active', b.active,
    'online_booking_enabled', b.online_booking_enabled
  ) ORDER BY b.sort_order) INTO v_branches
  FROM branches b WHERE b.organization_id = p_org_id;

  RETURN json_build_object(
    'id',                   v_org.id,
    'name',                 v_org.name,
    'slug',                 v_org.slug,
    'active',               v_org.active,
    'phone',                v_org.phone,
    'email',                v_org.email,
    'website',              v_org.website,
    'primary_color',        v_org.primary_color,
    'subscription_status',  v_org.subscription_status,
    'subscription_plan',    v_org.subscription_plan,
    'trial_ends_at',        v_org.trial_ends_at,
    'subscription_ends_at', v_org.subscription_ends_at,
    'platform_notes',       v_org.platform_notes,
    'created_at',           v_org.created_at,
    'owner_name',           v_org.owner_name,
    'owner_email',          v_org.owner_email,
    'usage', json_build_object(
      'appts_month',    v_appts_month,
      'appts_total',    v_appts_total,
      'clients_total',  v_clients_total,
      'revenue_month',  v_revenue_month,
      'staff_count',    v_staff_count,
      'services_count', v_services_count
    ),
    'branches', COALESCE(v_branches, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar notas de plataforma (inline desde la detail page)
CREATE OR REPLACE FUNCTION update_org_platform_notes(p_org_id UUID, p_notes TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Solo los super administradores pueden modificar notas';
  END IF;
  UPDATE organizations SET platform_notes = p_notes, updated_at = NOW()
  WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crecimiento mensual: nuevas orgs por mes (últimos 12 meses)
CREATE OR REPLACE FUNCTION get_monthly_growth()
RETURNS TABLE (month TEXT, count BIGINT) AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Solo los super administradores pueden acceder a esta función';
  END IF;

  RETURN QUERY
  SELECT
    TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
    COUNT(*) AS count
  FROM organizations
  WHERE created_at >= NOW() - INTERVAL '12 months'
  GROUP BY date_trunc('month', created_at)
  ORDER BY date_trunc('month', created_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
