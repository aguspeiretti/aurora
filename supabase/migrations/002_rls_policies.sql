-- ============================================================
-- BeautyDesk — Políticas RLS (Row Level Security)
-- ============================================================

-- Activar RLS en todas las tablas sensibles
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE before_after_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Obtener el rol del usuario en una organización
CREATE OR REPLACE FUNCTION get_user_role_in_org(org_id UUID)
RETURNS user_role AS $$
  SELECT role FROM organization_users
  WHERE profile_id = auth.uid() AND organization_id = org_id AND active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verificar si el usuario pertenece a una organización
CREATE OR REPLACE FUNCTION user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_users
    WHERE profile_id = auth.uid() AND organization_id = org_id AND active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verificar si el usuario es owner o manager en una organización
CREATE OR REPLACE FUNCTION user_is_owner_or_manager(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_users
    WHERE profile_id = auth.uid()
      AND organization_id = org_id
      AND role IN ('owner', 'manager')
      AND active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verificar si el usuario tiene acceso a una sucursal
CREATE OR REPLACE FUNCTION user_has_branch_access(b_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM branch_users
    WHERE profile_id = auth.uid() AND branch_id = b_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Obtener las organizaciones del usuario
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(organization_id) FROM organization_users
  WHERE profile_id = auth.uid() AND active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- POLICIES — PROFILES
-- ============================================================

-- Los usuarios pueden ver y editar su propio perfil
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Los miembros de una organización pueden ver perfiles de sus compañeros
CREATE POLICY "profiles_select_org_members" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT profile_id FROM organization_users
      WHERE organization_id = ANY(get_user_org_ids())
    )
  );

-- ============================================================
-- POLICIES — ORGANIZATIONS
-- ============================================================

CREATE POLICY "organizations_select_member" ON organizations
  FOR SELECT USING (user_belongs_to_org(id));

CREATE POLICY "organizations_update_owner" ON organizations
  FOR UPDATE USING (get_user_role_in_org(id) = 'owner');

-- ============================================================
-- POLICIES — BRANCHES
-- ============================================================

CREATE POLICY "branches_select_org_member" ON branches
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "branches_insert_owner_manager" ON branches
  FOR INSERT WITH CHECK (user_is_owner_or_manager(organization_id));

CREATE POLICY "branches_update_owner_manager" ON branches
  FOR UPDATE USING (user_is_owner_or_manager(organization_id));

-- ============================================================
-- POLICIES — ORGANIZATION_USERS
-- ============================================================

CREATE POLICY "org_users_select_own_org" ON organization_users
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "org_users_insert_owner" ON organization_users
  FOR INSERT WITH CHECK (get_user_role_in_org(organization_id) = 'owner');

CREATE POLICY "org_users_update_owner" ON organization_users
  FOR UPDATE USING (get_user_role_in_org(organization_id) = 'owner');

-- ============================================================
-- POLICIES — STAFF PROFILES
-- ============================================================

CREATE POLICY "staff_select_org_member" ON staff_profiles
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "staff_insert_owner_manager" ON staff_profiles
  FOR INSERT WITH CHECK (user_is_owner_or_manager(organization_id));

CREATE POLICY "staff_update_owner_manager" ON staff_profiles
  FOR UPDATE USING (user_is_owner_or_manager(organization_id));

CREATE POLICY "staff_delete_owner" ON staff_profiles
  FOR DELETE USING (get_user_role_in_org(organization_id) = 'owner');

-- ============================================================
-- POLICIES — SERVICES
-- ============================================================

CREATE POLICY "services_select_org_member" ON services
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "services_insert_owner_manager" ON services
  FOR INSERT WITH CHECK (user_is_owner_or_manager(organization_id));

CREATE POLICY "services_update_owner_manager" ON services
  FOR UPDATE USING (user_is_owner_or_manager(organization_id));

CREATE POLICY "service_categories_select_org_member" ON service_categories
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "service_categories_write_owner_manager" ON service_categories
  FOR ALL USING (user_is_owner_or_manager(organization_id));

-- ============================================================
-- POLICIES — RESOURCES
-- ============================================================

CREATE POLICY "resources_select_org_member" ON resources
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "resources_write_owner_manager" ON resources
  FOR ALL USING (user_is_owner_or_manager(organization_id));

-- ============================================================
-- POLICIES — APPOINTMENTS
-- ============================================================

-- Todos los miembros de la org pueden ver turnos de la org
CREATE POLICY "appointments_select_org_member" ON appointments
  FOR SELECT USING (user_belongs_to_org(organization_id));

-- Crear turnos: receptionist, manager, owner
CREATE POLICY "appointments_insert_staff" ON appointments
  FOR INSERT WITH CHECK (
    get_user_role_in_org(organization_id) IN ('owner', 'manager', 'receptionist')
  );

-- Actualizar turnos: mismos roles
CREATE POLICY "appointments_update_staff" ON appointments
  FOR UPDATE USING (
    get_user_role_in_org(organization_id) IN ('owner', 'manager', 'receptionist')
  );

-- El técnico solo puede ver y actualizar sus propios turnos
CREATE POLICY "appointments_technician_own" ON appointments
  FOR SELECT USING (
    get_user_role_in_org(organization_id) = 'technician'
    AND primary_staff_id IN (
      SELECT id FROM staff_profiles WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "appointments_technician_update_own" ON appointments
  FOR UPDATE USING (
    get_user_role_in_org(organization_id) = 'technician'
    AND primary_staff_id IN (
      SELECT id FROM staff_profiles WHERE profile_id = auth.uid()
    )
  );

-- Historial de estados
CREATE POLICY "appt_history_select_org" ON appointment_status_history
  FOR SELECT USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY "appt_services_select_org" ON appointment_services
  FOR SELECT USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY "appt_services_write_org" ON appointment_services
  FOR ALL USING (
    appointment_id IN (
      SELECT id FROM appointments
      WHERE organization_id = ANY(get_user_org_ids())
    )
  );

-- ============================================================
-- POLICIES — CLIENTS
-- ============================================================

CREATE POLICY "clients_select_org_member" ON client_profiles
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "clients_insert_staff" ON client_profiles
  FOR INSERT WITH CHECK (
    get_user_role_in_org(organization_id) IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY "clients_update_staff" ON client_profiles
  FOR UPDATE USING (
    get_user_role_in_org(organization_id) IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY "client_notes_org_member" ON client_notes
  FOR ALL USING (
    client_id IN (
      SELECT id FROM client_profiles WHERE organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY "client_tags_org_member" ON client_tags
  FOR ALL USING (user_belongs_to_org(organization_id));

CREATE POLICY "client_tag_relations_org" ON client_tag_relations
  FOR ALL USING (
    client_id IN (
      SELECT id FROM client_profiles WHERE organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY "client_forms_org_member" ON client_forms
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "client_forms_write_staff" ON client_forms
  FOR INSERT WITH CHECK (user_belongs_to_org(organization_id));

CREATE POLICY "before_after_photos_org" ON before_after_photos
  FOR ALL USING (user_belongs_to_org(organization_id));

-- ============================================================
-- POLICIES — SALES / POS
-- ============================================================

CREATE POLICY "sales_select_org_member" ON sales
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "sales_insert_cashier_above" ON sales
  FOR INSERT WITH CHECK (
    get_user_role_in_org(organization_id) IN ('owner', 'manager', 'receptionist', 'cashier')
  );

CREATE POLICY "sales_update_owner_manager" ON sales
  FOR UPDATE USING (
    get_user_role_in_org(organization_id) IN ('owner', 'manager')
  );

CREATE POLICY "sale_items_select_org" ON sale_items
  FOR SELECT USING (
    sale_id IN (
      SELECT id FROM sales WHERE organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY "sale_items_write_cashier" ON sale_items
  FOR ALL USING (
    sale_id IN (
      SELECT id FROM sales WHERE organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY "payments_select_org" ON payments
  FOR SELECT USING (
    sale_id IN (
      SELECT id FROM sales WHERE organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY "payments_insert_cashier" ON payments
  FOR INSERT WITH CHECK (
    sale_id IN (
      SELECT id FROM sales WHERE organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY "cash_sessions_org_member" ON cash_sessions
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "cash_sessions_write_cashier" ON cash_sessions
  FOR ALL USING (
    get_user_role_in_org(organization_id) IN ('owner', 'manager', 'cashier', 'receptionist')
  );

-- ============================================================
-- POLICIES — GIFT CARDS
-- ============================================================

CREATE POLICY "gift_cards_select_org" ON gift_cards
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "gift_cards_write_staff" ON gift_cards
  FOR ALL USING (
    get_user_role_in_org(organization_id) IN ('owner', 'manager', 'receptionist', 'cashier')
  );

CREATE POLICY "gift_card_transactions_select_org" ON gift_card_transactions
  FOR SELECT USING (
    gift_card_id IN (
      SELECT id FROM gift_cards WHERE organization_id = ANY(get_user_org_ids())
    )
  );

-- ============================================================
-- POLICIES — PACKAGES
-- ============================================================

CREATE POLICY "packages_select_org" ON treatment_packages
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "packages_write_staff" ON treatment_packages
  FOR ALL USING (
    get_user_role_in_org(organization_id) IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY "package_sessions_select_org" ON package_sessions
  FOR SELECT USING (
    package_id IN (
      SELECT id FROM treatment_packages WHERE organization_id = ANY(get_user_org_ids())
    )
  );

-- ============================================================
-- POLICIES — PRODUCTS / INVENTORY
-- ============================================================

CREATE POLICY "products_select_org" ON products
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "products_write_owner_manager" ON products
  FOR ALL USING (user_is_owner_or_manager(organization_id));

CREATE POLICY "product_categories_select_org" ON product_categories
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "product_categories_write_owner_manager" ON product_categories
  FOR ALL USING (user_is_owner_or_manager(organization_id));

CREATE POLICY "inventory_movements_select_org" ON inventory_movements
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "inventory_movements_insert_staff" ON inventory_movements
  FOR INSERT WITH CHECK (
    get_user_role_in_org(organization_id) IN ('owner', 'manager', 'receptionist', 'cashier')
  );

-- ============================================================
-- POLICIES — NOTIFICATIONS / CAMPAIGNS
-- ============================================================

CREATE POLICY "message_templates_org_member" ON message_templates
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "message_templates_write_owner_manager" ON message_templates
  FOR ALL USING (user_is_owner_or_manager(organization_id));

CREATE POLICY "campaigns_select_org" ON campaigns
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "campaigns_write_manager" ON campaigns
  FOR ALL USING (user_is_owner_or_manager(organization_id));

CREATE POLICY "campaign_deliveries_select_org" ON campaign_deliveries
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id = ANY(get_user_org_ids())
    )
  );

-- ============================================================
-- POLICIES — AUDIT LOGS
-- ============================================================

CREATE POLICY "audit_logs_select_owner_manager" ON audit_logs
  FOR SELECT USING (user_is_owner_or_manager(organization_id));

CREATE POLICY "audit_logs_insert_org_member" ON audit_logs
  FOR INSERT WITH CHECK (user_belongs_to_org(organization_id));

-- ============================================================
-- POLICIES — INTEGRATION SETTINGS
-- ============================================================

CREATE POLICY "integration_settings_select_org" ON integration_settings
  FOR SELECT USING (user_belongs_to_org(organization_id));

CREATE POLICY "integration_settings_write_owner" ON integration_settings
  FOR ALL USING (get_user_role_in_org(organization_id) = 'owner');

-- ============================================================
-- ACCESO PÚBLICO PARA PORTAL DE RESERVAS
-- El portal público accede solo a datos necesarios para reservar
-- usando políticas que permiten lectura sin autenticación
-- ============================================================

-- Función para validar token de reserva pública
CREATE OR REPLACE FUNCTION get_org_id_for_slug(org_slug TEXT)
RETURNS UUID AS $$
  SELECT id FROM organizations WHERE slug = org_slug AND active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Política de lectura pública para organizaciones (solo por slug)
CREATE POLICY "organizations_public_read" ON organizations
  FOR SELECT USING (active = true);

CREATE POLICY "branches_public_read" ON branches
  FOR SELECT USING (active = true AND online_booking_enabled = true);

CREATE POLICY "services_public_read" ON services
  FOR SELECT USING (active = true AND online_booking_enabled = true);

CREATE POLICY "service_categories_public_read" ON service_categories
  FOR SELECT USING (active = true);

CREATE POLICY "staff_public_read" ON staff_profiles
  FOR SELECT USING (active = true AND show_in_booking = true);

-- Política para crear turno desde portal público (sin autenticación)
CREATE POLICY "appointments_public_insert" ON appointments
  FOR INSERT WITH CHECK (source = 'online');

-- Política para ver turno desde link seguro (por token)
CREATE POLICY "appointments_public_token_read" ON appointments
  FOR SELECT USING (online_token IS NOT NULL AND online_token = current_setting('app.booking_token', true));
