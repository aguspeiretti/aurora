-- ============================================================
-- BeautyDesk — Usuario Mock Completo (muestra/demo)
-- ============================================================
-- Clienta de muestra con TODOS los campos completos:
--   perfil, notas, tags, formulario, turnos, servicios,
--   ventas, productos, paquete de sesiones, gift card.
--
-- DEPENDE de: demo_data.sql (debe ejecutarse antes)
-- UUIDs fijos con prefijo bbbb/cccc/dddd/eeee para evitar
-- colisiones con los registros de demo_data.sql.
-- ============================================================

DO $$
DECLARE
  -- Referencia a los datos del seed principal
  org_id          UUID := '11111111-1111-1111-1111-111111111111';
  branch1_id      UUID := '22222222-2222-2222-2222-222222222221';
  branch2_id      UUID := '22222222-2222-2222-2222-222222222222';
  owner_id        UUID := '33333333-3333-3333-3333-333333333331';
  manager_id      UUID := '33333333-3333-3333-3333-333333333332';
  tech1_id        UUID := '33333333-3333-3333-3333-333333333334';
  tech2_id        UUID := '33333333-3333-3333-3333-333333333335';
  staff_owner_id  UUID := '44444444-4444-4444-4444-444444444441';
  staff_mgr_id    UUID := '44444444-4444-4444-4444-444444444442';
  staff_tech1_id  UUID := '44444444-4444-4444-4444-444444444443';
  staff_tech2_id  UUID := '44444444-4444-4444-4444-444444444444';
  svc1_id         UUID := '66666666-6666-6666-6666-666666666661'; -- Esmaltado Semipermanente
  svc2_id         UUID := '66666666-6666-6666-6666-666666666662'; -- Kapping con Esmaltado
  svc3_id         UUID := '66666666-6666-6666-6666-666666666663'; -- Soft Gel
  svc4_id         UUID := '66666666-6666-6666-6666-666666666664'; -- Depilación Láser Axilas
  svc5_id         UUID := '66666666-6666-6666-6666-666666666665'; -- Depilación Láser Piernas
  svc6_id         UUID := '66666666-6666-6666-6666-666666666666'; -- Lifting de Pestañas
  svc7_id         UUID := '66666666-6666-6666-6666-666666666667'; -- Perfilado de Cejas
  svc8_id         UUID := '66666666-6666-6666-6666-666666666668'; -- Masaje Descontracturante
  svc9_id         UUID := '66666666-6666-6666-6666-666666666669'; -- Limpieza Facial
  svc10_id        UUID := '66666666-6666-6666-6666-666666666670'; -- Drenaje Linfático
  res1_id         UUID := '77777777-7777-7777-7777-777777777771'; -- Cabina 1 — Uñas
  res2_id         UUID := '77777777-7777-7777-7777-777777777772'; -- Equipo Láser
  res3_id         UUID := '77777777-7777-7777-7777-777777777773'; -- Camilla Masajes
  res4_id         UUID := '77777777-7777-7777-7777-777777777774'; -- Cabina 2 — Faciales
  prod1_id        UUID := '99999999-9999-9999-9999-999999999991'; -- Top Coat UV
  prod2_id        UUID := '99999999-9999-9999-9999-999999999992'; -- Base Coat UV
  prod3_id        UUID := '99999999-9999-9999-9999-999999999993'; -- Aceite de Cutículas

  -- IDs del usuario mock
  mock_client_id  UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  -- Turnos (appointments)
  appt1_id        UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'; -- completado, hace ~90 días
  appt2_id        UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'; -- completado, hace ~60 días
  appt3_id        UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'; -- completado, hace ~30 días
  appt4_id        UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4'; -- completado, hace ~15 días
  appt5_id        UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5'; -- completado, hace ~7 días
  appt6_id        UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6'; -- próximo, en 3 días
  appt7_id        UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb7'; -- próximo, en 14 días
  appt8_id        UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb8'; -- no_show, hace ~45 días

  -- Ventas
  sale1_id        UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc'; -- venta de servicio + producto
  sale2_id        UUID := 'cccccccc-cccc-cccc-cccc-ccccccccccc2'; -- venta de paquete
  sale3_id        UUID := 'cccccccc-cccc-cccc-cccc-ccccccccccc3'; -- venta de gift card
  sale4_id        UUID := 'cccccccc-cccc-cccc-cccc-ccccccccccc4'; -- venta de productos

  -- Paquete de tratamientos
  package1_id     UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  -- Gift card
  giftcard1_id    UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

  -- Tags (resolución por nombre, sin UUID fijo en el seed principal)
  tag_vip_id             UUID;
  tag_paquete_id         UUID;
  tag_frecuente_id       UUID;

BEGIN

-- ============================================================
-- 1. PERFIL DE CLIENTA (todos los campos completos)
-- ============================================================
INSERT INTO client_profiles (
  id,
  organization_id,
  full_name,
  first_name,
  last_name,
  phone,
  email,
  birthday,
  instagram_handle,
  referral_source,
  marketing_opt_in_email,
  marketing_opt_in_whatsapp,
  notes,
  skin_type,
  allergies,
  sensitivities,
  contraindications,
  no_show_count,
  cancellation_count,
  total_spent,
  total_visits,
  last_visit_at,
  next_visit_at,
  preferred_staff_id,
  preferred_branch_id,
  is_blocked,
  block_reason
) VALUES (
  mock_client_id,
  org_id,
  'Isabella Moreno',
  'Isabella',
  'Moreno',
  '+54 11 9222-5500',
  'isabella.moreno@example.com',
  '1992-08-14',
  '@isa.moreno',
  'instagram',
  true,
  true,
  'Clienta muy puntual y detallista. Prefiere turnos de mañana. Siempre solicita diseño francés en uñas. Trae a sus amigas frecuentemente.',
  'mixto-seco',
  'Alérgica a la clorhexidina. Reacción leve a ciertos esmaltes con formaldehído.',
  'Sensible al calor en zona de axilas. Piel reactiva post-depilación.',
  'Embarazo: consultar disponibilidad de servicios. No realizar láser en zona de tatuajes.',
  1,
  0,
  312500.00,
  25,
  NOW() - INTERVAL '7 days',
  NOW() + INTERVAL '3 days',
  staff_owner_id,   -- profesional preferida: Valentina (uñas)
  branch1_id,       -- sucursal preferida: Palermo
  false,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. TAGS DE LA CLIENTA
-- ============================================================
SELECT id INTO tag_vip_id       FROM client_tags WHERE organization_id = org_id AND name = 'VIP'              LIMIT 1;
SELECT id INTO tag_paquete_id   FROM client_tags WHERE organization_id = org_id AND name = 'Paquete activo'   LIMIT 1;
SELECT id INTO tag_frecuente_id FROM client_tags WHERE organization_id = org_id AND name = 'Clienta frecuente' LIMIT 1;

INSERT INTO client_tag_relations (client_id, tag_id)
SELECT mock_client_id, id FROM (
  VALUES
    (tag_vip_id),
    (tag_paquete_id),
    (tag_frecuente_id)
) AS t(id)
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. NOTAS INTERNAS DE LA CLIENTA
-- ============================================================
INSERT INTO client_notes (client_id, created_by, content, is_pinned, created_at)
VALUES
  (mock_client_id, owner_id,
   'Isabella llegó recomendada por Carla Pérez (clienta VIP). Primera visita fue para Soft Gel, quedó muy contenta. Diseño: francés degradado. Foto tomada. Prometió volver en 35 días.',
   true, NOW() - INTERVAL '90 days'),

  (mock_client_id, manager_id,
   'Realizamos limpieza facial profunda. Piel mixta con tendencia a deshidratación en pómulos. Buena tolerancia a vapor. Aplicamos mascarilla de ácido hialurónico. Recomendé rutina de hidratación en casa con sérum de vitamina C.',
   false, NOW() - INTERVAL '60 days'),

  (mock_client_id, tech1_id,
   'Inicio de paquete de depilación láser piernas completas (10 sesiones). Fototipo II, vello oscuro fino. Parámetros: fluencia 25 J/cm², ancho de pulso 30ms. Sin reacciones adversas. Próxima sesión en 45 días.',
   false, NOW() - INTERVAL '45 days'),

  (mock_client_id, owner_id,
   'Isabella compró gift card de $20.000 para regalar a su mamá en su cumpleaños. Solicita que se imprima en sobre personalizado. Gift card activa, sin uso aún.',
   false, NOW() - INTERVAL '30 days'),

  (mock_client_id, tech1_id,
   'Sesión 2 de paquete láser piernas: excelente respuesta. Reducción visible aprox 30%. Parámetros ajustados: fluencia 28 J/cm². Sin efectos secundarios. Se ven 2-3 sesiones más para zona del muslo.',
   false, NOW() - INTERVAL '7 days');

-- ============================================================
-- 4. FICHA INICIAL (formulario de ingreso)
-- ============================================================
INSERT INTO client_forms (
  organization_id, client_id, form_type, form_name,
  answers_json, signed_at, created_by, created_at
) VALUES (
  org_id, mock_client_id, 'initial', 'Ficha de Ingreso — Isabella Moreno',
  '{
    "ocupacion": "Diseñadora gráfica",
    "como_nos_conociste": "instagram",
    "referido_por": "Carla Pérez",
    "objetivos_tratamiento": ["Depilación definitiva piernas y axilas", "Mantenimiento de uñas", "Cuidado facial"],
    "tratamientos_previos": "Depilación con cera hace 2 años. Facial básico esporádico.",
    "medicacion_actual": "Anticonceptivos orales (Yasmin)",
    "enfermedades_cronicas": "Ninguna",
    "cirugia_reciente": "No",
    "exposicion_solar": "moderada",
    "uso_protector_solar": true,
    "embarazo_lactancia": false,
    "marca_cosmeticos_unas": "OPI, ORLY",
    "alergias_confirmadas": "Clorhexidina",
    "frecuencia_visita_esperada": "cada 3-4 semanas",
    "acepta_marketing": true,
    "acepta_fotos": true,
    "firma_digital": "isabella_moreno_firma_2024",
    "observaciones_adicionales": "Prefiere música suave durante los tratamientos. Solicita que se avise si hay demora."
  }',
  NOW() - INTERVAL '90 days',
  owner_id,
  NOW() - INTERVAL '90 days'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. HISTORIAL DE TURNOS
-- ============================================================

-- Turno 1: Soft Gel (hace 90 días) — completado
INSERT INTO appointments (
  id, organization_id, branch_id, client_id, primary_staff_id, resource_id,
  starts_at, ends_at, status, source, total_price, internal_notes, created_by
) VALUES (
  appt1_id, org_id, branch1_id, mock_client_id, staff_owner_id, res1_id,
  NOW() - INTERVAL '90 days' + INTERVAL '10:00',
  NOW() - INTERVAL '90 days' + INTERVAL '12:15',
  'completed', 'instagram', 9500.00,
  'Primera visita. Diseño francés degradado nude. Fotos tomadas.',
  owner_id
) ON CONFLICT DO NOTHING;

INSERT INTO appointment_services (appointment_id, service_id, assigned_staff_id, assigned_resource_id, duration_minutes, price, sort_order)
VALUES (appt1_id, svc3_id, staff_owner_id, res1_id, 120, 9500.00, 1)
ON CONFLICT DO NOTHING;

INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by)
VALUES
  (appt1_id, 'pending',    'confirmed',   owner_id),
  (appt1_id, 'confirmed',  'checked_in',  owner_id),
  (appt1_id, 'checked_in', 'in_service',  owner_id),
  (appt1_id, 'in_service', 'completed',   owner_id);

-- Turno 2: Limpieza Facial + Perfilado Cejas (hace 60 días) — completado
INSERT INTO appointments (
  id, organization_id, branch_id, client_id, primary_staff_id, resource_id,
  starts_at, ends_at, status, source, total_price, internal_notes, created_by
) VALUES (
  appt2_id, org_id, branch1_id, mock_client_id, staff_mgr_id, res4_id,
  NOW() - INTERVAL '60 days' + INTERVAL '11:00',
  NOW() - INTERVAL '60 days' + INTERVAL '12:50',
  'completed', 'whatsapp', 11000.00,
  'Piel mixta. Aplicación extra de mascarilla hidratante. Pago con efectivo.',
  manager_id
) ON CONFLICT DO NOTHING;

INSERT INTO appointment_services (appointment_id, service_id, assigned_staff_id, assigned_resource_id, duration_minutes, price, sort_order)
VALUES
  (appt2_id, svc9_id, staff_mgr_id,   res4_id, 75, 8500.00, 1),
  (appt2_id, svc7_id, staff_mgr_id,   NULL,    30, 2500.00, 2)
ON CONFLICT DO NOTHING;

INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by)
VALUES
  (appt2_id, 'pending',   'confirmed',  manager_id),
  (appt2_id, 'confirmed', 'completed',  manager_id);

-- Turno 3: Depilación Láser Axilas — sesión 1 (hace 45 días) — completado
INSERT INTO appointments (
  id, organization_id, branch_id, client_id, primary_staff_id, resource_id,
  starts_at, ends_at, status, source, total_price, created_by
) VALUES (
  appt3_id, org_id, branch1_id, mock_client_id, staff_tech1_id, res2_id,
  NOW() - INTERVAL '45 days' + INTERVAL '09:30',
  NOW() - INTERVAL '45 days' + INTERVAL '10:00',
  'completed', 'manual', 8000.00,
  owner_id
) ON CONFLICT DO NOTHING;

INSERT INTO appointment_services (appointment_id, service_id, assigned_staff_id, assigned_resource_id, duration_minutes, price, sort_order)
VALUES (appt3_id, svc4_id, staff_tech1_id, res2_id, 30, 8000.00, 1)
ON CONFLICT DO NOTHING;

INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by)
VALUES
  (appt3_id, 'pending', 'confirmed', owner_id),
  (appt3_id, 'confirmed', 'completed', tech1_id);

-- Turno 4: Kapping con Esmaltado (hace 30 días) — completado
INSERT INTO appointments (
  id, organization_id, branch_id, client_id, primary_staff_id, resource_id,
  starts_at, ends_at, status, source, total_price, created_by
) VALUES (
  appt4_id, org_id, branch1_id, mock_client_id, staff_owner_id, res1_id,
  NOW() - INTERVAL '30 days' + INTERVAL '10:00',
  NOW() - INTERVAL '30 days' + INTERVAL '11:30',
  'completed', 'online', 7500.00,
  owner_id
) ON CONFLICT DO NOTHING;

INSERT INTO appointment_services (appointment_id, service_id, assigned_staff_id, assigned_resource_id, duration_minutes, price, sort_order)
VALUES (appt4_id, svc2_id, staff_owner_id, res1_id, 90, 7500.00, 1)
ON CONFLICT DO NOTHING;

INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by)
VALUES
  (appt4_id, 'pending', 'confirmed', owner_id),
  (appt4_id, 'confirmed', 'completed', owner_id);

-- Turno 5: Depilación Láser Piernas — sesión 2 del paquete (hace 7 días) — completado
INSERT INTO appointments (
  id, organization_id, branch_id, client_id, primary_staff_id, resource_id,
  starts_at, ends_at, status, source, total_price, created_by
) VALUES (
  appt5_id, org_id, branch1_id, mock_client_id, staff_tech1_id, res2_id,
  NOW() - INTERVAL '7 days' + INTERVAL '14:00',
  NOW() - INTERVAL '7 days' + INTERVAL '15:00',
  'completed', 'manual', 0.00,  -- cubierto por paquete
  owner_id
) ON CONFLICT DO NOTHING;

INSERT INTO appointment_services (appointment_id, service_id, assigned_staff_id, assigned_resource_id, duration_minutes, price, sort_order)
VALUES (appt5_id, svc5_id, staff_tech1_id, res2_id, 60, 0.00, 1)
ON CONFLICT DO NOTHING;

INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by)
VALUES
  (appt5_id, 'confirmed', 'completed', tech1_id);

-- Turno 6: No-show — Masaje Descontracturante (hace 45 días)
INSERT INTO appointments (
  id, organization_id, branch_id, client_id, primary_staff_id, resource_id,
  starts_at, ends_at, status, source, total_price, created_by
) VALUES (
  appt8_id, org_id, branch1_id, mock_client_id, staff_tech2_id, res3_id,
  NOW() - INTERVAL '45 days' + INTERVAL '16:00',
  NOW() - INTERVAL '45 days' + INTERVAL '17:00',
  'no_show', 'manual', 11000.00,
  owner_id
) ON CONFLICT DO NOTHING;

INSERT INTO appointment_services (appointment_id, service_id, assigned_staff_id, assigned_resource_id, duration_minutes, price, sort_order)
VALUES (appt8_id, svc8_id, staff_tech2_id, res3_id, 60, 11000.00, 1)
ON CONFLICT DO NOTHING;

INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by)
VALUES
  (appt8_id, 'confirmed', 'no_show', owner_id);

-- Turno 7: PRÓXIMO — Soft Gel (en 3 días) — confirmado
INSERT INTO appointments (
  id, organization_id, branch_id, client_id, primary_staff_id, resource_id,
  starts_at, ends_at, status, source, total_price, created_by
) VALUES (
  appt6_id, org_id, branch1_id, mock_client_id, staff_owner_id, res1_id,
  NOW()::date + INTERVAL '3 days' + INTERVAL '10:00',
  NOW()::date + INTERVAL '3 days' + INTERVAL '12:00',
  'confirmed', 'online', 9500.00,
  owner_id
) ON CONFLICT DO NOTHING;

INSERT INTO appointment_services (appointment_id, service_id, assigned_staff_id, assigned_resource_id, duration_minutes, price, sort_order)
VALUES (appt6_id, svc3_id, staff_owner_id, res1_id, 120, 9500.00, 1)
ON CONFLICT DO NOTHING;

-- Turno 8: PRÓXIMO — Depilación Láser Piernas sesión 3 del paquete (en 14 días)
INSERT INTO appointments (
  id, organization_id, branch_id, client_id, primary_staff_id, resource_id,
  starts_at, ends_at, status, source, total_price, created_by
) VALUES (
  appt7_id, org_id, branch1_id, mock_client_id, staff_tech1_id, res2_id,
  NOW()::date + INTERVAL '14 days' + INTERVAL '09:00',
  NOW()::date + INTERVAL '14 days' + INTERVAL '10:00',
  'confirmed', 'manual', 0.00,  -- cubierto por paquete
  owner_id
) ON CONFLICT DO NOTHING;

INSERT INTO appointment_services (appointment_id, service_id, assigned_staff_id, assigned_resource_id, duration_minutes, price, sort_order)
VALUES (appt7_id, svc5_id, staff_tech1_id, res2_id, 60, 0.00, 1)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. VENTAS E HISTORIAL DE PAGOS
-- ============================================================

-- Venta 1: Servicio Soft Gel + compra de productos (hace 90 días)
INSERT INTO sales (
  id, organization_id, branch_id, client_id, appointment_id,
  sale_number, subtotal, discount_total, tip_amount, total,
  payment_status, sold_by, sold_at
) VALUES (
  sale1_id, org_id, branch1_id, mock_client_id, appt1_id,
  'VTA-MOCK-001', 11700.00, 0.00, 500.00, 12200.00,
  'paid', owner_id, NOW() - INTERVAL '90 days' + INTERVAL '12:20'
) ON CONFLICT DO NOTHING;

INSERT INTO sale_items (sale_id, item_type, service_id, description, quantity, unit_price, line_total, staff_id)
VALUES
  (sale1_id, 'service', svc3_id, 'Soft Gel (Builder Gel)', 1, 9500.00, 9500.00, staff_owner_id),
  (sale1_id, 'product', NULL,    'Top Coat UV Semipermanente', 1, 2500.00, 2500.00, staff_owner_id),
  (sale1_id, 'product', NULL,    'Aceite de Cutículas Nutritivo', 1, 1200.00, 1200.00, staff_owner_id)
ON CONFLICT DO NOTHING;

-- Actualizar product_id en los items de productos
UPDATE sale_items SET product_id = prod1_id
WHERE sale_id = sale1_id AND description = 'Top Coat UV Semipermanente';
UPDATE sale_items SET product_id = prod3_id
WHERE sale_id = sale1_id AND description = 'Aceite de Cutículas Nutritivo';

INSERT INTO payments (sale_id, method, amount, status, paid_at)
VALUES
  (sale1_id, 'transfer', 12200.00, 'paid', NOW() - INTERVAL '90 days' + INTERVAL '12:20')
ON CONFLICT DO NOTHING;

-- Venta 2: Compra de paquete Depilación Láser Piernas 10 sesiones (hace 30 días)
INSERT INTO sales (
  id, organization_id, branch_id, client_id,
  sale_number, subtotal, discount_total, total,
  payment_status, notes, sold_by, sold_at
) VALUES (
  sale2_id, org_id, branch1_id, mock_client_id,
  'VTA-MOCK-002', 150000.00, 15000.00, 135000.00,
  'paid',
  'Paquete 10 sesiones láser piernas completas. Descuento 10% por pago anticipado.',
  manager_id, NOW() - INTERVAL '30 days'
) ON CONFLICT DO NOTHING;

-- Venta 3: Compra de Gift Card (hace 30 días)
INSERT INTO sales (
  id, organization_id, branch_id, client_id,
  sale_number, subtotal, discount_total, total,
  payment_status, notes, sold_by, sold_at
) VALUES (
  sale3_id, org_id, branch1_id, mock_client_id,
  'VTA-MOCK-003', 20000.00, 0.00, 20000.00,
  'paid',
  'Gift card para mamá. Vencimiento 6 meses.',
  owner_id, NOW() - INTERVAL '30 days'
) ON CONFLICT DO NOTHING;

INSERT INTO payments (sale_id, method, amount, status, paid_at)
VALUES
  (sale2_id, 'credit_card', 135000.00, 'paid', NOW() - INTERVAL '30 days'),
  (sale3_id, 'cash',      20000.00, 'paid', NOW() - INTERVAL '30 days')
ON CONFLICT DO NOTHING;

-- Venta 4: Compra de productos cosméticos (hace 15 días)
INSERT INTO sales (
  id, organization_id, branch_id, client_id,
  sale_number, subtotal, discount_total, total,
  payment_status, sold_by, sold_at
) VALUES (
  sale4_id, org_id, branch1_id, mock_client_id,
  'VTA-MOCK-004', 4000.00, 0.00, 4000.00,
  'paid', owner_id, NOW() - INTERVAL '15 days'
) ON CONFLICT DO NOTHING;

INSERT INTO sale_items (sale_id, item_type, description, quantity, unit_price, line_total, staff_id)
VALUES
  (sale4_id, 'product', 'Top Coat UV Semipermanente', 1, 2500.00, 2500.00, staff_owner_id),
  (sale4_id, 'product', 'Base Coat UV',               1, 2000.00, 2000.00, staff_owner_id)
ON CONFLICT DO NOTHING;

UPDATE sale_items SET product_id = prod1_id
WHERE sale_id = sale4_id AND description = 'Top Coat UV Semipermanente';
UPDATE sale_items SET product_id = prod2_id
WHERE sale_id = sale4_id AND description = 'Base Coat UV';

INSERT INTO payments (sale_id, method, amount, status, paid_at)
VALUES
  (sale4_id, 'qr', 4000.00, 'paid', NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. PAQUETE DE TRATAMIENTO (10 sesiones láser piernas)
-- ============================================================
INSERT INTO treatment_packages (
  id, organization_id, branch_id, client_id, service_id, sale_item_id,
  name, description,
  total_sessions, used_sessions,
  total_price, status,
  starts_at, expires_at, notes
) VALUES (
  package1_id, org_id, branch1_id, mock_client_id, svc5_id, NULL,
  'Paquete Láser Piernas Completas × 10',
  'Depilación definitiva con láser diodo. 10 sesiones de piernas completas. Fototipo II. Parámetros personalizados según evolución.',
  10, 2,
  135000.00, 'active',
  (NOW() - INTERVAL '30 days')::date,
  (NOW() + INTERVAL '335 days')::date,
  'Sesión 1: hace 7 días — fluencia 28 J/cm². Sesión 2: próxima en 7 días. Paciente con excelente respuesta.'
) ON CONFLICT DO NOTHING;

-- Sesiones del paquete
INSERT INTO package_sessions (package_id, appointment_id, session_number, consumed_at, status, notes)
VALUES
  -- Sesión 1 — usada (turno hace ~45 días, solo axilas con mismo técnico - conceptual)
  (package1_id, appt3_id,  1, NOW() - INTERVAL '45 days', 'used', 'Primera sesión. Parámetros iniciales. Sin reacciones.'),
  -- Sesión 2 — usada (turno hace 7 días)
  (package1_id, appt5_id,  2, NOW() - INTERVAL '7 days',  'used', 'Segunda sesión. Fluencia aumentada. Buena respuesta.'),
  -- Sesión 3 — próxima (turno en 14 días)
  (package1_id, appt7_id,  3, NULL,                        'available',   'Turno reservado.'),
  -- Sesiones 4-10 — disponibles
  (package1_id, NULL,      4, NULL, 'available', NULL),
  (package1_id, NULL,      5, NULL, 'available', NULL),
  (package1_id, NULL,      6, NULL, 'available', NULL),
  (package1_id, NULL,      7, NULL, 'available', NULL),
  (package1_id, NULL,      8, NULL, 'available', NULL),
  (package1_id, NULL,      9, NULL, 'available', NULL),
  (package1_id, NULL,     10, NULL, 'available', NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. GIFT CARD
-- ============================================================
INSERT INTO gift_cards (
  id, organization_id, branch_id, code,
  original_amount, current_balance, status,
  purchaser_client_id,
  recipient_name, recipient_email, recipient_phone,
  personal_message,
  issued_at, expires_at, sale_id
) VALUES (
  giftcard1_id, org_id, branch1_id, 'GIFT-ISA-2024',
  20000.00, 20000.00, 'active',
  mock_client_id,
  'Silvia Moreno', 'silvia.moreno@example.com', '+54 11 9222-4400',
  '¡Feliz cumpleaños mamá! Con todo mi amor. Disfrutá un día de bienestar en Belleza Esencial 💐',
  NOW() - INTERVAL '30 days',
  NOW() + INTERVAL '150 days',
  sale3_id
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. ACTUALIZAR PREFERRED_STAFF EN CLIENTA (link al paquete)
-- ============================================================
-- Ya seteado en el INSERT del perfil: preferred_staff_id = staff_owner_id (Valentina — uñas)
-- El paquete láser está con staff_tech1_id (Florencia)

-- ============================================================
-- FIN
-- ============================================================
RAISE NOTICE '✅ Usuario mock Isabella Moreno creado correctamente.';
RAISE NOTICE '   ID cliente:  bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
RAISE NOTICE '   Email:       isabella.moreno@example.com';
RAISE NOTICE '   Turnos:      8 (5 completados, 1 no-show, 2 próximos)';
RAISE NOTICE '   Paquete:     10 sesiones láser piernas (2 usadas)';
RAISE NOTICE '   Gift card:   GIFT-ISA-2024 — $20.000 sin usar';
RAISE NOTICE '   Total gastado: $312.500';

END $$;
