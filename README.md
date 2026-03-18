# BeautyDesk

Sistema SaaS ERP para centros de estética y bienestar. Multi-tenant, multi-sucursal, con agenda inteligente, CRM, POS, inventario, paquetes/sesiones, gift cards, notificaciones WhatsApp/email y portal de reservas online.

## Stack

- **Frontend**: React + Vite + React Router v7 + TanStack Query + React Hook Form + Zod
- **Estilos**: Tailwind CSS v3 + Radix UI primitives + Lucide React
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions + Cron)
- **Notificaciones**: Adapter pattern — WhatsApp (Meta Cloud API / Twilio / mock) · Email (Resend / Postmark / mock)

## Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (free tier alcanza para desarrollo)
- (Opcional) Cuenta Meta para WhatsApp Business API en producción

## Setup local

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url> BeautyDesk
cd BeautyDesk
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editá `.env` con tus valores:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>

# Proveedor de WhatsApp: mock | meta | twilio
VITE_WHATSAPP_PROVIDER=mock

# Proveedor de Email: mock | resend | postmark
VITE_EMAIL_PROVIDER=mock
```

Para producción con WhatsApp real (Meta):

```env
VITE_WHATSAPP_PROVIDER=meta
VITE_META_ACCESS_TOKEN=<token>
VITE_META_PHONE_NUMBER_ID=<phone-number-id>
VITE_META_WHATSAPP_API_VERSION=v19.0
```

### 3. Configurar Supabase

#### Opción A: Supabase CLI (recomendado)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Esto aplica todas las migraciones en orden:
- `001_initial_schema.sql` — Schema completo
- `002_rls_policies.sql` — Row Level Security

#### Opción B: Dashboard de Supabase

1. Ir a **SQL Editor** en tu proyecto Supabase
2. Ejecutar `supabase/migrations/001_initial_schema.sql`
3. Ejecutar `supabase/migrations/002_rls_policies.sql`

### 4. Cargar datos de demo (opcional)

```bash
supabase db execute --file supabase/seed/demo_data.sql
```

Esto crea:
- 1 organización: **Centro Belleza Esencial**
- 2 sucursales: Palermo y Recoleta
- 5 usuarios (owner / manager / receptionist / 2 técnicas)
- 10 servicios reales de estética
- 5 clientes y 6 turnos de ejemplo

**Credenciales demo:**

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Owner | owner@beautydesk.demo | demo1234 |
| Manager | manager@beautydesk.demo | demo1234 |
| Recepcionista | recep@beautydesk.demo | demo1234 |

> Nota: Los usuarios demo deben crearse en Supabase Auth (Dashboard → Authentication → Users) con los emails y contraseñas indicados, usando los UUIDs definidos en el seed.

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La app queda disponible en [http://localhost:3000](http://localhost:3000).

## Edge Functions

Las Edge Functions procesan notificaciones y automatizaciones asíncronas.

### Desplegar

```bash
supabase functions deploy process-notification-queue
supabase functions deploy send-appointment-reminders
supabase functions deploy send-birthday-messages
supabase functions deploy process-campaigns
```

### Configurar cron (supabase/config.toml)

```toml
[functions.process-notification-queue]
schedule = "* * * * *"    # cada minuto

[functions.send-appointment-reminders]
schedule = "*/5 * * * *"  # cada 5 minutos

[functions.send-birthday-messages]
schedule = "0 9 * * *"    # todos los días a las 9am

[functions.process-campaigns]
schedule = "*/15 * * * *" # cada 15 minutos
```

### Variables de entorno para Edge Functions

Configurá en **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

```
WHATSAPP_PROVIDER=mock
META_ACCESS_TOKEN=...
META_PHONE_NUMBER_ID=...
EMAIL_PROVIDER=mock
RESEND_API_KEY=...
```

## Estructura del proyecto

```
BeautyDesk/
├── src/
│   ├── app/
│   │   ├── layouts/          # AppLayout, AuthLayout
│   │   ├── providers/        # AuthProvider, OrganizationProvider
│   │   └── routes/           # Router definition
│   ├── components/
│   │   ├── shared/           # Sidebar, Topbar, BranchSwitcher, RoleGuard
│   │   └── ui/               # Button, Input, Badge, Card, Modal, ...
│   ├── features/
│   │   ├── appointments/     # Agenda, NewAppointment, AppointmentDetail
│   │   ├── campaigns/        # Campañas de marketing
│   │   ├── clients/          # CRM: listado, detalle, notas, fotos
│   │   ├── dashboard/        # Dashboard con KPIs
│   │   ├── giftcards/        # Gift cards
│   │   ├── inventory/        # Productos e inventario
│   │   ├── packages/         # Paquetes prepagos de sesiones
│   │   ├── public-booking/   # Portal de reservas online (público)
│   │   ├── reports/          # Reportes y métricas
│   │   ├── resources/        # Recursos (cabinas, equipos)
│   │   ├── sales/            # POS, ventas, caja
│   │   ├── services/         # Catálogo de servicios
│   │   ├── settings/         # Configuración de la organización
│   │   └── staff/            # Gestión de personal
│   ├── hooks/                # TanStack Query hooks por feature
│   ├── lib/
│   │   ├── constants/        # Roles, estados, categorías
│   │   ├── formatters/       # money, dates
│   │   ├── supabase/         # Cliente y auth helpers
│   │   ├── utils/            # cn()
│   │   └── validators/       # Zod schemas
│   ├── services/
│   │   ├── email/            # Adapter pattern: mock, resend, postmark
│   │   ├── notifications/    # Servicio de encolado
│   │   └── whatsapp/         # Adapter pattern: mock, meta, twilio
│   ├── styles/
│   │   └── globals.css       # Tailwind + estilos base
│   └── main.jsx
├── supabase/
│   ├── functions/            # Edge Functions (Deno)
│   ├── migrations/           # Schema SQL + RLS
│   └── seed/                 # Demo data
├── .env.example
├── tailwind.config.js
└── vite.config.js
```

## Módulos

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/app/dashboard` | KPIs del día, turnos, alertas |
| Agenda | `/app/agenda` | Calendario semanal/diario por profesional |
| Clientes | `/app/clients` | CRM completo con historial |
| Staff | `/app/staff` | Personal, horarios, comisiones |
| Servicios | `/app/services` | Catálogo con categorías |
| Recursos | `/app/resources` | Cabinas, equipos |
| Ventas / POS | `/app/sales` | Punto de venta |
| Caja | `/app/cash` | Apertura/cierre de caja |
| Productos | `/app/products` | Stock y ajustes |
| Inventario | `/app/inventory` | Historial de movimientos |
| Paquetes | `/app/packages` | Paquetes prepagos de sesiones |
| Gift Cards | `/app/gift-cards` | Tarjetas regalo |
| Campañas | `/app/campaigns` | Envíos masivos WhatsApp/email |
| Reportes | `/app/reports` | Métricas de período |
| Configuración | `/app/settings` | Org, marca, notificaciones, sucursales, usuarios |
| Portal público | `/book/:orgSlug/:branchSlug` | Reservas online sin login |

## Roles y permisos

| Rol | Descripción |
|-----|-------------|
| `owner` | Acceso total, configuración, facturación |
| `manager` | Gestión completa excepto billing |
| `receptionist` | Agenda, clientes, caja |
| `technician` | Solo sus propios turnos |
| `cashier` | Solo ventas y caja |

## Portal de reservas

El portal público está en `/book/:orgSlug/:branchSlug` sin autenticación.

Flujo:
1. Selección de servicio
2. Selección de profesional
3. Selección de fecha y horario (disponibilidad real)
4. Datos del cliente
5. Confirmación

La reserva se crea con `status: 'pending'` y `source: 'online'`. El sistema envía confirmación automática por WhatsApp si está configurado.

## Notificaciones automáticas

| Evento | Template | Canal |
|--------|----------|-------|
| Turno confirmado | `appointment_confirmed` | WhatsApp / Email |
| Recordatorio 24h | `appointment_reminder_24h` | WhatsApp |
| Recordatorio 3h | `appointment_reminder_3h` | WhatsApp |
| Cancelación | `appointment_cancelled` | WhatsApp / Email |
| Follow-up post visita | `post_visit_followup` | WhatsApp |
| Cumpleaños | `birthday_greeting` | WhatsApp |
| Cliente inactiva | `client_inactive` | WhatsApp |

Variables disponibles en templates: `{{client_name}}`, `{{appointment_date}}`, `{{appointment_time}}`, `{{service_name}}`, `{{staff_name}}`, `{{org_name}}`, `{{branch_name}}`, `{{manage_url}}`

## Comandos útiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run preview      # Preview del build

supabase start       # Supabase local (Docker)
supabase db reset    # Reset DB + migraciones + seed
supabase functions serve  # Edge Functions local
```

## Licencia

MIT
#   a u r o r a  
 #   a u r o r a  
 