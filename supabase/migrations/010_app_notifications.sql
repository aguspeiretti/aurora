-- ============================================================
-- IN-APP NOTIFICATIONS
-- Notificaciones en tiempo real para la campanita del dashboard
-- ============================================================

CREATE TABLE app_notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  type            TEXT NOT NULL DEFAULT 'appointment_created',
  title           TEXT NOT NULL,
  body            TEXT,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE CASCADE,
  read            BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_notifications_org ON app_notifications(organization_id, created_at DESC);
CREATE INDEX idx_app_notifications_unread ON app_notifications(organization_id, read) WHERE read = false;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE app_notifications;

-- RLS
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_notifications_select_org_member"
  ON app_notifications FOR SELECT
  USING (user_belongs_to_org(organization_id));

CREATE POLICY "app_notifications_update_org_member"
  ON app_notifications FOR UPDATE
  USING (user_belongs_to_org(organization_id));

-- ============================================================
-- TRIGGER: crear notificación al insertar appointment_services
-- Se dispara cuando se agrega un servicio a un turno online
-- ============================================================

CREATE OR REPLACE FUNCTION notify_new_online_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_appt        appointments%ROWTYPE;
  v_client_name TEXT;
  v_service_name TEXT;
BEGIN
  -- Obtener el turno
  SELECT * INTO v_appt FROM appointments WHERE id = NEW.appointment_id;

  -- Solo para reservas online (tienen online_token)
  IF v_appt.online_token IS NULL THEN
    RETURN NEW;
  END IF;

  -- Nombre del cliente
  SELECT full_name INTO v_client_name
  FROM client_profiles WHERE id = v_appt.client_id;

  -- Nombre del servicio
  SELECT name INTO v_service_name
  FROM services WHERE id = NEW.service_id;

  INSERT INTO app_notifications (
    organization_id,
    branch_id,
    type,
    title,
    body,
    appointment_id
  ) VALUES (
    v_appt.organization_id,
    v_appt.branch_id,
    'appointment_created',
    'Nuevo turno online',
    COALESCE(v_client_name, 'Cliente') ||
      CASE WHEN v_service_name IS NOT NULL THEN ' · ' || v_service_name ELSE '' END,
    NEW.appointment_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_new_online_appointment
  AFTER INSERT ON appointment_services
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_online_appointment();
