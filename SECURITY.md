# Guía de Seguridad - Que Copado

## Variables de Entorno

### CRÍTICO: Protección de Credenciales

El archivo `.env.local` contiene credenciales sensibles y **NUNCA** debe ser commiteado al repositorio.

#### Acción Inmediata Requerida

Si `.env.local` fue accidentalmente commiteado:

1. **Rotar inmediatamente las credenciales de Supabase:**
   - Ir a Supabase Dashboard > Settings > API
   - Generar nuevas API keys
   - Actualizar `.env.local` con las nuevas credenciales

2. **Eliminar el archivo del historial de Git:**
   ```bash
   git rm --cached .env.local
   git commit -m "Remove sensitive environment file"
   git push
   ```

3. **Usar BFG Repo-Cleaner para limpiar el historial completo:**
   ```bash
   # Solo si el archivo ya fue pusheado a repositorio remoto
   bfg --delete-files .env.local
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   git push --force
   ```

#### Configuración Correcta

1. Copiar `.env.example` a `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Completar con las credenciales reales (obtenerlas de Supabase Dashboard)

3. Verificar que `.env.local` esté en `.gitignore` (ya está configurado)

## Validación de Inputs

Todas las server actions implementan validación exhaustiva de inputs:

- ✅ Validación de campos requeridos
- ✅ Sanitización de strings (trim)
- ✅ Validación de rangos numéricos
- ✅ Validación de formatos (emails, URLs, coordenadas)
- ✅ Límites de longitud de strings
- ✅ Validación de tipos de datos

### Ejemplo de validación implementada:

```typescript
// Antes (INSEGURO)
const name = formData.get('name') as string
const price = parseFloat(formData.get('price') as string)

// Después (SEGURO)
const name = formData.get('name') as string
if (!name?.trim()) {
  return { error: 'El nombre es requerido' }
}
if (name.trim().length > 200) {
  return { error: 'El nombre no puede exceder 200 caracteres' }
}
const price = parseFloat(priceStr)
if (isNaN(price) || price <= 0 || price > 1000000) {
  return { error: 'Precio inválido' }
}
```

## Autenticación y Autorización

### Protección de Rutas Admin

- Middleware verifica autenticación en todas las rutas `/admin/*`
- Server actions verifican `user` antes de ejecutar operaciones
- Redirección automática a `/admin/login` si no está autenticado

### Row Level Security (RLS) en Supabase

IMPORTANTE: Las siguientes políticas RLS deben estar configuradas en Supabase:

#### Tabla `products`
```sql
-- Lectura pública solo de productos activos
CREATE POLICY "Public can view active products"
ON products FOR SELECT
USING (is_active = true);

-- Escritura solo para usuarios autenticados (admin)
CREATE POLICY "Only authenticated users can insert products"
ON products FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only authenticated users can update products"
ON products FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Only authenticated users can delete products"
ON products FOR DELETE
TO authenticated
USING (true);
```

#### Tabla `categories`
```sql
-- Lectura pública
CREATE POLICY "Public can view categories"
ON categories FOR SELECT
USING (true);

-- Escritura solo para usuarios autenticados
CREATE POLICY "Only authenticated users can manage categories"
ON categories FOR ALL
TO authenticated
USING (true);
```

#### Tabla `delivery_zones`
```sql
-- Lectura pública solo de zonas activas
CREATE POLICY "Public can view active delivery zones"
ON delivery_zones FOR SELECT
USING (is_active = true);

-- Escritura solo para usuarios autenticados
CREATE POLICY "Only authenticated users can manage delivery zones"
ON delivery_zones FOR ALL
TO authenticated
USING (true);
```

## Rate Limiting

### API de Geocodificación (Nominatim)

El servicio de Nominatim tiene un límite estricto de 1 request/segundo.

Implementación de throttling:
- `useAddressAutocomplete`: Debounce de 500ms + throttle de 1000ms
- `address-map-picker`: Delay de 1 segundo en reverse geocoding
- AbortController para cancelar requests pendientes

## Logging y Debugging

### Console.log en Producción

Se implementó logging condicional para evitar exponer información en producción:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.error('Error details:', error)
}
```

### Información Sensible

NUNCA incluir en logs:
- Tokens de autenticación
- Contraseñas
- API keys
- Datos personales de usuarios
- Coordenadas exactas de usuarios (excepto para debugging)

## Headers de Seguridad

Recomendaciones para agregar en `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload'
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin'
        }
      ]
    }
  ]
}
```

## Reporte de Vulnerabilidades

Si encuentras una vulnerabilidad de seguridad, por favor:

1. NO la publiques públicamente
2. Contacta al equipo de desarrollo directamente
3. Proporciona detalles específicos y pasos para reproducir

## Auditorías de Seguridad

Ejecutar regularmente:

```bash
# Escaneo de dependencias vulnerables
npm audit

# Corrección automática de vulnerabilidades
npm audit fix

# Análisis de código estático
npm run lint
```

## Checklist de Deployment

Antes de hacer deploy a producción:

- [ ] Verificar que `.env.local` NO está en el repositorio
- [ ] Confirmar que las RLS policies están habilitadas en Supabase
- [ ] Rotar credenciales si hubo exposición accidental
- [ ] Ejecutar `npm audit` y resolver vulnerabilidades críticas
- [ ] Verificar que las variables de entorno estén configuradas en Vercel/plataforma
- [ ] Testear autenticación y autorización en staging
- [ ] Validar rate limiting de Nominatim
- [ ] Revisar logs para información sensible expuesta

## Contacto de Seguridad

Para reportes de seguridad: security@quecopado.com (reemplazar con email real)
