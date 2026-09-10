/**
 * Catalogo de permisos.
 *
 * Los ROLES son datos: el admin los crea y edita desde /admin/empleados.
 * Los PERMISOS no: son un catalogo fijo, porque cada clave solo significa algo
 * si las policies de RLS y la interfaz la consultan. Una clave inventada desde
 * la UI no protegeria ni habilitaria nada.
 *
 * Agregar un permiso nuevo implica tres cosas, en este orden:
 *   1. sumarlo aca,
 *   2. usarlo en las policies de la tabla que corresponda,
 *   3. usarlo en el sidebar o en la guarda de la server action.
 */

export const PERMISSIONS = [
  // ─── Operación ────────────────────────────────────────────────────────────
  { key: 'caja.view',     group: 'Operación', label: 'Ver la caja',              hint: 'Abrir la pantalla de caja y ver el turno' },
  { key: 'caja.manage',   group: 'Operación', label: 'Operar la caja',           hint: 'Abrir y cerrar turno, cobrar, registrar movimientos' },
  { key: 'mesas.view',    group: 'Operación', label: 'Ver mesas',                hint: 'Ver el plano del salón y el estado de cada mesa' },
  { key: 'mesas.manage',  group: 'Operación', label: 'Operar mesas',             hint: 'Abrir mesas, agregar ítems, pedir la cuenta' },
  { key: 'pedidos.view',  group: 'Operación', label: 'Ver pedidos',              hint: 'Ver la lista de pedidos y su detalle' },
  { key: 'pedidos.manage',group: 'Operación', label: 'Gestionar pedidos',        hint: 'Cambiar estado, editar y anular pedidos' },
  { key: 'cocina.view',   group: 'Operación', label: 'Ver comandas',             hint: 'La pantalla de cocina' },
  { key: 'cocina.manage', group: 'Operación', label: 'Marcar comandas listas',   hint: 'Cambiar el estado de los ítems en cocina' },

  // ─── Catálogo ─────────────────────────────────────────────────────────────
  { key: 'productos.view',     group: 'Catálogo', label: 'Ver productos',        hint: 'El catálogo con precios y costos' },
  { key: 'productos.manage',   group: 'Catálogo', label: 'Editar productos',     hint: 'Crear, editar precios y eliminar productos' },
  { key: 'categorias.view',    group: 'Catálogo', label: 'Ver categorías',       hint: '' },
  { key: 'categorias.manage',  group: 'Catálogo', label: 'Editar categorías',    hint: 'Crear, renombrar y eliminar categorías' },
  { key: 'recetas.view',       group: 'Catálogo', label: 'Ver recetas',          hint: 'Recetas y sus costos' },
  { key: 'recetas.manage',     group: 'Catálogo', label: 'Editar recetas',       hint: 'Crear y modificar recetas' },
  { key: 'ingredientes.view',  group: 'Catálogo', label: 'Ver ingredientes',     hint: 'Insumos y sus costos por unidad' },
  { key: 'ingredientes.manage',group: 'Catálogo', label: 'Editar ingredientes',  hint: 'Crear insumos y cambiar costos' },

  // ─── Stock ────────────────────────────────────────────────────────────────
  { key: 'stock.view',   group: 'Stock', label: 'Ver stock',       hint: 'Existencias, alertas y movimientos' },
  { key: 'stock.manage', group: 'Stock', label: 'Ajustar stock',   hint: 'Cargar compras y hacer ajustes manuales' },

  // ─── Negocio ──────────────────────────────────────────────────────────────
  { key: 'dashboard.view',      group: 'Negocio', label: 'Ver el dashboard',      hint: 'Resumen de ventas del día' },
  { key: 'analytics.view',      group: 'Negocio', label: 'Ver reportes',          hint: 'Analytics, márgenes y rentabilidad' },
  { key: 'delivery_zones.view', group: 'Negocio', label: 'Ver zonas de envío',    hint: '' },
  { key: 'delivery_zones.manage', group: 'Negocio', label: 'Editar zonas de envío', hint: 'Dibujar zonas y fijar costos de envío' },
  { key: 'settings.view',       group: 'Negocio', label: 'Ver ajustes',           hint: '' },
  { key: 'settings.manage',     group: 'Negocio', label: 'Editar ajustes',        hint: 'Horarios, pausar pedidos, datos del local' },

  // ─── Equipo ───────────────────────────────────────────────────────────────
  { key: 'users.view',   group: 'Equipo', label: 'Ver el equipo',        hint: 'La lista de empleados y sus roles' },
  { key: 'users.manage', group: 'Equipo', label: 'Gestionar el equipo',  hint: 'Dar de alta, cambiar roles y dar de baja' },
  { key: 'roles.manage', group: 'Equipo', label: 'Gestionar roles',      hint: 'Crear roles nuevos y cambiar qué puede hacer cada uno' },
] as const

export type PermissionKey = (typeof PERMISSIONS)[number]['key']

export const PERMISSION_KEYS: PermissionKey[] = PERMISSIONS.map((p) => p.key)

/** Agrupados para la pantalla de edición de roles. */
export const PERMISSION_GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))]

export function permissionsByGroup(group: string) {
  return PERMISSIONS.filter((p) => p.group === group)
}

/**
 * Un permiso `.manage` no sirve sin su `.view`: quien puede editar productos
 * tiene que poder verlos. La UI marca el view automaticamente al marcar manage.
 */
export function impliedView(key: PermissionKey): PermissionKey | null {
  if (!key.endsWith('.manage')) return null
  const view = key.replace('.manage', '.view') as PermissionKey
  return PERMISSION_KEYS.includes(view) ? view : null
}
