-- ============================================================
-- BeautyDesk — Panel de Super Admin y Suscripciones
-- Versión: 1.1.0
-- ============================================================

-- ============================================================
-- TIPOS ENUMERADOS
-- ============================================================

CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'suspended', 'cancelled');
CREATE TYPE subscription_plan AS ENUM ('basico', 'pro', 'enterprise');

-- ============================================================
-- MODIFICACIONES A TABLAS EXISTENTES
-- ============================================================

-- Flag de super administrador de plataforma en perfiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Campos de suscripción en organizaciones
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_status subscription_status NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_plan   subscription_plan DEFAULT 'basico',
  ADD COLUMN IF NOT EXISTS trial_ends_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS platform_notes      TEXT;

-- ============================================================
-- FUNCIONES HELPER PARA SUPER ADMIN
-- ============================================================

-- Verifica si el usuario actual es super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN RPC: Listar todas las organizaciones (solo super admin)
-- Retorna organizaciones con info del owner
-- ============================================================

CREATE OR REPLACE FUNCTION get_all_organizations_for_admin()
RETURNS TABLE (
  id                    UUID,
  name                  TEXT,
  slug                  TEXT,
  active                BOOLEAN,
  subscription_status   subscription_status,
  subscription_plan     subscription_plan,
  trial_ends_at         TIMESTAMPTZ,
  subscription_starts_at TIMESTAMPTZ,
  subscription_ends_at  TIMESTAMPTZ,
  platform_notes        TEXT,
  created_at            TIMESTAMPTZ,
  owner_id              UUID,
  owner_name            TEXT,
  owner_email           TEXT
) AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Solo los super administradores pueden acceder a esta función';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.slug,
    o.active,
    o.subscription_status,
    o.subscription_plan,
    o.trial_ends_at,
    o.subscription_starts_at,
    o.subscription_ends_at,
    o.platform_notes,
    o.created_at,
    p.id   AS owner_id,
    p.full_name AS owner_name,
    p.email AS owner_email
  FROM organizations o
  LEFT JOIN organization_users ou
    ON ou.organization_id = o.id
    AND ou.role = 'owner'
    AND ou.active = true
  LEFT JOIN profiles p ON p.id = ou.profile_id
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN RPC: Actualizar suscripción de una organización
-- Solo super admin puede ejecutarla
-- ============================================================

CREATE OR REPLACE FUNCTION update_org_subscription(
  p_org_id              UUID,
  p_subscription_status subscription_status,
  p_subscription_plan   subscription_plan,
  p_trial_ends_at       TIMESTAMPTZ DEFAULT NULL,
  p_subscription_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_platform_notes      TEXT DEFAULT NULL,
  p_active              BOOLEAN DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Solo los super administradores pueden modificar suscripciones';
  END IF;

  UPDATE organizations SET
    subscription_status    = p_subscription_status,
    subscription_plan      = p_subscription_plan,
    trial_ends_at          = p_trial_ends_at,
    subscription_ends_at   = p_subscription_ends_at,
    platform_notes         = COALESCE(p_platform_notes, platform_notes),
    active                 = COALESCE(p_active, active),
    updated_at             = NOW()
  WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN RPC: Obtener stats de plataforma (solo super admin)
-- ============================================================

CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE (
  total_organizations   BIGINT,
  active_subscriptions  BIGINT,
  trial_count           BIGINT,
  past_due_count        BIGINT,
  suspended_count       BIGINT,
  cancelled_count       BIGINT
) AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Solo los super administradores pueden acceder a esta función';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)                                        AS total_organizations,
    COUNT(*) FILTER (WHERE subscription_status = 'active')    AS active_subscriptions,
    COUNT(*) FILTER (WHERE subscription_status = 'trial')     AS trial_count,
    COUNT(*) FILTER (WHERE subscription_status = 'past_due')  AS past_due_count,
    COUNT(*) FILTER (WHERE subscription_status = 'suspended') AS suspended_count,
    COUNT(*) FILTER (WHERE subscription_status = 'cancelled') AS cancelled_count
  FROM organizations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
