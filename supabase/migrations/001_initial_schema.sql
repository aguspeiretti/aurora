-- ============================================================
-- BeautyDesk — Migración inicial del esquema
-- Versión: 1.0.0
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- búsqueda fuzzy en nombres

-- ============================================================
-- TIPOS ENUMERADOS
-- ============================================================

CREATE TYPE user_role AS ENUM ('owner', 'manager', 'receptionist', 'technician', 'cashier');
CREATE TYPE appointment_status AS ENUM (
  'pending', 'confirmed', 'checked_in', 'in_service',
  'completed', 'cancelled_by_client', 'cancelled_by_staff', 'no_show', 'rescheduled'
);
CREATE TYPE appointment_source AS ENUM (
  'manual', 'online', 'whatsapp', 'instagram', 'google', 'phone'
);
CREATE TYPE service_category_type AS ENUM (
  'nails', 'laser_hair_removal', 'waxing', 'massage',
  'facial', 'lashes_brows', 'body_treatment', 'other'
);
CREATE TYPE resource_type AS ENUM (
  'cabin', 'box', 'stretcher', 'chair', 'laser_machine', 'machine', 'general'
);
CREATE TYPE deposit_type AS ENUM ('fixed', 'percentage');
CREATE TYPE payment_method AS ENUM (
  'cash', 'transfer', 'debit_card', 'credit_card', 'qr', 'gift_card', 'package', 'other'
);
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'refunded', 'cancelled');
CREATE TYPE sale_item_type AS ENUM ('service', 'product', 'package', 'gift_card', 'other');
CREATE TYPE cash_session_status AS ENUM ('open', 'closed');
CREATE TYPE gift_card_status AS ENUM ('active', 'used', 'expired', 'cancelled');
CREATE TYPE gift_card_transaction_type AS ENUM ('issue', 'redeem', 'refund', 'expire', 'adjust');
CREATE TYPE package_status AS ENUM ('active', 'completed', 'expired', 'cancelled');
CREATE TYPE package_session_status AS ENUM ('available', 'used', 'expired');
CREATE TYPE inventory_movement_type AS ENUM (
  'purchase', 'sale', 'adjustment', 'internal_use', 'return', 'transfer_in', 'transfer_out', 'loss'
);
CREATE TYPE commission_type AS ENUM ('percentage', 'fixed', 'none');
CREATE TYPE notification_channel AS ENUM ('whatsapp', 'email', 'internal');
CREATE TYPE notification_event_type AS ENUM (
  'appointment_created', 'appointment_confirmed', 'appointment_reminder_24h',
  'appointment_reminder_3h', 'appointment_cancelled', 'appointment_rescheduled',
  'appointment_completed', 'post_visit_followup', 'review_request',
  'birthday_greeting', 'client_inactive', 'gift_card_expiring',
  'package_expiring', 'package_low_sessions', 'campaign_message', 'custom'
);
CREATE TYPE notification_job_status AS ENUM (
  'pending', 'processing', 'sent', 'failed', 'cancelled', 'skipped'
);
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'running', 'completed', 'cancelled');
CREATE TYPE campaign_audience_type AS ENUM (
  'all_active', 'inactive', 'birthday_month', 'no_upcoming_booking',
  'tag_based', 'package_expiring', 'gift_card_expiring', 'custom'
);
CREATE TYPE photo_type AS ENUM ('before', 'after', 'progress', 'reference');
CREATE TYPE schedule_day AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
CREATE TYPE audit_action AS ENUM (
  'create', 'update', 'delete', 'view', 'login', 'logout', 'export'
);

-- ============================================================
-- TENANCY: ORGANIZACIONES Y SUCURSALES
-- ============================================================

CREATE TABLE organizations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  logo_url          TEXT,
  primary_color     TEXT DEFAULT '#d946ef',
  secondary_color   TEXT DEFAULT '#f43f5e',
  timezone          TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  currency          TEXT NOT NULL DEFAULT 'ARS',
  currency_symbol   TEXT NOT NULL DEFAULT '$',
  country_code      TEXT DEFAULT 'AR',
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  instagram_handle  TEXT,
  cancellation_policy_hours INT DEFAULT 24,
  cancellation_policy_text  TEXT,
  booking_advance_days      INT DEFAULT 60,
  min_booking_notice_hours  INT DEFAULT 2,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE branches (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  city             TEXT,
  state            TEXT,
  country          TEXT DEFAULT 'AR',
  postal_code      TEXT,
  timezone         TEXT,
  latitude         DECIMAL(10,8),
  longitude        DECIMAL(11,8),
  online_booking_enabled BOOLEAN DEFAULT true,
  active           BOOLEAN NOT NULL DEFAULT true,
  sort_order       INT DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- ============================================================
-- PERFILES DE USUARIO
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  locale      TEXT DEFAULT 'es',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'receptionist',
  active          BOOLEAN NOT NULL DEFAULT true,
  invited_at      TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, profile_id)
);

CREATE TABLE branch_users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, profile_id)
);

-- ============================================================
-- STAFF Y PROFESIONALES
-- ============================================================

CREATE TABLE staff_profiles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  display_name     TEXT NOT NULL,
  bio              TEXT,
  color            TEXT DEFAULT '#8b5cf6',
  specialty        TEXT,
  commission_type  commission_type NOT NULL DEFAULT 'none',
  commission_value DECIMAL(10,2) DEFAULT 0,
  show_in_booking  BOOLEAN DEFAULT true,
  active           BOOLEAN NOT NULL DEFAULT true,
  sort_order       INT DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE staff_branch_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  is_primary      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, branch_id)
);

-- Horarios semanales del staff
CREATE TABLE staff_schedules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id    UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  day_of_week schedule_day NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, branch_id, day_of_week)
);

-- Ausencias y bloqueos del staff
CREATE TABLE staff_time_off (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id   UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  branch_id  UUID REFERENCES branches(id) ON DELETE CASCADE,
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  reason     TEXT,
  all_day    BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SERVICIOS Y CATEGORÍAS
-- ============================================================

CREATE TABLE service_categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  type            service_category_type NOT NULL DEFAULT 'other',
  description     TEXT,
  icon            TEXT,
  color           TEXT DEFAULT '#d946ef',
  sort_order      INT DEFAULT 0,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE services (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id             UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  name                    TEXT NOT NULL,
  description             TEXT,
  service_type            service_category_type NOT NULL DEFAULT 'other',
  duration_minutes        INT NOT NULL DEFAULT 60,
  buffer_before_minutes   INT DEFAULT 0,
  buffer_after_minutes    INT DEFAULT 0,
  price                   DECIMAL(12,2) NOT NULL DEFAULT 0,
  requires_staff          BOOLEAN DEFAULT true,
  requires_resource       BOOLEAN DEFAULT false,
  online_booking_enabled  BOOLEAN DEFAULT true,
  deposit_required        BOOLEAN DEFAULT false,
  deposit_type            deposit_type DEFAULT 'percentage',
  deposit_value           DECIMAL(10,2) DEFAULT 30,
  default_rebooking_days  INT,
  pre_service_notes       TEXT,
  contraindications       TEXT,
  suggested_consumables   TEXT,
  color                   TEXT,
  sort_order              INT DEFAULT 0,
  active                  BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Servicios adicionales (addons)
CREATE TABLE service_addons (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id   UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  duration_minutes INT DEFAULT 0,
  price        DECIMAL(10,2) DEFAULT 0,
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff habilitado por servicio
CREATE TABLE staff_services (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id   UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, service_id)
);

-- ============================================================
-- RECURSOS (cabinas, equipos, etc.)
-- ============================================================

CREATE TABLE resources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type            resource_type NOT NULL DEFAULT 'general',
  name            TEXT NOT NULL,
  description     TEXT,
  notes           TEXT,
  color           TEXT DEFAULT '#06b6d4',
  active          BOOLEAN DEFAULT true,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relación servicio-recurso requerido
CREATE TABLE service_resources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  resource_type resource_type,
  required    BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TURNOS / AGENDA
-- ============================================================

CREATE TABLE appointments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  client_id         UUID,  -- FK added after client_profiles is created (see ALTER TABLE below)
  primary_staff_id  UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  resource_id       UUID REFERENCES resources(id) ON DELETE SET NULL,
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ NOT NULL,
  status            appointment_status NOT NULL DEFAULT 'pending',
  source            appointment_source NOT NULL DEFAULT 'manual',
  notes             TEXT,
  internal_notes    TEXT,
  total_price       DECIMAL(12,2) DEFAULT 0,
  deposit_amount    DECIMAL(10,2) DEFAULT 0,
  deposit_status    payment_status DEFAULT 'pending',
  cancellation_reason TEXT,
  rescheduled_from  UUID REFERENCES appointments(id),
  online_token      TEXT UNIQUE,
  created_by        UUID REFERENCES profiles(id),
  confirmed_at      TIMESTAMPTZ,
  checked_in_at     TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE appointment_services (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id       UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id           UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  assigned_staff_id    UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  assigned_resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  duration_minutes     INT NOT NULL,
  price                DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order           INT DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE appointment_status_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  from_status    appointment_status,
  to_status      appointment_status NOT NULL,
  changed_by     UUID REFERENCES profiles(id),
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lista de espera
CREATE TABLE waitlist_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL,  -- FK added after client_profiles is created (see ALTER TABLE below)
  service_id      UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  preferred_staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  preferred_date_from DATE,
  preferred_date_to   DATE,
  preferred_time_from TIME,
  preferred_time_to   TIME,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'waiting', -- waiting, offered, booked, cancelled
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENTES / CRM
-- ============================================================

CREATE TABLE client_profiles (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name                   TEXT NOT NULL,
  first_name                  TEXT,
  last_name                   TEXT,
  phone                       TEXT,
  email                       TEXT,
  birthday                    DATE,
  instagram_handle            TEXT,
  referral_source             TEXT,
  marketing_opt_in_email      BOOLEAN DEFAULT false,
  marketing_opt_in_whatsapp   BOOLEAN DEFAULT false,
  notes                       TEXT,
  no_show_count               INT DEFAULT 0,
  cancellation_count          INT DEFAULT 0,
  total_spent                 DECIMAL(14,2) DEFAULT 0,
  total_visits                INT DEFAULT 0,
  last_visit_at               TIMESTAMPTZ,
  next_visit_at               TIMESTAMPTZ,
  preferred_staff_id          UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  preferred_branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_blocked                  BOOLEAN DEFAULT false,
  block_reason                TEXT,
  skin_type                   TEXT,
  allergies                   TEXT,
  sensitivities               TEXT,
  contraindications           TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Now that client_profiles exists, add the deferred FK constraints
ALTER TABLE appointments
  ADD CONSTRAINT appointments_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES client_profiles(id) ON DELETE SET NULL;

ALTER TABLE waitlist_entries
  ADD CONSTRAINT waitlist_entries_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES client_profiles(id) ON DELETE CASCADE;

CREATE TABLE client_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_pinned   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE client_tags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT DEFAULT '#8b5cf6',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE TABLE client_tag_relations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES client_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, tag_id)
);

-- Fichas y formularios de clientes (no médicos)
CREATE TABLE client_forms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  form_type       TEXT NOT NULL DEFAULT 'initial', -- initial, consent, preferences, followup
  form_name       TEXT NOT NULL,
  answers_json    JSONB NOT NULL DEFAULT '{}',
  signed_at       TIMESTAMPTZ,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fotos antes/después
CREATE TABLE before_after_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
  photo_type      photo_type NOT NULL DEFAULT 'before',
  image_url       TEXT NOT NULL,
  thumbnail_url   TEXT,
  notes           TEXT,
  is_visible_to_client BOOLEAN DEFAULT false,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VENTAS / POS / CAJA
-- ============================================================

CREATE TABLE cash_sessions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id               UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  opened_by               UUID NOT NULL REFERENCES profiles(id),
  opened_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opening_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
  opening_notes           TEXT,
  closed_by               UUID REFERENCES profiles(id),
  closed_at               TIMESTAMPTZ,
  closing_amount_expected DECIMAL(12,2),
  closing_amount_actual   DECIMAL(12,2),
  closing_notes           TEXT,
  status                  cash_session_status NOT NULL DEFAULT 'open',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES client_profiles(id) ON DELETE SET NULL,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  cash_session_id UUID REFERENCES cash_sessions(id) ON DELETE SET NULL,
  sale_number     TEXT NOT NULL,
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_total  DECIMAL(12,2) NOT NULL DEFAULT 0,
  tip_amount      DECIMAL(10,2) DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status  payment_status NOT NULL DEFAULT 'pending',
  notes           TEXT,
  sold_by         UUID NOT NULL REFERENCES profiles(id),
  sold_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voided_at       TIMESTAMPTZ,
  voided_by       UUID REFERENCES profiles(id),
  void_reason     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence para sale_number por organización
CREATE SEQUENCE IF NOT EXISTS sale_number_seq START WITH 1000;

CREATE TABLE sale_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id        UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_type      sale_item_type NOT NULL,
  service_id     UUID REFERENCES services(id) ON DELETE SET NULL,
  product_id     UUID,  -- FK to products added below via ALTER TABLE
  package_id     UUID,  -- FK to treatment_packages added below via ALTER TABLE
  gift_card_id   UUID,  -- FK to gift_cards added below via ALTER TABLE
  description    TEXT NOT NULL,
  quantity       DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price     DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_pct   DECIMAL(5,2) DEFAULT 0,
  discount_total DECIMAL(10,2) DEFAULT 0,
  line_total     DECIMAL(12,2) NOT NULL DEFAULT 0,
  staff_id       UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method      payment_method NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  status      payment_status NOT NULL DEFAULT 'paid',
  paid_at     TIMESTAMPTZ DEFAULT NOW(),
  reference   TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GIFT CARDS
-- ============================================================

CREATE TABLE gift_cards (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  code             TEXT NOT NULL UNIQUE,
  original_amount  DECIMAL(12,2) NOT NULL,
  current_balance  DECIMAL(12,2) NOT NULL,
  status           gift_card_status NOT NULL DEFAULT 'active',
  purchaser_client_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL,
  recipient_name   TEXT,
  recipient_email  TEXT,
  recipient_phone  TEXT,
  personal_message TEXT,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ,
  sale_id          UUID REFERENCES sales(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gift_card_transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  type         gift_card_transaction_type NOT NULL,
  amount       DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  sale_id      UUID REFERENCES sales(id) ON DELETE SET NULL,
  notes        TEXT,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAQUETES Y SESIONES
-- ============================================================

CREATE TABLE treatment_packages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  client_id       UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
  sale_item_id    UUID REFERENCES sale_items(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  total_sessions  INT NOT NULL,
  used_sessions   INT NOT NULL DEFAULT 0,
  total_price     DECIMAL(12,2) NOT NULL DEFAULT 0,
  status          package_status NOT NULL DEFAULT 'active',
  starts_at       DATE,
  expires_at      DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE package_sessions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id     UUID NOT NULL REFERENCES treatment_packages(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  session_number INT NOT NULL,
  consumed_at    TIMESTAMPTZ,
  status         package_session_status NOT NULL DEFAULT 'available',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTOS E INVENTARIO
-- ============================================================

CREATE TABLE product_categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  sort_order      INT DEFAULT 0,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  category_id     UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  sku             TEXT,
  name            TEXT NOT NULL,
  description     TEXT,
  brand           TEXT,
  cost_price      DECIMAL(12,2) DEFAULT 0,
  sale_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock_qty       DECIMAL(10,3) NOT NULL DEFAULT 0,
  min_stock_qty   DECIMAL(10,3) DEFAULT 0,
  unit            TEXT DEFAULT 'unit',
  is_retail       BOOLEAN DEFAULT true,
  is_supply       BOOLEAN DEFAULT false,
  track_stock     BOOLEAN DEFAULT true,
  barcode         TEXT,
  image_url       TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, sku)
);

-- Now that gift_cards, treatment_packages, and products all exist,
-- add the deferred FK constraints on sale_items
ALTER TABLE sale_items
  ADD CONSTRAINT sale_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE sale_items
  ADD CONSTRAINT sale_items_package_id_fkey
  FOREIGN KEY (package_id) REFERENCES treatment_packages(id) ON DELETE SET NULL;

ALTER TABLE sale_items
  ADD CONSTRAINT sale_items_gift_card_id_fkey
  FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE SET NULL;

CREATE TABLE inventory_movements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id      UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type           inventory_movement_type NOT NULL,
  quantity       DECIMAL(10,3) NOT NULL,
  stock_before   DECIMAL(10,3) NOT NULL,
  stock_after    DECIMAL(10,3) NOT NULL,
  unit_cost      DECIMAL(12,2),
  reference_type TEXT,
  reference_id   UUID,
  notes          TEXT,
  created_by     UUID NOT NULL REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICACIONES / MARKETING
-- ============================================================

CREATE TABLE message_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel         notification_channel NOT NULL,
  event_type      notification_event_type NOT NULL,
  name            TEXT NOT NULL,
  subject         TEXT,
  body            TEXT NOT NULL,
  variables_used  TEXT[],
  is_default      BOOLEAN DEFAULT false,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_jobs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id           UUID REFERENCES branches(id) ON DELETE SET NULL,
  channel             notification_channel NOT NULL,
  event_type          notification_event_type NOT NULL,
  template_id         UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  client_id           UUID REFERENCES client_profiles(id) ON DELETE SET NULL,
  appointment_id      UUID REFERENCES appointments(id) ON DELETE CASCADE,
  recipient_name      TEXT NOT NULL,
  recipient_phone     TEXT,
  recipient_email     TEXT,
  payload_json        JSONB NOT NULL DEFAULT '{}',
  scheduled_for       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status              notification_job_status NOT NULL DEFAULT 'pending',
  provider            TEXT,
  provider_message_id TEXT,
  retry_count         INT DEFAULT 0,
  max_retries         INT DEFAULT 3,
  last_error          TEXT,
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id           UUID NOT NULL REFERENCES notification_jobs(id) ON DELETE CASCADE,
  status           notification_job_status NOT NULL,
  provider_response JSONB,
  error_message    TEXT,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CAMPAÑAS
-- ============================================================

CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  channel         notification_channel NOT NULL,
  status          campaign_status NOT NULL DEFAULT 'draft',
  audience_type   campaign_audience_type NOT NULL DEFAULT 'all_active',
  audience_filter JSONB DEFAULT '{}',
  template_id     UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  custom_message  TEXT,
  scheduled_for   TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  total_recipients INT DEFAULT 0,
  sent_count      INT DEFAULT 0,
  failed_count    INT DEFAULT 0,
  error_message   TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaign_deliveries (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id         UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  channel             notification_channel NOT NULL DEFAULT 'whatsapp',
  status              notification_job_status NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  sent_at             TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDITORÍA
-- ============================================================

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  actor_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  action          audit_action NOT NULL,
  payload_json    JSONB DEFAULT '{}',
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONFIGURACIÓN / INTEGRACIONES
-- ============================================================

CREATE TABLE integration_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  settings_json   JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

CREATE TABLE feature_flags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key     TEXT NOT NULL,
  enabled         BOOLEAN DEFAULT false,
  config_json     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, feature_key)
);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================

-- Appointments — consultas más frecuentes
CREATE INDEX idx_appointments_org_branch_date ON appointments(organization_id, branch_id, starts_at);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_staff ON appointments(primary_staff_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_starts_at ON appointments(starts_at);
CREATE INDEX idx_appointments_online_token ON appointments(online_token) WHERE online_token IS NOT NULL;

-- Clients
CREATE INDEX idx_clients_org ON client_profiles(organization_id);
CREATE INDEX idx_clients_phone ON client_profiles(phone);
CREATE INDEX idx_clients_email ON client_profiles(email);
CREATE INDEX idx_clients_name_trgm ON client_profiles USING gin(full_name gin_trgm_ops);
CREATE INDEX idx_clients_last_visit ON client_profiles(last_visit_at);

-- Sales
CREATE INDEX idx_sales_org_branch ON sales(organization_id, branch_id);
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_sales_sold_at ON sales(sold_at);
CREATE INDEX idx_sales_appointment ON sales(appointment_id);

-- Inventory
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_org ON inventory_movements(organization_id, branch_id);
CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_products_low_stock ON products(organization_id) WHERE track_stock = true;

-- Notification jobs
CREATE INDEX idx_notification_jobs_scheduled ON notification_jobs(scheduled_for, status);
CREATE INDEX idx_notification_jobs_org ON notification_jobs(organization_id);
CREATE INDEX idx_notification_jobs_status ON notification_jobs(status);

-- Staff
CREATE INDEX idx_staff_org ON staff_profiles(organization_id);
CREATE INDEX idx_staff_services ON staff_services(staff_id, service_id);

-- Organization users
CREATE INDEX idx_org_users_profile ON organization_users(profile_id);
CREATE INDEX idx_branch_users_profile ON branch_users(profile_id);

-- Packages
CREATE INDEX idx_packages_client ON treatment_packages(client_id);
CREATE INDEX idx_packages_status ON treatment_packages(status, expires_at);

-- Gift cards
CREATE INDEX idx_gift_cards_code ON gift_cards(code);
CREATE INDEX idx_gift_cards_org ON gift_cards(organization_id);

-- ============================================================
-- FUNCIONES DE UTILIDAD
-- ============================================================

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en tablas con updated_at
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_client_profiles_updated_at
  BEFORE UPDATE ON client_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_gift_cards_updated_at
  BEFORE UPDATE ON gift_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_treatment_packages_updated_at
  BEFORE UPDATE ON treatment_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_notification_jobs_updated_at
  BEFORE UPDATE ON notification_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para generar número de venta
CREATE OR REPLACE FUNCTION generate_sale_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_val BIGINT;
  org_prefix TEXT;
BEGIN
  SELECT UPPER(LEFT(slug, 3)) INTO org_prefix FROM organizations WHERE id = org_id;
  next_val := nextval('sale_number_seq');
  RETURN org_prefix || '-' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Función para generar código de gift card
CREATE OR REPLACE FUNCTION generate_gift_card_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || SUBSTR(chars, floor(random() * length(chars) + 1)::int, 1);
    IF i IN (4, 8) THEN result := result || '-'; END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar estadísticas del cliente
CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE client_profiles
    SET
      total_visits = total_visits + 1,
      last_visit_at = NEW.completed_at
    WHERE id = NEW.client_id;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'no_show' AND OLD.status != 'no_show' THEN
    UPDATE client_profiles
    SET no_show_count = no_show_count + 1
    WHERE id = NEW.client_id;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IN ('cancelled_by_client') AND OLD.status NOT IN ('cancelled_by_client') THEN
    UPDATE client_profiles
    SET cancellation_count = cancellation_count + 1
    WHERE id = NEW.client_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_client_stats
  AFTER UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_client_stats();

-- Función para actualizar stock desde movimiento
CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_qty = NEW.stock_after
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_inventory_movement
  AFTER INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION apply_inventory_movement();

-- Función para crear perfil al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
