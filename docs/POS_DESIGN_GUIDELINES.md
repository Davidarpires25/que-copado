# Guía de Diseño - Sistema POS

Esta guía establece los estándares de diseño para el sistema de Punto de Venta de Que Copado. Toda nueva feature o componente debe seguir estos patrones para mantener consistencia.

---

## 1. Paleta de Colores

### Backgrounds (Sistema de Capas)

```tsx
// Capa 0 - Fondo principal (más oscuro en jerarquía visual)
bg-[#1a1d24]

// Capa 1 - Cards y contenedores (más oscuro = hundido)
bg-[#12151a]

// Capa 2 - Hover states
bg-[#252a35]

// Bordes y separadores
border-[#2a2f3a]
```

**Regla**: El fondo más oscuro (`#12151a`) siempre debe estar DENTRO de un fondo más claro (`#1a1d24`) para crear profundidad visual correcta.

**Ejemplo correcto**:
```tsx
<div className="bg-[#1a1d24]">  {/* Fondo principal */}
  <div className="bg-[#12151a] border border-[#2a2f3a]">  {/* Card */}
    Contenido
  </div>
</div>
```

### Textos

```tsx
// Headings y textos principales
text-[#f0f2f5]

// Textos secundarios (labels, subtítulos)
text-[#8b9ab0]

// Placeholders y textos terciarios
text-[#6b7a8d]
```

### Acentos y Estados

```tsx
// Primary (Dorado) - CTAs principales, precios, highlights
bg-[#FEC501] text-black
hover:bg-[#E5B001]

// Success (Verde) - Confirmaciones, stock disponible
text-green-400 / bg-green-600

// Error (Rojo) - Destructivas, sin stock
text-red-400 / bg-red-600

// Warning (Amarillo) - Alertas
text-yellow-400 / bg-yellow-600

// Info (Azul) - Información neutral
text-blue-400 / bg-blue-600
```

---

## 2. Tipografía

### Escala de Tamaños

Para interfaces POS, priorizar **legibilidad a distancia**:

```tsx
// Headings principales (pantalla de apertura, cierre)
text-2xl lg:text-3xl  // 24px / 30px

// Headings secundarios (títulos de sección)
text-lg lg:text-xl    // 18px / 20px

// Texto principal (nombres de productos, valores)
text-base             // 16px ✅ MÍNIMO RECOMENDADO

// Texto secundario (labels, categorías)
text-sm               // 14px ⚠️ Solo para labels

// Texto terciario (timestamps, badges)
text-xs               // 12px ⚠️ Solo para metadata

// NUNCA usar text-[10px] o menor en POS
```

### Peso de Fuente

```tsx
// Valores monetarios
font-bold

// Labels importantes (Total, Efectivo)
font-semibold

// Labels normales
font-medium

// Texto descriptivo
font-normal
```

### Jerarquía de Información

**Ejemplo - Display de precio**:
```tsx
<div>
  <p className="text-xs text-[#8b9ab0] font-medium uppercase tracking-wide">
    Total
  </p>
  <p className="text-2xl font-bold text-[#FEC501]">
    {formatPrice(total)}
  </p>
</div>
```

**Patrón**: Label pequeño pero con tracking/uppercase → Valor grande y bold

---

## 3. Touch Targets

### Tamaños Mínimos (CRÍTICO para POS)

```tsx
// Botones principales (Cobrar, Confirmar)
h-12 lg:h-14          // 48px / 56px ✅

// Botones secundarios (Cancelar, Movimiento)
h-9 lg:h-10           // 36px / 40px ✅

// Botones de cantidad (+/-)
w-9 h-9               // 36px x 36px ✅

// Botones de ícono (cerrar, editar)
w-9 h-9               // 36px x 36px ✅

// FAB móvil
px-8 py-4             // Mínimo 128x64px ✅
```

**Regla**: NUNCA usar botones menores a `w-8 h-8` (32px) en interfaces táctiles.

### Espaciado Entre Botones

```tsx
// Grupo de botones
gap-2                 // 8px mínimo
gap-3                 // 12px recomendado
gap-4                 // 16px ideal para grupos importantes
```

### Padding en Cards Táctiles

```tsx
// Product cards
p-4                   // 16px

// Order items
p-3                   // 12px

// Dialogs
p-6                   // 24px
```

---

## 4. Estados Interactivos

### Pattern: Hover → Active → Disabled

**Botón primario**:
```tsx
<Button
  className="bg-[#FEC501] hover:bg-[#E5B001]
             active:scale-95 transition-transform
             disabled:opacity-40 disabled:cursor-not-allowed
             shadow-lg shadow-[#FEC501]/25"
>
  Acción
</Button>
```

**Botón destructivo**:
```tsx
<Button
  className="bg-red-600 hover:bg-red-500 text-white
             active:scale-95 transition-transform
             shadow-lg shadow-red-600/20"
>
  Eliminar
</Button>
```

**Botón secundario**:
```tsx
<Button
  variant="ghost"
  className="text-[#8b9ab0] hover:text-[#f0f2f5]
             hover:bg-[#252a35]
             active:scale-95 transition-colors"
>
  Cancelar
</Button>
```

### Product Card Interactiva

```tsx
<button
  className="bg-[#12151a] border border-[#2a2f3a]
             hover:border-[#FEC501]/50 hover:bg-[#252a35]
             active:scale-95
             transition-all duration-200
             group"
>
  <img className="group-hover:scale-110 transition-transform duration-200" />
</button>
```

**Patrón**: `group` en contenedor + `group-hover:` en hijos para efectos coordinados

---

## 5. Feedback Visual

### Toasts (Confirmación de Acciones)

```tsx
toast.success('Mensaje', {
  duration: 1000,          // 1s para no interrumpir flujo
  position: 'top-center',  // Visible pero no invasivo
})
```

**Cuándo usar toasts**:
- ✅ Producto agregado al carrito
- ✅ Venta registrada
- ✅ Movimiento de caja creado
- ❌ Validaciones de formulario (usar mensajes inline)
- ❌ Errores críticos (usar dialogs)

### Loading States

```tsx
// Botones
{loading ? (
  <Loader2 className="h-5 w-5 animate-spin" />
) : (
  'Confirmar'
)}

// Cards
<div className="animate-pulse">
  <div className="h-40 bg-[#252a35] rounded-xl" />
</div>
```

### Empty States

```tsx
<div className="flex flex-col items-center justify-center h-full
                text-[#8b9ab0]">
  <IconoGrande className="h-12 w-12 mb-3 text-[#3a3f4a]" />
  <p className="text-sm font-medium">Título descriptivo</p>
  <p className="text-xs text-[#6b7a8d] mt-1">Instrucción clara</p>
</div>
```

**Elementos de empty state**:
1. Icono grande (h-12) en color muy sutil
2. Título descriptivo (text-sm, font-medium)
3. Instrucción de siguiente paso (text-xs)

---

## 6. Layouts Responsive

### Grid de Productos

```tsx
// Mobile-first approach
grid grid-cols-2           // Base: 2 columnas
sm:grid-cols-3             // Tablet pequeña: 3
lg:grid-cols-4             // Desktop: 4
xl:grid-cols-5             // Desktop grande: 5
2xl:grid-cols-6            // Extra large: 6

// Gap siempre proporcional
gap-2 sm:gap-3
```

### Split View (Productos + Carrito)

```tsx
<div className="flex flex-col lg:flex-row gap-0">
  {/* Main area */}
  <div className="flex-1 min-w-0">
    Productos
  </div>

  {/* Sidebar - oculto en mobile */}
  <div className="w-80 lg:w-96 border-l border-[#2a2f3a]
                  shrink-0 hidden md:flex md:flex-col">
    Carrito
  </div>
</div>
```

**Regla**: En mobile, el carrito se accede por FAB/Dialog. En desktop, panel lateral fijo.

### FAB Mobile

```tsx
<div className="md:hidden fixed bottom-20 right-4 z-30">
  {condition && (
    <button className="bg-[#FEC501] text-black font-bold
                       px-8 py-4 rounded-full
                       shadow-lg shadow-[#FEC501]/30
                       active:scale-95 transition-transform">
      Acción ({count})
    </button>
  )}
</div>
```

**Posición**: `bottom-20` para evitar superposición con status bar (height: 64px)

---

## 7. Dialogs y Modals

### Pattern Básico

```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="bg-[#1a1d24] border-[#2a2f3a]
                            text-[#f0f2f5] sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="text-xl font-bold text-[#f0f2f5]">
        Título
      </DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      {/* Contenido */}
    </div>
  </DialogContent>
</Dialog>
```

### Fullscreen Modal (Mobile)

```tsx
<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm
                flex items-center justify-center p-4">
  <div className="bg-[#1a1d24] border border-[#2a2f3a]
                  rounded-xl w-full max-w-lg max-h-[80vh]
                  flex flex-col shadow-xl">
    {/* Header */}
    <div className="flex items-center justify-between px-5 py-4
                    border-b border-[#2a2f3a]">
      <h2 className="text-lg font-bold text-[#f0f2f5]">Título</h2>
      <button className="w-9 h-9 rounded-lg" onClick={onClose}>
        <X className="h-5 w-5" />
      </button>
    </div>

    {/* Content - scrollable */}
    <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
      Contenido
    </div>
  </div>
</div>
```

---

## 8. Formularios

### Inputs

```tsx
// Input estándar
<Input
  type="text"
  placeholder="Placeholder descriptivo"
  className="bg-[#12151a] border-[#2a2f3a]
             text-[#f0f2f5] text-sm h-10
             placeholder:text-[#6b7a8d]
             focus:border-[#FEC501]/50
             focus:ring-2 focus:ring-[#FEC501]/20"
/>

// Input grande (montos, datos críticos)
<Input
  type="number"
  className="bg-[#1a1d24] border-[#2a2f3a]
             text-[#f0f2f5] text-xl h-14
             text-center font-bold
             placeholder:text-[#3a3f4a]
             focus:border-[#FEC501]/50
             focus:ring-2 focus:ring-[#FEC501]/20"
/>
```

### Labels

```tsx
<label className="text-sm font-medium text-[#8b9ab0]">
  Campo requerido
</label>
```

### Toggle Groups (Tipo de orden, método de pago)

```tsx
<div className="grid grid-cols-3 gap-2">
  {options.map((opt) => (
    <button
      key={opt.value}
      onClick={() => setValue(opt.value)}
      className={cn(
        'flex flex-col items-center gap-2 py-4 rounded-xl
         border active:scale-95 transition-all',
        value === opt.value
          ? 'bg-[#FEC501]/10 border-[#FEC501] text-[#FEC501]
             shadow-lg shadow-[#FEC501]/10'
          : 'bg-[#12151a] border-[#2a2f3a] text-[#8b9ab0]
             hover:border-[#3a3f4a]'
      )}
    >
      <span className="text-3xl">{opt.icon}</span>
      <span className="text-sm font-semibold">{opt.label}</span>
    </button>
  ))}
</div>
```

---

## 9. Animaciones

### Principios

1. **Sutiles**: Duraciones de 150-300ms
2. **Purposeful**: Solo animar cuando aporta feedback
3. **Performant**: Usar `transform` y `opacity` (no `width`/`height`)

### Transitions Comunes

```tsx
// Hover rápido
transition-colors duration-150

// Escala táctil
transition-transform duration-150

// Entrada/salida suave
transition-all duration-200

// Imágenes (más lento para suavidad)
transition-transform duration-300
```

### Framer Motion (Listas)

```tsx
{items.map((item, index) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.03 }}  // Stagger sutil
  >
    {item}
  </motion.div>
))}
```

**Regla**: Delay máximo de 30ms entre items (0.03s) para evitar lag percibido

---

## 10. Accesibilidad

### ARIA Labels (Botones de Ícono)

```tsx
<button
  onClick={action}
  aria-label="Descripción clara de la acción"
  className="w-9 h-9"
>
  <Trash2 className="h-4 w-4" />
</button>
```

### Keyboard Navigation

```tsx
<Input
  onKeyDown={(e) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') handleCancel()
  }}
/>
```

**Shortcuts recomendados para POS**:
- `Enter`: Confirmar/Siguiente
- `Escape`: Cancelar/Cerrar
- `Tab`: Navegación entre campos
- `Cmd/Ctrl + K`: Buscar productos (futuro)

### Focus States

```tsx
// Focus siempre visible
focus:ring-2 focus:ring-[#FEC501]/20
focus:border-[#FEC501]/50
```

---

## 11. Status Bar (Footer Persistente)

### Layout

```tsx
<div className="bg-[#1a1d24] border-t border-[#2a2f3a]
                px-4 py-3 shrink-0">
  <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
    {/* Métricas */}
    {/* Separadores */}
    {/* Acciones */}
  </div>
</div>
```

### Métrica Individual

```tsx
<div className="flex items-center gap-2 shrink-0">
  <Icono className="h-5 w-5 text-color" />
  <div>
    <p className="text-xs text-[#8b9ab0] leading-none font-medium">
      Label
    </p>
    <p className="text-base font-bold text-[#f0f2f5] mt-0.5">
      {formatPrice(value)}
    </p>
  </div>
</div>
```

### Separadores

```tsx
<div className="w-px h-10 bg-[#2a2f3a] shrink-0" />
```

---

## 12. Patrones de Datos

### Formateo de Precios

```tsx
import { formatPrice } from '@/lib/utils'

// Siempre usar función centralizada
{formatPrice(amount)}  // → $15.000
```

### Fechas y Horas

```tsx
// Timestamp relativo
new Date(timestamp).toLocaleTimeString('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
})  // → "14:30"

// Fecha completa
new Date(timestamp).toLocaleDateString('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})  // → "17/02/2026"
```

### Badges de Estado

```tsx
// Método de pago
<span className="text-xs text-[#8b9ab0]">
  {paymentConfig.icon} {paymentConfig.label}
</span>

// Estado de orden
<Badge
  variant="outline"
  className={cn(
    'border-[#2a2f3a] text-[10px]',
    status === 'cancelado'
      ? 'bg-red-500/20 text-red-400 border-red-500/30'
      : 'text-[#c4cdd9] bg-[#252a35]'
  )}
>
  {statusLabel}
</Badge>
```

---

## 13. Performance

### Optimizaciones

1. **useCallback en handlers**:
```tsx
const handleAddItem = useCallback((product: Product) => {
  // Evita re-renders innecesarios
}, [])
```

2. **Lazy loading de dialogs**:
```tsx
{showDialog && <Dialog />}  // No montar hasta abrir
```

3. **Virtualización** (futuro, si >100 productos):
```tsx
import { useVirtualizer } from '@tanstack/react-virtual'
```

4. **Optimistic updates**:
```tsx
// Actualizar UI inmediatamente
setItems(newItems)
// Luego llamar API
await updateOrder(...)
```

---

## 14. Testing Checklist

Antes de marcar un feature como completo:

### Visual
- [ ] Paleta de colores consistente con admin
- [ ] Touch targets mínimo 36x36px
- [ ] Tipografía legible (text-sm mínimo para contenido)
- [ ] Estados hover/active/disabled definidos
- [ ] Animaciones sutiles y fluidas

### Funcional
- [ ] Loading states en todas las acciones async
- [ ] Error handling con mensajes claros
- [ ] Toasts de confirmación en acciones exitosas
- [ ] Empty states con instrucciones claras

### Responsive
- [ ] Mobile (< 768px): FAB, dialogs fullscreen
- [ ] Tablet (768px+): Layout adaptado
- [ ] Desktop (1024px+): Sidebar lateral

### Accesibilidad
- [ ] ARIA labels en botones de ícono
- [ ] Keyboard navigation (Enter, Escape)
- [ ] Focus states visibles
- [ ] Contraste mínimo 4.5:1

---

## 15. Componentes Reutilizables

### Metric Display

```tsx
interface MetricProps {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color?: 'default' | 'success' | 'warning' | 'error'
}

function Metric({ label, value, icon: Icon, color = 'default' }: MetricProps) {
  const colors = {
    default: 'text-[#8b9ab0]',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Icon className={`h-5 w-5 ${colors[color]}`} />
      <div>
        <p className="text-xs text-[#8b9ab0] leading-none font-medium">
          {label}
        </p>
        <p className="text-base font-bold text-[#f0f2f5] mt-0.5">
          {value}
        </p>
      </div>
    </div>
  )
}
```

### Action Button Group

```tsx
interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
}: ActionButtonProps) {
  const styles =
    variant === 'destructive'
      ? 'text-red-400 hover:text-red-300 hover:bg-red-950/30'
      : 'text-[#8b9ab0] hover:text-[#f0f2f5] hover:bg-[#252a35]'

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`h-9 gap-2 text-sm px-3 ${styles}`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}
```

---

## Conclusión

Esta guía debe ser el punto de referencia para cualquier desarrollo en el sistema POS. Mantener estos estándares asegura:

1. **Consistencia visual** con el resto del admin panel
2. **Usabilidad óptima** en ambientes de restaurante
3. **Accesibilidad** para todos los usuarios
4. **Performance** adecuado para operación en tiempo real
5. **Mantenibilidad** del código a largo plazo

**Regla de oro**: Cuando dudes, prioriza la **legibilidad** y **facilidad de uso táctil** sobre la estética pura. Un POS es una herramienta de trabajo, no una galería de diseño.
