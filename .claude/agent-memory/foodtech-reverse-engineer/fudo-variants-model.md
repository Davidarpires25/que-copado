# Fudo: Modelo Conceptual de Variantes y "Mitad y Mitad"

## Fuente de Investigación
Análisis basado en documentación oficial de Fudo POS (soporte.fu.do) - marzo 2026
- [Grupos Modificadores](https://soporte.fu.do/es/articles/11730918-grupos-modificadores)
- [Opcionales/Adicionales](https://soporte.fu.do/es/articles/11730915-como-crear-opcionales-adicionales-a-un-producto)
- [Recetas e Ingredientes](https://soporte.fu.do/es/articles/11730888-recetas-de-productos-e-ingredientes)

## Arquitectura General de Variantes en Fudo

Fudo NO tiene un concepto nativo de "variantes" como atributo de producto. En su lugar, utiliza:

### 1. Modificadores (Sistema Flexible de Opciones)

**Definición:** Un **grupo modificador** es un conjunto de productos opcionales que se asocian a un producto base y pueden ser seleccionados por el cajero/vendedor en el POS.

**Estructura:**
```
Producto Base (Ej: Pizza)
├── Grupo Modificador 1: "Tamaño"
│   ├── Opción: Grande (+$5)
│   ├── Opción: Mediana ($0)
│   └── Opción: Chica (-$3)
├── Grupo Modificador 2: "Tipo de Masa"
│   ├── Opción: Clásica
│   ├── Opción: Rellena de Queso (+$2)
│   └── Opción: Sin TACC (+$1)
└── Grupo Modificador 3: "Toppings Adicionales"
    ├── Opción: Extra Muzzarella (+$1.50)
    ├── Opción: Bacon (+$2)
    └── Opción: Piña (+$0.50)
```

**Características clave:**
- **Cantidad Mínima:** Número mínimo de opciones que DEBEN seleccionarse (default: 0 = opcional)
- **Cantidad Máxima:** Número máximo de opciones permitidas
- **Lógica de Precio:** Dos modos:
  - **Suma:** Suma todos los precios de las opciones elegidas
  - **Máximo:** Toma el precio más alto entre las opciones (ideal para tamaños)
- **Visibilidad:** Pueden tener nombre público (para apps) y nombre interno

### 2. Cálculo de Precio Final en POS

**Modelo de Precios:**

```
Precio Final = Precio Base + Suma de Ajustes de Modificadores
```

Ejemplo:
- Producto Base (Pizza): $1,200
- Modificador "Tamaño" = Grande: +$500
- Modificador "Queso Extra": +$300
- **Precio Final: $2,000**

**Importante:** Si lógica es "Máximo" (para tamaños), solo se suma UNA opción:
```
Precio Final = $1,200 + max($500, $0, -$300) = $1,700
```

## Modelo Conceptual para "Mitad y Mitad"

Fudo NO tiene un tipo especial llamado "media pizza" de forma nativa. Sin embargo, basándome en patrones de industria y la arquitectura de modificadores, hay DOS enfoques conceptuales que Fudo soportaría:

### Enfoque A: Dos Productos Separados (Más Común en Fudo)

**Modelo:**
```
1. Crear productos independientes:
   - Producto: "Pizza Mitad Margarita"
   - Producto: "Pizza Mitad Carnívora"

2. Luego crear un producto especial:
   - Producto: "Pizza Mitad y Mitad"
     ├── Grupo Modificador: "Primera Mitad"
     │   ├── Opción: Margarita
     │   ├── Opción: Carnívora
     │   └── Opción: Hawaiana
     └── Grupo Modificador: "Segunda Mitad"
         ├── Opción: Margarita
         ├── Opción: Carnívora
         └── Opción: Hawaiana
```

**Ventaja:** Simple, flexible, escalable. Cada mitad es seleccionable independientemente.

**Desventaja:** Las opciones no son productos reales, sino referencias. No se toman costos automáticos (se abordaría con grupo de precios).

### Enfoque B: Producto Base + Modificador "Complejo" (Alternativa)

```
Producto: "Pizza Personalizada (Cualquier Combinación)"
├── Grupo Modificador: "Ingredientes" (Cantidad Máxima: Ilimitada)
│   ├── Muzzarella
│   ├── Jamón Cocido
│   ├── Pepperoni
│   ├── Cebolla
│   └── ... (todos los ingredientes como opcionales)

    Lógica de Precio: SUMA (cada ingrediente suma su costo)
```

**Ventaja:** Máxima flexibilidad para combinaciones.

**Desventaja:** Incontrolable en POS, el cliente puede combinar de formas no deseadas.

## Sistema de Costo de Recetas en Fudo

**Cálculo automático del costo del producto:**

```
Costo Producto = Suma de (Cantidad de Ingrediente × Costo Unitario del Ingrediente × (1 + Merma%))
```

**Ejemplo:**
```
Pizza Margarita:
- Pre-pizza (masón): 200g × $2/100g × 1.05 (merma 5%) = $4.20
- Muzzarella: 150g × $15/kg × 1.00 = $2.25
- Salsa de tomate: 100g × $8/kg × 1.00 = $0.80
- Aceite de oliva: 5ml × $50/l × 1.00 = $0.25

COSTO TOTAL: $7.50
```

**Importante:** El costo se calcula automáticamente en Fudo. El admin NO edita manualmente el costo del producto.

## Aplicación a "Mitad y Mitad" en Fudo

### Modelo Recomendado por Fudo (Inferido)

Para una "Pizza Mitad Margarita y Mitad Carnívora":

**Base de datos conceptual:**

```
Tabla: productos
- id: "pizza_mitad_mitad_1"
- nombre: "Pizza Mitad y Mitad"
- precio_base: $1,800
- tiene_receta: false (¿o true con lógica especial?)

Tabla: grupos_modificadores
- id: "gm_mitad1"
  nombre: "Primera Mitad"
  cantidad_min: 1
  cantidad_max: 1
  logica_precio: SUMA (0 precio extra, solo selecciona)

- id: "gm_mitad2"
  nombre: "Segunda Mitad"
  cantidad_min: 1
  cantidad_max: 1
  logica_precio: SUMA

Tabla: opciones_modificador
gm_mitad1:
  - "Margarita" (precio: $0, producto_ref: pizza_margarita)
  - "Carnívora" (precio: $0, producto_ref: pizza_carnivora)
  - "Hawaiana" (precio: $0, producto_ref: pizza_hawaiana)

gm_mitad2:
  - "Margarita" (precio: $0, producto_ref: pizza_margarita)
  - "Carnívora" (precio: $0, producto_ref: pizza_carnivora)
  - "Hawaiana" (precio: $0, producto_ref: pizza_hawaiana)

Tabla: asociaciones_grupo_producto
- producto_id: "pizza_mitad_mitad_1"
- grupo_modificador_id: "gm_mitad1"
- orden: 1
- es_obligatorio: true

- producto_id: "pizza_mitad_mitad_1"
- grupo_modificador_id: "gm_mitad2"
- orden: 2
- es_obligatorio: true
```

### Costo de Mitad y Mitad en Fudo

**Opción 1: Precio Fijo (Más Simple)**
- Admin configura manualmente: "Pizza Mitad y Mitad: $1,800"
- No hay cálculo de receta automático
- Riesgo: admin debe mantener sincronizado si cambian costos de pizzas individuales

**Opción 2: Receta Compuesta (Más Sofisticado)**
- Fudo crearía una receta interna para "Mitad y Mitad" que ref
erencia sub-recetas:
```
Receta: Pizza Mitad y Mitad
├── Sub-receta: Pizza Base (50% de ingredientes)
│   ├── Pre-pizza: 100g (mitad de 200g)
│   ├── Ingredientes variables según mitad 1
├── Sub-receta: Pizza Toppings (50% de ingredientes)
│   └── Ingredientes variables según mitad 2
```
- Costo calculado: (Costo_Mitad1 + Costo_Mitad2) / 2

**Realidad en Fudo:** Basándose en su modelo, Fudo probablemente usa **Opción 1** (precio fijo) porque:
1. Sus recetas están ligadas a productos, no a variantes de modificadores
2. No hay concepto de "receta por selección de modificador"
3. El costo se calcula una sola vez al crear el producto, no dinámicamente

## Flujo de POS en Fudo para Mitad y Mitad

```
1. TOMA DE ORDEN
   Cajero → Agrega producto "Pizza Mitad y Mitad"

2. SELECCIÓN DE VARIANTES
   Sistema: "¿Primera Mitad?"
   Cajero: Selecciona "Margarita"

   Sistema: "¿Segunda Mitad?"
   Cajero: Selecciona "Carnívora"

3. CONFIRMACIÓN
   Sistema calcula: Precio = $1,800 (fijo, no cambia)

4. COMANDA DE COCINA
   Imprime algo como:
   ┌─────────────────────┐
   │ PIZZA MITAD Y MITAD │
   │                     │
   │ Mitad 1: Margarita  │
   │ Mitad 2: Carnívora  │
   └─────────────────────┘

5. TICKET DE VENTA
   Pizza Mitad y Mitad     x1    $1,800
```

**Nota:** Fudo probablemente NO gestiona el desglose de costo (50% Margarita + 50% Carnívora) porque sus recetas no están parametrizadas por modificadores.

## Diferencias con el Modelo Que Copado

**Lo que Fudo hace:**
- Modificadores simples (precio fijo por opción)
- Recetas ligadas a productos, no a variantes
- Costo calculado una sola vez en creación
- Precio final = precio base + suma de modificadores

**Lo que Que Copado quiere hacer (más sofisticado):**
- Modificadores que disparan selecciones
- Receta dinámica: 50% ingredientes Pizza A + 50% ingredientes Pizza B
- Costo recalculado según las selecciones de modificadores
- Precio fijo configurado por admin

## Conclusión

Fudo usa un modelo **simple y escalable** de modificadores sin recálculo de costo dinámico. Para "mitad y mitad", Fudo:

1. Crearía productos de pizza individuales (Margarita, Carnívora, etc.) con sus recetas
2. Crearía un producto especial "Pizza Mitad y Mitad" con precio fijo
3. Asociaría dos grupos de modificadores (Primera Mitad, Segunda Mitad)
4. Los costos se manejarían manualmente o como promedio simple

Que Copado puede ser más sofisticado: permitir recetas componibles y cálculo dinámico de costo.
