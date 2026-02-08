# Que Copado - SaaS para Hamburguesería

Sistema de pedidos online para hamburguesería con catálogo público, carrito persistente y checkout por WhatsApp. Panel de administración incluido.

## Stack Tecnológico

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Componentes:** Shadcn/UI
- **Animaciones:** Framer Motion
- **Base de datos:** Supabase (PostgreSQL)
- **Estado global:** Zustand (con persistencia localStorage)
- **Autenticación:** Supabase Auth

## Características

### Cliente
- Catálogo de productos público
- Filtros por categorías
- Carrito de compras persistente
- Checkout via WhatsApp

### Admin
- Login con Supabase Auth
- CRUD completo de productos
- Edición inline de precios
- Toggle de stock (disponible/agotado)
- Toggle de visibilidad (activo/inactivo)

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crear un proyecto en [Supabase](https://supabase.com)
2. Copiar el archivo de ejemplo de variables de entorno:

```bash
cp .env.local.example .env.local
```

3. Completar las variables con tus credenciales de Supabase

### 3. Crear tablas en Supabase

Ejecutar el siguiente SQL en el SQL Editor de Supabase:

```sql
-- Tabla de categorías
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de productos
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_out_of_stock BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de pedidos (opcional, para tracking)
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total DECIMAL(10,2) NOT NULL,
  items JSONB NOT NULL,
  customer_phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'))
);

-- Habilitar RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública para catálogo
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Active products are viewable by everyone" ON products
  FOR SELECT USING (is_active = true);

-- Políticas de admin (requiere autenticación)
CREATE POLICY "Authenticated users can manage categories" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage products" ON products
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage orders" ON orders
  FOR ALL USING (auth.role() = 'authenticated');
```

### 4. Crear usuario admin

En Supabase Dashboard > Authentication > Users, crear un nuevo usuario con email y contraseña.

### 5. Datos de ejemplo

```sql
-- Insertar categorías de ejemplo
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Hamburguesas', 'hamburguesas', 1),
  ('Combos', 'combos', 2),
  ('Papas', 'papas', 3),
  ('Bebidas', 'bebidas', 4),
  ('Postres', 'postres', 5);

-- Insertar productos de ejemplo
INSERT INTO products (category_id, name, description, price, is_active) VALUES
  ((SELECT id FROM categories WHERE slug = 'hamburguesas'), 'Clásica Simple', 'Medallón de carne, lechuga, tomate, cebolla y aderezo especial', 4500, true),
  ((SELECT id FROM categories WHERE slug = 'hamburguesas'), 'Clásica Doble', 'Doble medallón de carne, lechuga, tomate, cebolla y aderezo especial', 6500, true),
  ((SELECT id FROM categories WHERE slug = 'hamburguesas'), 'Bacon Lovers', 'Medallón de carne, doble bacon crocante, cheddar, cebolla caramelizada', 7200, true),
  ((SELECT id FROM categories WHERE slug = 'hamburguesas'), 'BBQ Deluxe', 'Medallón de carne, salsa BBQ, aros de cebolla, bacon, cheddar', 7800, true),
  ((SELECT id FROM categories WHERE slug = 'combos'), 'Combo Simple', 'Hamburguesa clásica + papas medianas + bebida 500ml', 8500, true),
  ((SELECT id FROM categories WHERE slug = 'combos'), 'Combo Doble', 'Hamburguesa doble + papas grandes + bebida 500ml', 11000, true),
  ((SELECT id FROM categories WHERE slug = 'papas'), 'Papas Medianas', 'Porción de papas fritas medianas', 2500, true),
  ((SELECT id FROM categories WHERE slug = 'papas'), 'Papas Grandes', 'Porción de papas fritas grandes', 3500, true),
  ((SELECT id FROM categories WHERE slug = 'papas'), 'Papas con Cheddar', 'Papas fritas con salsa cheddar y bacon', 4500, true),
  ((SELECT id FROM categories WHERE slug = 'bebidas'), 'Coca-Cola 500ml', 'Coca-Cola línea regular 500ml', 1800, true),
  ((SELECT id FROM categories WHERE slug = 'bebidas'), 'Sprite 500ml', 'Sprite 500ml', 1800, true),
  ((SELECT id FROM categories WHERE slug = 'bebidas'), 'Agua Mineral 500ml', 'Agua mineral sin gas 500ml', 1200, true),
  ((SELECT id FROM categories WHERE slug = 'postres'), 'Brownie', 'Brownie de chocolate con nueces', 3200, true),
  ((SELECT id FROM categories WHERE slug = 'postres'), 'Helado', 'Helado artesanal (vainilla, chocolate o dulce de leche)', 2800, true);
```

### 6. Iniciar desarrollo

```bash
npm run dev
```

La aplicación estará disponible en:
- **Catálogo:** http://localhost:3000
- **Admin:** http://localhost:3000/admin/login

## Estructura del Proyecto

```
├── app/
│   ├── page.tsx                    # Catálogo público (Server Component)
│   ├── layout.tsx                  # Layout principal
│   ├── actions/
│   │   ├── auth.ts                 # Server Actions de autenticación
│   │   ├── products.ts             # Server Actions de productos
│   │   └── categories.ts           # Server Actions de categorías
│   └── admin/
│       ├── login/page.tsx          # Login de admin
│       └── dashboard/
│           ├── page.tsx            # Dashboard (Server Component)
│           └── admin-dashboard.tsx # Cliente interactivo
├── components/
│   ├── ui/                         # Componentes Shadcn/UI
│   ├── product-card.tsx            # Card de producto
│   ├── product-grid.tsx            # Grid con filtros
│   ├── category-filter.tsx         # Filtro de categorías
│   ├── cart-drawer.tsx             # Drawer del carrito
│   ├── checkout-button.tsx         # Botón de checkout WhatsApp
│   └── header.tsx                  # Header con carrito
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Cliente para componentes
│   │   ├── server.ts               # Cliente para Server Components
│   │   └── middleware.ts           # Auth middleware
│   ├── store/
│   │   └── cart-store.ts           # Zustand store del carrito
│   ├── types/
│   │   └── database.ts             # Tipos de Supabase
│   └── utils.ts                    # Utilidades
└── middleware.ts                   # Protección de rutas admin
```

## Diseño

- **Modo oscuro:** `bg-slate-950` como fondo principal
- **Color acento:** `#FFAE00` (amarillo hamburguesa)
- **Mobile-first:** Diseño responsive optimizado para móviles
- **Animaciones:** Transiciones suaves con Framer Motion

## Despliegue

### Vercel (Recomendado)

1. Subir el código a GitHub
2. Conectar el repositorio en [Vercel](https://vercel.com)
3. Configurar las variables de entorno en el dashboard de Vercel
4. Deploy automático

### Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_WHATSAPP_NUMBER
```

## Licencia

MIT
