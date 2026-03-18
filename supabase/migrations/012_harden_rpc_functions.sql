-- Migration 012: Harden SECURITY DEFINER functions
-- Changes:
--   • SET search_path = public on every SECURITY DEFINER function (prevents
--     search-path injection attacks where an attacker-controlled schema shadow
--     system objects).
--   • auth.uid() guard: must be authenticated or service-role.
--   • Org-membership guard on write functions (create_package, consume_session,
--     invite_org_user) — prevents any authenticated user from operating on orgs
--     they don't belong to.
--   • Role guard on invite_org_user: only owner/manager may invite.
--   • Validated role enum values in invite_org_user.
--   • Package-state guards in consume_package_session (expired, cancelled, completed).
--   • Package row-level lock moved before session lock to prevent race conditions.
--   • NOT IN → NOT EXISTS in audience queries (NOT IN silently returns nothing if
--     any subquery row is NULL; NOT EXISTS is NULL-safe and typically faster with
--     an index on client_id).
--   • New function: get_birthday_month_clients — moves birthday month filter from
--     JS to SQL, avoiding a full-table fetch in process-campaigns.

-- ─────────────────────────────────────────────────────────────
-- 1. create_package_with_sessions  (hardened)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_package_with_sessions(
  p_organization_id  uuid,
  p_branch_id        uuid,
  p_client_id        uuid,
  p_service_id       uuid,
  p_name             text,
  p_total_sessions   integer,
  p_total_price      numeric,
  p_expires_at       date,
  p_notes            text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_package_id  uuid;
  v_caller_role text;
  i             integer;
BEGIN
  -- 1. Must be authenticated (service-role callers have uid = NULL, which is fine)
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM organization_users
    WHERE organization_id = p_organization_id
      AND profile_id      = auth.uid()
      AND active          = true
  ) THEN
    RAISE EXCEPTION 'No autorizado: no pertenecés a esta organización';
  END IF;

  -- 2. Input validation
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'El nombre del paquete no puede estar vacío';
  END IF;
  IF p_total_sessions IS NULL OR p_total_sessions < 1 THEN
    RAISE EXCEPTION 'La cantidad de sesiones debe ser al menos 1';
  END IF;
  IF p_total_price IS NOT NULL AND p_total_price < 0 THEN
    RAISE EXCEPTION 'El precio no puede ser negativo';
  END IF;

  -- 3. Client must belong to this org
  IF NOT EXISTS (
    SELECT 1 FROM client_profiles
    WHERE id = p_client_id AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'La clienta no pertenece a esta organización';
  END IF;

  -- 4. Service must belong to this org (if provided)
  IF p_service_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM services
    WHERE id = p_service_id AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'El servicio no pertenece a esta organización';
  END IF;

  -- 5. Branch must belong to this org (if provided)
  IF p_branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM branches
    WHERE id = p_branch_id AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'La sucursal no pertenece a esta organización';
  END IF;

  -- 6. Insert package
  INSERT INTO treatment_packages (
    organization_id, branch_id, client_id, service_id,
    name, total_sessions, used_sessions, total_price,
    expires_at, notes, status, starts_at
  ) VALUES (
    p_organization_id, p_branch_id, p_client_id, p_service_id,
    trim(p_name), p_total_sessions, 0, p_total_price,
    p_expires_at, p_notes, 'active', CURRENT_DATE
  )
  RETURNING id INTO v_package_id;

  -- 7. Insert one row per session
  FOR i IN 1..p_total_sessions LOOP
    INSERT INTO package_sessions (package_id, session_number, status)
    VALUES (v_package_id, i, 'available');
  END LOOP;

  RETURN v_package_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. consume_package_session  (hardened)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION consume_package_session(
  p_package_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id   uuid;
  v_new_used     integer;
  v_total        integer;
  v_new_status   text;
  v_pkg          record;
BEGIN
  -- 1. Lock the package row first to serialize concurrent calls
  SELECT id, organization_id, status, expires_at
  INTO   v_pkg
  FROM   treatment_packages
  WHERE  id = p_package_id
  FOR    UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paquete no encontrado';
  END IF;

  -- 2. Caller must belong to the package's org (skip when service-role)
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM organization_users
    WHERE organization_id = v_pkg.organization_id
      AND profile_id      = auth.uid()
      AND active          = true
  ) THEN
    RAISE EXCEPTION 'No autorizado: no pertenecés a esta organización';
  END IF;

  -- 3. Package state guards
  IF v_pkg.status = 'completed' THEN
    RAISE EXCEPTION 'El paquete ya fue completado';
  END IF;
  IF v_pkg.status = 'cancelled' THEN
    RAISE EXCEPTION 'El paquete está cancelado';
  END IF;
  IF v_pkg.status <> 'active' THEN
    RAISE EXCEPTION 'El paquete no está activo (estado: %)', v_pkg.status;
  END IF;
  IF v_pkg.expires_at IS NOT NULL AND v_pkg.expires_at < CURRENT_DATE THEN
    RAISE EXCEPTION 'El paquete venció el %', v_pkg.expires_at;
  END IF;

  -- 4. Find next available session (SKIP LOCKED for concurrent callers)
  SELECT id INTO v_session_id
  FROM   package_sessions
  WHERE  package_id = p_package_id
    AND  status     = 'available'
  ORDER  BY session_number
  LIMIT  1
  FOR    UPDATE SKIP LOCKED;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No hay sesiones disponibles para el paquete %', p_package_id;
  END IF;

  -- 5. Mark session used
  UPDATE package_sessions
  SET    status = 'used', consumed_at = NOW()
  WHERE  id = v_session_id;

  -- 6. Increment counter and conditionally complete the package
  UPDATE treatment_packages
  SET
    used_sessions = used_sessions + 1,
    status = CASE
      WHEN used_sessions + 1 >= total_sessions THEN 'completed'
      ELSE status
    END
  WHERE  id = p_package_id
  RETURNING used_sessions, total_sessions, status
  INTO v_new_used, v_total, v_new_status;

  RETURN json_build_object(
    'session_id',     v_session_id,
    'used_sessions',  v_new_used,
    'total_sessions', v_total,
    'status',         v_new_status
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. invite_org_user  (hardened)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION invite_org_user(
  p_email           text,
  p_organization_id uuid,
  p_role            text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id  uuid;
  v_caller_role text;
BEGIN
  -- 1. Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado: se requiere sesión activa';
  END IF;

  -- 2. Caller must be owner or manager
  SELECT role INTO v_caller_role
  FROM   organization_users
  WHERE  organization_id = p_organization_id
    AND  profile_id      = auth.uid()
    AND  active          = true;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'No autorizado: no pertenecés a esta organización';
  END IF;
  IF v_caller_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'No autorizado: se requiere rol owner o manager';
  END IF;

  -- 3. Validate assignable roles (owner cannot be assigned via invite)
  IF p_role NOT IN ('manager', 'receptionist', 'technician', 'cashier') THEN
    RAISE EXCEPTION 'Rol inválido: %. Roles permitidos: manager, receptionist, technician, cashier', p_role;
  END IF;

  -- 4. Validate and normalize email
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'El email no puede estar vacío';
  END IF;

  -- 5. Look up profile (normalize to lowercase to match Supabase Auth storage)
  SELECT id INTO v_profile_id
  FROM   profiles
  WHERE  email = lower(trim(p_email))
  LIMIT  1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No existe un usuario con el email %', lower(trim(p_email));
  END IF;

  -- 6. Insert — unique constraint (organization_id, profile_id) handles duplicates
  INSERT INTO organization_users (organization_id, profile_id, role)
  VALUES (p_organization_id, v_profile_id, p_role);

  RETURN v_profile_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. get_inactive_clients  (hardened + NOT EXISTS)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_inactive_clients(
  p_organization_id uuid,
  p_days_inactive   integer DEFAULT 90
)
RETURNS TABLE (id uuid, full_name text, phone text, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auth check: authenticated callers must belong to org;
  -- service-role callers (auth.uid() IS NULL) bypass this guard.
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM organization_users
    WHERE organization_id = p_organization_id
      AND profile_id      = auth.uid()
      AND active          = true
  ) THEN
    RAISE EXCEPTION 'No autorizado: no pertenecés a esta organización';
  END IF;

  IF p_days_inactive < 1 THEN
    RAISE EXCEPTION 'p_days_inactive debe ser al menos 1';
  END IF;

  RETURN QUERY
  SELECT cp.id, cp.full_name, cp.phone, cp.email
  FROM   client_profiles cp
  WHERE  cp.organization_id = p_organization_id
    AND  cp.is_blocked = false
    AND  NOT EXISTS (
      SELECT 1
      FROM   appointments a
      WHERE  a.client_id       = cp.id
        AND  a.organization_id = p_organization_id
        AND  a.starts_at       >= NOW() - (p_days_inactive || ' days')::interval
        AND  a.status NOT IN ('cancelled_by_client', 'cancelled_by_staff', 'no_show')
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. get_clients_without_upcoming_booking  (hardened + NOT EXISTS)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_clients_without_upcoming_booking(
  p_organization_id uuid
)
RETURNS TABLE (id uuid, full_name text, phone text, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM organization_users
    WHERE organization_id = p_organization_id
      AND profile_id      = auth.uid()
      AND active          = true
  ) THEN
    RAISE EXCEPTION 'No autorizado: no pertenecés a esta organización';
  END IF;

  RETURN QUERY
  SELECT cp.id, cp.full_name, cp.phone, cp.email
  FROM   client_profiles cp
  WHERE  cp.organization_id = p_organization_id
    AND  cp.is_blocked = false
    AND  NOT EXISTS (
      SELECT 1
      FROM   appointments a
      WHERE  a.client_id       = cp.id
        AND  a.organization_id = p_organization_id
        AND  a.starts_at       > NOW()
        AND  a.status NOT IN ('cancelled_by_client', 'cancelled_by_staff', 'no_show')
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. get_birthday_month_clients  (NEW)
--    Filters clients by birth month in SQL — replaces the JS-side
--    full-table fetch + filter in process-campaigns.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_birthday_month_clients(
  p_organization_id uuid,
  p_month           integer
)
RETURNS TABLE (id uuid, full_name text, phone text, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM organization_users
    WHERE organization_id = p_organization_id
      AND profile_id      = auth.uid()
      AND active          = true
  ) THEN
    RAISE EXCEPTION 'No autorizado: no pertenecés a esta organización';
  END IF;

  IF p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'p_month debe estar entre 1 y 12';
  END IF;

  RETURN QUERY
  SELECT cp.id, cp.full_name, cp.phone, cp.email
  FROM   client_profiles cp
  WHERE  cp.organization_id = p_organization_id
    AND  cp.is_blocked      = false
    AND  cp.birthday        IS NOT NULL
    AND  EXTRACT(MONTH FROM cp.birthday) = p_month;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Grants
-- ─────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION create_package_with_sessions           TO authenticated;
GRANT EXECUTE ON FUNCTION consume_package_session                TO authenticated;
GRANT EXECUTE ON FUNCTION invite_org_user                        TO authenticated;
GRANT EXECUTE ON FUNCTION get_inactive_clients                   TO authenticated;
GRANT EXECUTE ON FUNCTION get_clients_without_upcoming_booking   TO authenticated;
GRANT EXECUTE ON FUNCTION get_birthday_month_clients             TO authenticated;
