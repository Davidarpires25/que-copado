# Plan: Sistema de Roles y Permisos para Usuarios Staff

> **Estado:** Planificación
> **Complejidad:** Alta
> **Estimación de fases:** 4 fases incrementales

---

## Contexto del sistema actual

- **Auth:** Supabase Auth — un único usuario admin por ahora
- **Middleware:** `middleware.ts` redirige `/admin/*` a `/admin/login` si no hay sesión; no hay distinción de roles
- **RLS:** Todas las policies usan `TO authenticated` → cualquier usuario autenticado tiene acceso total
- **Sidebar:** 13 secciones fijas: Caja, Mesas, Pedidos, Productos, Recetas, Ingredientes, Categorías, Stock, Dashboard, Analytics, Zonas de Envío, Configuración, (próximamente Usuarios)

El sistema actualmente no distingue **qué puede hacer** un usuario autenticado, solo **si está autenticado**.

---

## Objetivo

Permitir al admin **crear usuarios staff** (cajero, mozo, cocinero, etc.) y **controlar granularmente** qué secciones puede ver y qué acciones puede realizar cada uno. El admin configura esto desde un panel de gestión de usuarios.

---

## Arquitectura elegida: Roles predefinidos + overrides granulares

```
┌─────────────────────────────────────────────────────────────┐
│  admin crea usuario → elige rol base → ajusta permisos      │
│                                                             │
│  Rol Base (plantilla)      Override por usuario             │
│  ┌──────────────┐          ┌────────────────────────────┐   │
│  │ cajero       │ ──────►  │ caja: ✓  mesas: ✓          │   │
│  │ mozo         │          │ productos: ✗ (quitado)      │   │
│  │ cocina       │          │ analytics: ✓ (agregado)     │   │
│  │ personalizado│          └────────────────────────────┘   │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

**Por qué este enfoque:**
- El admin no tiene que configurar 20 permisos desde cero cada vez → el rol es un punto de partida
- Puede ajustar caso a caso sin crear roles nuevos
- Escala bien si en el futuro se agregan más secciones

---

## Mapa de permisos

Cada sección tiene dos niveles: `view` (solo lectura) y `manage` (crear, editar, eliminar, ejecutar acciones).

| Clave de permiso         | Qué controla                                      |
|--------------------------|---------------------------------------------------|
| `caja.view`              | Ver la pantalla de caja                          |
| `caja.manage`            | Abrir/cerrar sesión, cobrar, registrar movimientos|
| `mesas.view`             | Ver el estado de mesas                           |
| `mesas.manage`           | Crear pedidos de mesa, cambiar estado            |
| `pedidos.view`           | Ver lista de pedidos                             |
| `pedidos.manage`         | Cambiar estado, editar pedidos                   |
| `productos.view`         | Ver catálogo de productos                        |
| `productos.manage`       | Crear, editar, eliminar productos                |
| `recetas.view`           | Ver recetas                                      |
| `recetas.manage`         | Crear, editar, eliminar recetas                  |
| `ingredientes.view`      | Ver ingredientes y stock                         |
| `ingredientes.manage`    | Editar precios, stock, sub-recetas               |
| `categorias.view`        | Ver categorías                                   |
| `categorias.manage`      | Crear, editar, eliminar categorías               |
| `stock.view`             | Ver movimientos de stock                         |
| `stock.manage`           | Registrar entradas/salidas manuales              |
| `dashboard.view`         | Ver dashboard de resumen                         |
| `analytics.view`         | Ver analytics y reportes                         |
| `delivery_zones.view`    | Ver zonas de envío                               |
| `delivery_zones.manage`  | Crear, editar, eliminar zonas                    |
| `settings.view`          | Ver configuración del negocio                    |
| `settings.manage`        | Guardar configuración, pausar pedidos            |
| `users.view`             | Ver lista de usuarios staff                      |
| `users.manage`           | Crear, editar, desactivar usuarios               |

### Roles predefinidos

| Rol              | Permisos incluidos por defecto                                                      |
|------------------|-------------------------------------------------------------------------------------|
| `admin`          | **Todos** — no se puede restringir                                                  |
| `cajero`         | `caja.*`, `mesas.*`, `pedidos.*`                                                   |
| `mozo`           | `mesas.*`, `pedidos.view`                                                           |
| `cocina`         | `pedidos.view`, `pedidos.manage` (solo cambiar a "en preparación" / "listo")       |
| `supervisor`     | `caja.*`, `mesas.*`, `pedidos.*`, `dashboard.view`, `analytics.view`               |
| `personalizado`  | Sin permisos por defecto — el admin los elige todos manualmente                    |

> El usuario con rol `admin` (el dueño) siempre tiene acceso total y no puede ser restringido por la UI.

---

## Estructura de base de datos

### Tabla `staff_profiles`

```sql
CREATE TABLE staff_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'personalizado'
                CHECK (role IN ('admin','cajero','mozo','cocina','supervisor','personalizado')),
  -- Permisos como JSONB: { "caja.view": true, "caja.manage": false, ... }
  -- NULL = usa los defaults del rol base
  -- Presencia de clave = override explícito del admin
  permissions   JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo el admin puede leer/escribir perfiles de staff
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_staff_profiles"
  ON staff_profiles
  FOR ALL
  TO authenticated
  USING (
    -- Solo el admin (rol = 'admin' en su propio perfil) puede gestionar staff
    EXISTS (
      SELECT 1 FROM staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role = 'admin'
    )
  );

-- Cada usuario puede leer su propio perfil (para cargar sus permisos)
CREATE POLICY "users_read_own_profile"
  ON staff_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
```

> **¿Por qué JSONB y no tabla de pivote?**
> Un restaurant pequeño no necesita un sistema RBAC complejo. JSONB es más simple de leer, escribir y serializar hacia el frontend. Si los permisos fueran cientos o con herencia compleja, una tabla pivote sería mejor.

---

## Flujo de creación de usuarios

```
Admin → Panel de Usuarios → "Nuevo Usuario"
         │
         ├── Ingresa email, nombre, rol
         ├── Ajusta permisos (toggle por sección)
         └── Guarda
              │
              ▼
    Server Action → Supabase Admin API
    supabase.auth.admin.inviteUserByEmail(email)
         │
         ▼
    Usuario recibe email con link para crear contraseña
         │
         ▼
    Al activar → se crea su `staff_profiles` row automáticamente
    (via DB trigger o en el onboarding)
```

**Punto clave:** Se usa `supabase.auth.admin.inviteUserByEmail()` que requiere la `SUPABASE_SERVICE_ROLE_KEY` (ya tenemos el admin client). El usuario nunca necesita que el dueño le comparta una contraseña.

---

## Capas de seguridad

La seguridad se implementa en **tres capas** independientes (ninguna reemplaza a la otra):

```
Capa 1: Middleware (Next.js)
   Redirige si el usuario no tiene permiso para la ruta
   Ej: cajero intenta /admin/settings → redirect a /admin/caja

Capa 2: UI (React)
   El sidebar solo muestra los items permitidos
   Los botones de acción se ocultan si no tiene "manage"
   ← Esto es UX, no seguridad real

Capa 3: Server Actions (Node.js)
   Cada action verifica el permiso antes de ejecutar
   ← Esta es la única capa que realmente importa para seguridad
```

---

## Implementación por fases

---

### Fase 1: Base de datos y modelo de datos

**Objetivo:** Crear las tablas, triggers y RLS policies. No toca nada del frontend aún.

**Archivos a crear/modificar:**
- `supabase/migrations/008_staff_roles.sql` ← nuevo

**Contenido de la migration:**
```sql
-- Tabla staff_profiles
-- Trigger para auto-crear perfil admin si no existe
-- RLS policies
-- Función helper: get_user_permissions(user_id) → JSONB
-- Función helper: has_permission(user_id, permission_key) → BOOLEAN
```

La función `has_permission` en PostgreSQL permite usarla directamente en RLS policies futuras si se necesita granularidad a nivel de fila.

---

### Fase 2: Server-side permission loading

**Objetivo:** Cada request al admin carga los permisos del usuario y los hace disponibles.

**Archivos a crear/modificar:**
- `lib/server/permissions.ts` ← nuevo
- `lib/types/permissions.ts` ← nuevo
- `middleware.ts` ← modificar

**`lib/types/permissions.ts`:**
```typescript
export type PermissionKey =
  | 'caja.view' | 'caja.manage'
  | 'mesas.view' | 'mesas.manage'
  | 'pedidos.view' | 'pedidos.manage'
  | 'productos.view' | 'productos.manage'
  | 'recetas.view' | 'recetas.manage'
  | 'ingredientes.view' | 'ingredientes.manage'
  | 'categorias.view' | 'categorias.manage'
  | 'stock.view' | 'stock.manage'
  | 'dashboard.view'
  | 'analytics.view'
  | 'delivery_zones.view' | 'delivery_zones.manage'
  | 'settings.view' | 'settings.manage'
  | 'users.view' | 'users.manage'

export type UserRole = 'admin' | 'cajero' | 'mozo' | 'cocina' | 'supervisor' | 'personalizado'

export interface StaffProfile {
  id: string
  display_name: string
  role: UserRole
  permissions: Partial<Record<PermissionKey, boolean>>
  is_active: boolean
}

// Permisos efectivos: combina defaults del rol + overrides del perfil
export type EffectivePermissions = Record<PermissionKey, boolean>
```

**`lib/server/permissions.ts`:**
```typescript
// Defaults por rol
export const ROLE_DEFAULTS: Record<UserRole, PermissionKey[]> = {
  admin: ['*'], // todas
  cajero: ['caja.view', 'caja.manage', 'mesas.view', 'mesas.manage', 'pedidos.view', 'pedidos.manage'],
  mozo: ['mesas.view', 'mesas.manage', 'pedidos.view'],
  cocina: ['pedidos.view', 'pedidos.manage'],
  supervisor: ['caja.view', 'caja.manage', 'mesas.view', 'mesas.manage', 'pedidos.view', 'pedidos.manage', 'dashboard.view', 'analytics.view'],
  personalizado: [],
}

// Resuelve permisos efectivos: defaults + overrides del JSONB
export function resolvePermissions(profile: StaffProfile): EffectivePermissions

// Carga el perfil + permisos del usuario actual (cached por request)
export async function getCurrentUserPermissions(): Promise<EffectivePermissions | null>

// Guard para server actions
export async function requirePermission(key: PermissionKey): Promise<void>
// Lanza error 'No autorizado' si no tiene el permiso
```

**Middleware actualizado:**
```typescript
// Luego de verificar que hay sesión, carga los permisos
// y verifica que la ruta actual está permitida
const ROUTE_PERMISSION_MAP: Record<string, PermissionKey> = {
  '/admin/caja': 'caja.view',
  '/admin/tables': 'mesas.view',
  '/admin/orders': 'pedidos.view',
  '/admin/products': 'productos.view',
  // ...
  '/admin/settings': 'settings.view',
  '/admin/users': 'users.view',
}
// Si no tiene permiso para la ruta → redirect a su "home" permitido
```

---

### Fase 3: UI — Panel de gestión de usuarios

**Objetivo:** El admin puede ver, crear, editar y desactivar usuarios staff.

**Archivos a crear:**
- `app/admin/users/page.tsx`
- `app/admin/users/loading.tsx`
- `app/admin/users/users-dashboard.tsx`
- `components/admin/users/user-form-dialog.tsx`
- `components/admin/users/user-list.tsx`
- `components/admin/users/permission-editor.tsx`
- `app/actions/staff-users.ts`

**`permission-editor.tsx` — el corazón de la UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  Rol base: [cajero ▼]   (cambia los toggles automáticamente) │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OPERACIÓN                                                  │
│  ├─ Caja          [ver ✓] [gestionar ✓]                    │
│  ├─ Mesas         [ver ✓] [gestionar ✓]                    │
│  └─ Pedidos       [ver ✓] [gestionar ✗]                    │
│                                                             │
│  CATÁLOGO                                                   │
│  ├─ Productos     [ver ✗] [gestionar ✗]                    │
│  ├─ Recetas       [ver ✗] [gestionar ✗]                    │
│  └─ ...                                                     │
│                                                             │
│  REPORTES                                                   │
│  ├─ Dashboard     [ver ✗]                                   │
│  └─ Analytics     [ver ✗]                                   │
│                                                             │
│  AJUSTES                                                    │
│  ├─ Zonas de Envío [ver ✗] [gestionar ✗]                   │
│  └─ Configuración  [ver ✗] [gestionar ✗]                   │
│                                                             │
│  [Cancelar]                        [Guardar cambios]        │
└─────────────────────────────────────────────────────────────┘
```

Comportamiento:
- Al cambiar el **rol base** → los toggles se resetean a los defaults del rol
- Si el admin modifica un toggle → ese cambio se guarda como override en el JSONB
- Si el toggle de `manage` se activa → `view` se activa automáticamente (no tiene sentido gestionar sin ver)
- Los overrides se marcan visualmente (ej: borde naranja) para indicar que difieren del rol base

**`app/actions/staff-users.ts`:**
```typescript
'use server'

// Crear usuario: inviteUserByEmail + insertar staff_profiles
export async function createStaffUser(data: CreateStaffUserInput)

// Actualizar rol/permisos
export async function updateStaffUser(userId: string, data: UpdateStaffUserInput)

// Desactivar (no eliminar — preserva historial de pedidos)
export async function toggleStaffUserActive(userId: string, isActive: boolean)

// Revocar invitación pendiente
export async function revokeInvitation(userId: string)
```

---

### Fase 4: UI — Filtrado del sidebar y guards de acciones

**Objetivo:** La UI refleja los permisos. Las server actions los verifican.

#### 4a — Sidebar filtrado

`admin-sidebar.tsx` pasa a recibir `permissions: EffectivePermissions` como prop (cargados desde el Server Component padre). Cada `NavItem` tiene una clave de permiso requerida:

```typescript
const navGroups: NavGroup[] = [
  {
    title: 'Operacion',
    items: [
      { href: '/admin/caja',   label: 'Caja',    icon: CreditCard,    permission: 'caja.view' },
      { href: '/admin/tables', label: 'Mesas',   icon: UtensilsCrossed, permission: 'mesas.view' },
      { href: '/admin/orders', label: 'Pedidos', icon: ClipboardList,  permission: 'pedidos.view' },
    ],
  },
  // ...
]
// Filtrar: items.filter(item => permissions[item.permission])
```

#### 4b — Guards en Server Actions

Cada action existente agrega la verificación de permiso:

```typescript
// Antes (solo verifica autenticación):
const user = await getAuthUser(supabase)
if (!user) return { error: 'No autorizado' }

// Después (verifica permiso específico):
const user = await getAuthUser(supabase)
if (!user) return { error: 'No autorizado' }
await requirePermission('productos.manage')
// Si no tiene el permiso → lanza error
```

#### 4c — Botones de acción condicionados

En los dashboards, los botones de editar/eliminar/crear se muestran según el permiso `manage`:

```tsx
// En products-dashboard.tsx
<PermissionGate permission="productos.manage">
  <Button onClick={handleCreate}>Nuevo Producto</Button>
</PermissionGate>
```

`PermissionGate` es un client component que lee los permisos del contexto.

---

## Manejo del primer admin (bootstrap)

Al crear el primer usuario de Supabase (el dueño), no hay `staff_profiles` row todavía. La solución:

```sql
-- Trigger en auth.users que crea automáticamente el perfil admin
-- para el primer usuario registrado
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Si no existe ningún admin, este usuario es el admin
  IF NOT EXISTS (SELECT 1 FROM staff_profiles WHERE role = 'admin') THEN
    INSERT INTO staff_profiles (id, display_name, role, permissions)
    VALUES (NEW.id, NEW.email, 'admin', '{}');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

Los usuarios invitados después NO disparan este trigger como admin — el trigger solo asigna admin si no hay ninguno todavía. Los usuarios invitados reciben su perfil creado por el server action.

---

## Consideraciones de seguridad importantes

### ¿Qué pasa si alguien bypasea la UI?
- La **Capa 1 (middleware)** bloquea rutas no permitidas a nivel de HTTP
- La **Capa 3 (server actions)** re-verifica en cada mutación
- La **Capa 2 (UI)** es solo experiencia de usuario

### ¿Qué pasa con los usuarios desactivados?
- `is_active = false` → el middleware los redirige a login aunque tengan sesión activa
- No se eliminan de `auth.users` → preserva el historial de pedidos y movimientos

### ¿Puede un staff modificar su propio perfil?
- No. La RLS policy solo permite lectura propia (`SELECT WHERE id = auth.uid()`)
- El `UPDATE` solo lo puede hacer un admin (`WHERE role = 'admin'`)

### ¿Puede un cajero escalar privilegios via server action?
- No. `requirePermission()` en el server action consulta directamente la DB, no confía en nada del cliente

---

## Estructura de archivos resultante

```
app/
├── actions/
│   └── staff-users.ts              ← nuevo
├── admin/
│   └── users/
│       ├── page.tsx                ← nuevo
│       ├── loading.tsx             ← nuevo
│       └── users-dashboard.tsx     ← nuevo
components/
├── admin/
│   ├── users/                      ← nuevo directorio
│   │   ├── user-list.tsx
│   │   ├── user-form-dialog.tsx
│   │   └── permission-editor.tsx
│   └── layout/
│       └── admin-sidebar.tsx       ← modificar (filtrado por permisos)
lib/
├── server/
│   └── permissions.ts              ← nuevo
├── types/
│   └── permissions.ts              ← nuevo
middleware.ts                       ← modificar (route guards)
supabase/migrations/
└── 008_staff_roles.sql             ← nuevo
```

---

## Orden de implementación recomendado

1. **Migration DB** (`008_staff_roles.sql`) → base de todo
2. **Types** (`lib/types/permissions.ts`) → typesafety desde el principio
3. **`lib/server/permissions.ts`** → lógica de resolución de permisos
4. **`app/actions/staff-users.ts`** → CRUD de usuarios
5. **Panel de usuarios UI** → admin puede crear el primer cajero
6. **Middleware route guards** → bloquea rutas no permitidas
7. **Sidebar filtrado** → UI refleja permisos
8. **Guards en server actions existentes** → seguridad real en cada mutación
9. **`PermissionGate` component** → oculta botones según permisos

> **Nota:** Los pasos 1-5 son el MVP utilizable. Los pasos 6-9 son la capa de seguridad completa.

---

## Lo que NO se implementa (scope acotado)

- **Permisos por mesa específica** (ej: mozo 1 solo ve sus mesas) — complejidad innecesaria para este negocio
- **Auditoría de acciones** (log de quién hizo qué) — puede agregarse después
- **SSO / Google Login** para staff — fuera de scope
- **Múltiples negocios por usuario** — modelo single-tenant

---

*Documento generado el 05/03/2026*
