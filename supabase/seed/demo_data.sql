-- ============================================================
-- BeautyDesk — Datos de demostración
-- ============================================================
-- IMPORTANTE: Este seed usa UUIDs fijos para poder referenciarlos
-- en scripts de prueba. Solo para entorno de desarrollo/demo.
-- ============================================================

-- IDs fijos para datos demo
DO $$
DECLARE
  org_id         UUID := '11111111-1111-1111-1111-111111111111';
  branch1_id     UUID := '22222222-2222-2222-2222-222222222221';
  branch2_id     UUID := '22222222-2222-2222-2222-222222222222';
  owner_id       UUID := '33333333-3333-3333-3333-333333333331';
  manager_id     UUID := '33333333-3333-3333-3333-333333333332';
  recep_id       UUID := '33333333-3333-3333-3333-333333333333';
  tech1_id       UUID := '33333333-3333-3333-3333-333333333334';
  tech2_id       UUID := '33333333-3333-3333-3333-333333333335';
  staff_owner_id UUID := '44444444-4444-4444-4444-444444444441';
  staff_mgr_id   UUID := '44444444-4444-4444-4444-444444444442';
  staff_tech1_id UUID := '44444444-4444-4444-4444-444444444443';
  staff_tech2_id UUID := '44444444-4444-4444-4444-444444444444';
  cat_nails_id   UUID := '55555555-5555-5555-5555-555555555551';
  cat_laser_id   UUID := '55555555-5555-5555-5555-555555555552';
  cat_wax_id     UUID := '55555555-5555-5555-5555-555555555553';
  cat_massage_id UUID := '55555555-5555-5555-5555-555555555554';
  cat_facial_id  UUID := '55555555-5555-5555-5555-555555555555';
  cat_lashes_id  UUID := '55555555-5555-5555-5555-555555555556';
  svc1_id        UUID := '66666666-6666-6666-6666-666666666661';
  svc2_id        UUID := '66666666-6666-6666-6666-666666666662';
  svc3_id        UUID := '66666666-6666-6666-6666-666666666663';
  svc4_id        UUID := '66666666-6666-6666-6666-666666666664';
  svc5_id        UUID := '66666666-6666-6666-6666-666666666665';
  svc6_id        UUID := '66666666-6666-6666-6666-666666666666';
  svc7_id        UUID := '66666666-6666-6666-6666-666666666667';
  svc8_id        UUID := '66666666-6666-6666-6666-666666666668';
  svc9_id        UUID := '66666666-6666-6666-6666-666666666669';
  svc10_id       UUID := '66666666-6666-6666-6666-666666666670';
  res1_id        UUID := '77777777-7777-7777-7777-777777777771';
  res2_id        UUID := '77777777-7777-7777-7777-777777777772';
  res3_id        UUID := '77777777-7777-7777-7777-777777777773';
  res4_id        UUID := '77777777-7777-7777-7777-777777777774';
  prod_cat1_id   UUID := '88888888-8888-8888-8888-888888888881';
  prod1_id       UUID := '99999999-9999-9999-9999-999999999991';
  prod2_id       UUID := '99999999-9999-9999-9999-999999999992';
  prod3_id       UUID := '99999999-9999-9999-9999-999999999993';
  client1_id     UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  client2_id     UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab';
  client3_id     UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac';
  client4_id     UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaad';
  client5_id     UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaae';

BEGIN

-- ============================================================
-- ORGANIZACIÓN
-- ============================================================
INSERT INTO organizations (id, name, slug, primary_color, timezone, currency, currency_symbol, phone, email, instagram_handle)
VALUES (
  org_id,
  'Centro Belleza Esencial',
  'belleza-esencial',
  '#d946ef',
  'America/Argentina/Buenos_Aires',
  'ARS',
  '$',
  '+54 11 5555-1234',
  'info@bellezaesencial.com',
  'bellezaesencial'
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SUCURSALES
-- ============================================================
INSERT INTO branches (id, organization_id, name, slug, phone, email, address, city, active)
VALUES
  (branch1_id, org_id, 'Palermo', 'palermo',
   '+54 11 5555-1234', 'palermo@bellezaesencial.com',
   'Av. Santa Fe 3450', 'Buenos Aires', true),
  (branch2_id, org_id, 'Recoleta', 'recoleta',
   '+54 11 5555-5678', 'recoleta@bellezaesencial.com',
   'Av. Callao 1200', 'Buenos Aires', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- AUTH USERS (requeridos antes de insertar profiles)
-- ============================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password,
  email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change_token_new, email_change,
  created_at, updated_at
)
VALUES
  (owner_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'owner@demo.com',   crypt('Demo1234!', gen_salt('bf')),
   NOW(), NOW(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Valentina Russo"}',
   '', '', '', '', NOW(), NOW()),
  (manager_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'manager@demo.com', crypt('Demo1234!', gen_salt('bf')),
   NOW(), NOW(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Camila Torres"}',
   '', '', '', '', NOW(), NOW()),
  (recep_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'recep@demo.com',   crypt('Demo1234!', gen_salt('bf')),
   NOW(), NOW(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Sofía Martínez"}',
   '', '', '', '', NOW(), NOW()),
  (tech1_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'tech1@demo.com',   crypt('Demo1234!', gen_salt('bf')),
   NOW(), NOW(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Florencia Gómez"}',
   '', '', '', '', NOW(), NOW()),
  (tech2_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'tech2@demo.com',   crypt('Demo1234!', gen_salt('bf')),
   NOW(), NOW(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Julieta Fernández"}',
   '', '', '', '', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PERFILES (el trigger trg_on_auth_user_created los crea al
-- insertar en auth.users; acá solo agregamos el teléfono)
-- ============================================================
UPDATE profiles SET phone = '+54 11 9999-0001' WHERE id = owner_id;
UPDATE profiles SET phone = '+54 11 9999-0002' WHERE id = manager_id;
UPDATE profiles SET phone = '+54 11 9999-0003' WHERE id = recep_id;
UPDATE profiles SET phone = '+54 11 9999-0004' WHERE id = tech1_id;
UPDATE profiles SET phone = '+54 11 9999-0005' WHERE id = tech2_id;

-- ============================================================
-- USUARIOS EN LA ORGANIZACIÓN
-- ============================================================
INSERT INTO organization_users (organization_id, profile_id, role, active)
VALUES
  (org_id, owner_id,   'owner',        true),
  (org_id, manager_id, 'manager',      true),
  (org_id, recep_id,   'receptionist', true),
  (org_id, tech1_id,   'technician',   true),
  (org_id, tech2_id,   'technician',   true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STAFF PROFILES
-- ============================================================
INSERT INTO staff_profiles (id, organization_id, profile_id, display_name, bio, color, commission_type, commission_value, active)
VALUES
  (staff_owner_id, org_id, owner_id,   'Valentina',  'Fundadora y especialista en uñas', '#8b5cf6', 'percentage', 0,    true),
  (staff_mgr_id,   org_id, manager_id, 'Camila',     'Especialista en faciales y cuidado de la piel', '#06b6d4', 'percentage', 30, true),
  (staff_tech1_id, org_id, tech1_id,   'Florencia',  'Especialista en depilación láser y cera', '#f59e0b', 'percentage', 35, true),
  (staff_tech2_id, org_id, tech2_id,   'Julieta',    'Masajista y terapeuta corporal', '#10b981',  'percentage', 35, true)
ON CONFLICT DO NOTHING;

-- Asignación a sucursales
INSERT INTO staff_branch_assignments (staff_id, branch_id, is_primary)
VALUES
  (staff_owner_id, branch1_id, true),
  (staff_mgr_id,   branch1_id, true),
  (staff_mgr_id,   branch2_id, false),
  (staff_tech1_id, branch1_id, true),
  (staff_tech1_id, branch2_id, false),
  (staff_tech2_id, branch2_id, true)
ON CONFLICT DO NOTHING;

-- Horarios demo (lunes a sábado)
INSERT INTO staff_schedules (staff_id, branch_id, day_of_week, start_time, end_time)
VALUES
  (staff_tech1_id, branch1_id, 'mon', '09:00', '18:00'),
  (staff_tech1_id, branch1_id, 'tue', '09:00', '18:00'),
  (staff_tech1_id, branch1_id, 'wed', '09:00', '18:00'),
  (staff_tech1_id, branch1_id, 'thu', '09:00', '18:00'),
  (staff_tech1_id, branch1_id, 'fri', '09:00', '18:00'),
  (staff_tech1_id, branch1_id, 'sat', '09:00', '13:00'),
  (staff_tech2_id, branch2_id, 'mon', '10:00', '19:00'),
  (staff_tech2_id, branch2_id, 'tue', '10:00', '19:00'),
  (staff_tech2_id, branch2_id, 'wed', '10:00', '19:00'),
  (staff_tech2_id, branch2_id, 'thu', '10:00', '19:00'),
  (staff_tech2_id, branch2_id, 'fri', '10:00', '19:00'),
  (staff_owner_id, branch1_id, 'mon', '09:00', '17:00'),
  (staff_owner_id, branch1_id, 'tue', '09:00', '17:00'),
  (staff_owner_id, branch1_id, 'wed', '09:00', '17:00'),
  (staff_owner_id, branch1_id, 'thu', '09:00', '17:00'),
  (staff_owner_id, branch1_id, 'fri', '09:00', '17:00')
ON CONFLICT DO NOTHING;

-- ============================================================
-- CATEGORÍAS DE SERVICIOS
-- ============================================================
INSERT INTO service_categories (id, organization_id, name, slug, type, color, sort_order)
VALUES
  (cat_nails_id,   org_id, 'Uñas',                  'unas',       'nails',              '#ec4899', 1),
  (cat_laser_id,   org_id, 'Depilación Definitiva',  'laser',      'laser_hair_removal', '#6366f1', 2),
  (cat_wax_id,     org_id, 'Depilación con Cera',    'cera',       'waxing',             '#f59e0b', 3),
  (cat_massage_id, org_id, 'Masajes',                'masajes',    'massage',            '#10b981', 4),
  (cat_facial_id,  org_id, 'Faciales',               'faciales',   'facial',             '#06b6d4', 5),
  (cat_lashes_id,  org_id, 'Cejas y Pestañas',       'cejas-pesta','lashes_brows',       '#8b5cf6', 6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SERVICIOS
-- ============================================================
INSERT INTO services (id, organization_id, category_id, name, description, service_type, duration_minutes, buffer_after_minutes, price, online_booking_enabled, default_rebooking_days, active)
VALUES
  -- Uñas
  (svc1_id, org_id, cat_nails_id,
   'Esmaltado Semipermanente', 'Esmaltado con gel UV de larga duración. Incluye preparación y terminación.',
   'nails', 75, 10, 4500.00, true, 21, true),

  (svc2_id, org_id, cat_nails_id,
   'Kapping con Esmaltado', 'Técnica kapping con fibra de vidrio y esmaltado semipermanente.',
   'nails', 90, 10, 7500.00, true, 30, true),

  (svc3_id, org_id, cat_nails_id,
   'Soft Gel (Builder Gel)', 'Uñas de soft gel con extensión y diseño. Máxima durabilidad.',
   'nails', 120, 15, 9500.00, true, 35, true),

  -- Láser
  (svc4_id, org_id, cat_laser_id,
   'Depilación Definitiva Axilas', 'Sesión de depilación láser diodo para zona de axilas.',
   'laser_hair_removal', 30, 10, 8000.00, true, 45, true),

  (svc5_id, org_id, cat_laser_id,
   'Depilación Definitiva Piernas Completas', 'Sesión láser para piernas completas.',
   'laser_hair_removal', 60, 15, 18000.00, true, 45, true),

  -- Cejas y pestañas
  (svc6_id, org_id, cat_lashes_id,
   'Lifting de Pestañas', 'Tratamiento de lifting y tinte para pestañas naturales. Resultado natural y duradero.',
   'lashes_brows', 60, 15, 9000.00, true, 56, true),

  (svc7_id, org_id, cat_lashes_id,
   'Perfilado de Cejas con Hilo', 'Definición y perfilado de cejas con hilo y tijera.',
   'lashes_brows', 30, 5, 2500.00, true, 14, true),

  -- Masajes
  (svc8_id, org_id, cat_massage_id,
   'Masaje Descontracturante', 'Masaje de tejidos profundos para aliviar contracturas y tensión muscular.',
   'massage', 60, 10, 11000.00, true, 14, true),

  -- Faciales
  (svc9_id, org_id, cat_facial_id,
   'Limpieza Facial Profunda', 'Limpieza facial completa: vapor, extracción, mascarilla y hidratación.',
   'facial', 75, 15, 8500.00, true, 30, true),

  -- Corporal
  (svc10_id, org_id, cat_massage_id,
   'Drenaje Linfático', 'Técnica de drenaje para reducir retención y mejorar circulación.',
   'massage', 60, 10, 10000.00, true, 7, true)
ON CONFLICT DO NOTHING;

-- Staff habilitado por servicio
INSERT INTO staff_services (staff_id, service_id)
VALUES
  (staff_owner_id, svc1_id),
  (staff_owner_id, svc2_id),
  (staff_owner_id, svc3_id),
  (staff_tech1_id, svc4_id),
  (staff_tech1_id, svc5_id),
  (staff_tech1_id, svc7_id),
  (staff_mgr_id,   svc6_id),
  (staff_mgr_id,   svc7_id),
  (staff_mgr_id,   svc9_id),
  (staff_tech2_id, svc8_id),
  (staff_tech2_id, svc10_id)
ON CONFLICT DO NOTHING;

-- ============================================================
-- RECURSOS
-- ============================================================
INSERT INTO resources (id, organization_id, branch_id, type, name, color)
VALUES
  (res1_id, org_id, branch1_id, 'cabin',         'Cabina 1 — Uñas',          '#ec4899'),
  (res2_id, org_id, branch1_id, 'laser_machine',  'Equipo Láser Diodo',       '#6366f1'),
  (res3_id, org_id, branch1_id, 'stretcher',      'Camilla 1 — Masajes',      '#10b981'),
  (res4_id, org_id, branch2_id, 'cabin',          'Cabina 2 — Faciales',      '#06b6d4')
ON CONFLICT DO NOTHING;

-- ============================================================
-- CATEGORÍAS Y PRODUCTOS
-- ============================================================
INSERT INTO product_categories (id, organization_id, name)
VALUES
  (prod_cat1_id, org_id, 'Esmaltes y Geles')
ON CONFLICT DO NOTHING;

INSERT INTO products (id, organization_id, branch_id, category_id, sku, name, description, cost_price, sale_price, stock_qty, min_stock_qty, is_retail, is_supply)
VALUES
  (prod1_id, org_id, branch1_id, prod_cat1_id, 'GEL-001',
   'Top Coat UV Semipermanente', 'Top coat ultra brillante para esmalte semipermanente',
   800, 2500, 15, 3, true, true),

  (prod2_id, org_id, branch1_id, prod_cat1_id, 'GEL-002',
   'Base Coat UV', 'Base adhesiva para esmalte semipermanente',
   600, 2000, 10, 3, true, true),

  (prod3_id, org_id, branch1_id, prod_cat1_id, 'ACEIT-001',
   'Aceite de Cutículas Nutritivo', 'Aceite de almendras y vitamina E para cutículas',
   400, 1200, 20, 5, true, false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- CLIENTAS DEMO
-- ============================================================
INSERT INTO client_profiles (id, organization_id, full_name, first_name, last_name, phone, email, birthday, marketing_opt_in_whatsapp, marketing_opt_in_email, total_visits, total_spent)
VALUES
  (client1_id, org_id, 'María González',   'María',    'González',   '+54 11 9111-0001', 'maria@example.com',   '1990-03-15', true,  true,  12, 87000),
  (client2_id, org_id, 'Laura Rodríguez',  'Laura',    'Rodríguez',  '+54 11 9111-0002', 'laura@example.com',   '1985-07-22', true,  false, 8,  52000),
  (client3_id, org_id, 'Ana Martínez',     'Ana',      'Martínez',   '+54 11 9111-0003', 'ana@example.com',     '1995-11-30', false, true,  3,  18500),
  (client4_id, org_id, 'Carla Pérez',      'Carla',    'Pérez',      '+54 11 9111-0004', NULL,                  '1988-01-05', true,  false, 20, 145000),
  (client5_id, org_id, 'Lucía Fernández',  'Lucía',    'Fernández',  '+54 11 9111-0005', 'lucia@example.com',   NULL,         true,  true,  1,  4500)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TURNOS DEMO (relativos a NOW() para que siempre sean relevantes)
-- ============================================================
INSERT INTO appointments (
  id, organization_id, branch_id, client_id, primary_staff_id, resource_id,
  starts_at, ends_at, status, source, total_price, created_by
)
VALUES
  -- Hoy
  (uuid_generate_v4(), org_id, branch1_id, client1_id, staff_owner_id, res1_id,
   NOW()::date + INTERVAL '10:00', NOW()::date + INTERVAL '11:15',
   'confirmed', 'manual', 4500, owner_id),

  (uuid_generate_v4(), org_id, branch1_id, client2_id, staff_tech1_id, res2_id,
   NOW()::date + INTERVAL '11:00', NOW()::date + INTERVAL '11:30',
   'confirmed', 'online', 8000, tech1_id),

  (uuid_generate_v4(), org_id, branch1_id, client3_id, staff_mgr_id, NULL,
   NOW()::date + INTERVAL '14:00', NOW()::date + INTERVAL '15:15',
   'pending', 'whatsapp', 8500, manager_id),

  (uuid_generate_v4(), org_id, branch1_id, client4_id, staff_tech1_id, res2_id,
   NOW()::date + INTERVAL '16:00', NOW()::date + INTERVAL '17:00',
   'pending', 'manual', 18000, recep_id),

  -- Mañana
  (uuid_generate_v4(), org_id, branch1_id, client5_id, staff_owner_id, res1_id,
   NOW()::date + INTERVAL '1 day' + INTERVAL '10:00', NOW()::date + INTERVAL '1 day' + INTERVAL '11:15',
   'confirmed', 'online', 9500, owner_id),

  -- Ayer (completado)
  (uuid_generate_v4(), org_id, branch1_id, client1_id, staff_tech2_id, res3_id,
   NOW()::date - INTERVAL '1 day' + INTERVAL '11:00', NOW()::date - INTERVAL '1 day' + INTERVAL '12:00',
   'completed', 'manual', 11000, manager_id)

ON CONFLICT DO NOTHING;

-- ============================================================
-- PLANTILLAS DE MENSAJES
-- ============================================================
INSERT INTO message_templates (organization_id, channel, event_type, name, subject, body, is_default, active)
VALUES
  -- WhatsApp - Confirmación
  (org_id, 'whatsapp', 'appointment_confirmed', 'Confirmación de turno', NULL,
   '¡Hola {{client_name}}! 💅 Tu turno en {{branch_name}} está confirmado para el {{appointment_date}} a las {{appointment_time}} con {{staff_name}}. Para cancelar o reprogramar: {{manage_url}} — BeautyDesk',
   true, true),

  -- WhatsApp - Recordatorio 24h
  (org_id, 'whatsapp', 'appointment_reminder_24h', 'Recordatorio 24hs', NULL,
   '¡Hola {{client_name}}! Te recordamos que mañana tenés turno en {{branch_name}} a las {{appointment_time}} para {{service_name}} con {{staff_name}}. ¡Te esperamos! 🌸',
   true, true),

  -- WhatsApp - Recordatorio 3h
  (org_id, 'whatsapp', 'appointment_reminder_3h', 'Recordatorio 3hs', NULL,
   '¡Hola {{client_name}}! En unas horas tenés turno en {{branch_name}} a las {{appointment_time}}. ¡Nos vemos pronto! ✨',
   true, true),

  -- WhatsApp - Post visita
  (org_id, 'whatsapp', 'post_visit_followup', 'Follow-up post visita', NULL,
   'Hola {{client_name}} 🌷 ¿Cómo quedaste con tu {{service_name}}? Nos encantaría saber tu opinión. ¡Gracias por visitarnos!',
   true, true),

  -- WhatsApp - Cumpleaños
  (org_id, 'whatsapp', 'birthday_greeting', 'Saludo de cumpleaños', NULL,
   '¡Feliz cumpleaños {{client_name}}! 🎂🌸 Todo el equipo de {{org_name}} te desea un día lleno de amor. ¡Tenemos un regalo especial para vos! Escribinos para más info.',
   true, true),

  -- Email - Confirmación
  (org_id, 'email', 'appointment_confirmed', 'Confirmación de turno (email)', '✅ Tu turno está confirmado — {{org_name}}',
   '<h2>¡Hola {{client_name}}!</h2><p>Tu turno está confirmado:</p><ul><li><strong>Fecha:</strong> {{appointment_date}}</li><li><strong>Hora:</strong> {{appointment_time}}</li><li><strong>Servicio:</strong> {{service_name}}</li><li><strong>Profesional:</strong> {{staff_name}}</li><li><strong>Lugar:</strong> {{branch_address}}</li></ul><p><a href="{{manage_url}}">Gestionar mi turno</a></p>',
   true, true),

  -- Email - Recordatorio
  (org_id, 'email', 'appointment_reminder_24h', 'Recordatorio de turno (email)', '⏰ Recordatorio: turno mañana — {{org_name}}',
   '<h2>¡Hola {{client_name}}!</h2><p>Te recordamos que mañana tenés turno a las <strong>{{appointment_time}}</strong> para <strong>{{service_name}}</strong>.</p><p><a href="{{manage_url}}">Ver o gestionar mi turno</a></p>',
   true, true)

ON CONFLICT DO NOTHING;

-- ============================================================
-- TAGS DE CLIENTAS
-- ============================================================
INSERT INTO client_tags (organization_id, name, color)
VALUES
  (org_id, 'VIP', '#f59e0b'),
  (org_id, 'Paquete activo', '#10b981'),
  (org_id, 'Clienta frecuente', '#6366f1'),
  (org_id, 'Alérgica', '#ef4444'),
  (org_id, 'Primera visita', '#06b6d4')
ON CONFLICT DO NOTHING;

END $$;
