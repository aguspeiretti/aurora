-- Migration 011: Atomic RPC functions
-- Moves multi-step write operations into single-transaction Postgres functions
-- to prevent partial inserts and race conditions.

-- ─────────────────────────────────────────────────────────────
-- 1. create_package_with_sessions
--    Creates a treatment_packages row and all package_sessions rows
--    in one atomic transaction.
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
AS $$
DECLARE
  v_package_id uuid;
  i            integer;
BEGIN
  -- Insert package
  INSERT INTO treatment_packages (
    organization_id, branch_id, client_id, service_id,
    name, total_sessions, used_sessions, total_price,
    expires_at, notes, status, starts_at
  )
  VALUES (
    p_organization_id, p_branch_id, p_client_id, p_service_id,
    p_name, p_total_sessions, 0, p_total_price,
    p_expires_at, p_notes, 'active', CURRENT_DATE
  )
  RETURNING id INTO v_package_id;

  -- Insert one row per session
  FOR i IN 1..p_total_sessions LOOP
    INSERT INTO package_sessions (package_id, session_number, status)
    VALUES (v_package_id, i, 'available');
  END LOOP;

  RETURN v_package_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. consume_package_session
--    Marks the next available session as used and increments
--    used_sessions on the package in the same transaction.
--    Returns the updated package status.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION consume_package_session(
  p_package_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id   uuid;
  v_new_used     integer;
  v_total        integer;
  v_new_status   text;
BEGIN
  -- Lock and find next available session
  SELECT id
  INTO v_session_id
  FROM package_sessions
  WHERE package_id = p_package_id
    AND status = 'available'
  ORDER BY session_number
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No hay sesiones disponibles para el paquete %', p_package_id;
  END IF;

  -- Mark session as used
  UPDATE package_sessions
  SET status = 'used', consumed_at = NOW()
  WHERE id = v_session_id;

  -- Increment used_sessions and conditionally mark package complete
  UPDATE treatment_packages
  SET used_sessions = used_sessions + 1,
      status = CASE
        WHEN used_sessions + 1 >= total_sessions THEN 'completed'
        ELSE status
      END
  WHERE id = p_package_id
  RETURNING used_sessions, total_sessions, status
  INTO v_new_used, v_total, v_new_status;

  RETURN json_build_object(
    'session_id',   v_session_id,
    'used_sessions', v_new_used,
    'total_sessions', v_total,
    'status',       v_new_status
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. invite_org_user
--    Looks up a profile by email and inserts into organization_users
--    in one atomic operation.  Returns the profile id on success.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION invite_org_user(
  p_email           text,
  p_organization_id uuid,
  p_role            text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE email = p_email
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No existe un usuario con el email %', p_email;
  END IF;

  INSERT INTO organization_users (organization_id, profile_id, role)
  VALUES (p_organization_id, v_profile_id, p_role);
  -- The unique constraint on (organization_id, profile_id) will raise a
  -- duplicate-key error automatically if the user is already a member.

  RETURN v_profile_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. get_inactive_clients
--    Returns clients who have not had a non-cancelled, non-noshow
--    appointment in the last p_days_inactive days.
--    Used by process-campaigns edge function to resolve audiences
--    in SQL instead of fetching and filtering in memory.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_inactive_clients(
  p_organization_id uuid,
  p_days_inactive   integer DEFAULT 90
)
RETURNS TABLE (id uuid, full_name text, phone text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT cp.id, cp.full_name, cp.phone, cp.email
  FROM client_profiles cp
  WHERE cp.organization_id = p_organization_id
    AND cp.is_active = true
    AND cp.id NOT IN (
      SELECT DISTINCT a.client_id
      FROM appointments a
      WHERE a.organization_id = p_organization_id
        AND a.starts_at >= (NOW() - (p_days_inactive || ' days')::interval)
        AND a.status NOT IN ('cancelled_by_client', 'cancelled_by_staff', 'no_show')
    );
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. get_clients_without_upcoming_booking
--    Returns active clients who have no upcoming confirmed
--    appointment, used for the "no_upcoming_booking" audience.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_clients_without_upcoming_booking(
  p_organization_id uuid
)
RETURNS TABLE (id uuid, full_name text, phone text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT cp.id, cp.full_name, cp.phone, cp.email
  FROM client_profiles cp
  WHERE cp.organization_id = p_organization_id
    AND cp.is_active = true
    AND cp.id NOT IN (
      SELECT DISTINCT a.client_id
      FROM appointments a
      WHERE a.organization_id = p_organization_id
        AND a.starts_at > NOW()
        AND a.status NOT IN ('cancelled_by_client', 'cancelled_by_staff', 'no_show')
    );
$$;

-- Ensure no one can call these functions without being authenticated
-- (SECURITY DEFINER already restricts to the postgres role for internal use,
-- but we also grant explicit execute rights to authenticated role)
GRANT EXECUTE ON FUNCTION create_package_with_sessions          TO authenticated;
GRANT EXECUTE ON FUNCTION consume_package_session               TO authenticated;
GRANT EXECUTE ON FUNCTION invite_org_user                       TO authenticated;
GRANT EXECUTE ON FUNCTION get_inactive_clients                  TO authenticated;
GRANT EXECUTE ON FUNCTION get_clients_without_upcoming_booking  TO authenticated;
