# Sistema de Decisiones Automáticas — QueueFest

## Índice
1. [Resumen del sistema](#resumen)
2. [Cambios en base de datos](#cambios-bd)
3. [Reglas automáticas](#reglas)
4. [Test A/B](#test-ab)
5. [Integración con Promociones](#promociones)
6. [Guía de población de datos](#poblacion)

---

## 1. Resumen del sistema

El gestor del festival dispone de un panel de decisiones automáticas. Cada vez que pulsa "Actualizar" (o cada 30 segundos en segundo plano), el backend:

1. Evalúa todos los puestos del festival y genera decisiones según reglas de negocio.
2. Si el modo es **automático**, ejecuta las decisiones pendientes sin intervención humana.
3. Si el modo es **manual**, las decisiones quedan en estado `pendiente` para que el gestor las apruebe o rechace.
4. Evalúa los pares A/B con más de 30 minutos ejecutados y marca la variante ganadora.

---

## 2. Cambios en base de datos

### 2.1 `decisiones_automaticas` — columnas nuevas

| Columna | Tipo | Valores posibles | Descripción |
|---|---|---|---|
| `producto_id` | INT NULL | FK → `productos.id` | Producto al que afecta la decisión. NULL si es decisión de puesto |
| `tipo` | ENUM | `abrir_barra`, `cerrar_barra`, `activar_promocion`, `descuento_producto`, `reposicion_stock` | Tipo de acción |
| `grupo_ab` | VARCHAR(36) | `"{puesto_id}-{timestamp}"` o NULL | Agrupa las dos variantes de un par A/B |
| `variante` | ENUM NULL | `A`, `B`, NULL | Solo en decisiones de par A/B |
| `porcentaje` | DECIMAL(5,2) NULL | `-10.00` | % aplicado. Negativo = bajada |
| `ventas_antes` | INT | ≥ 0 | Unidades vendidas en el momento de generar la decisión |
| `ventas_despues` | INT NULL | ≥ 0 o NULL | Unidades vendidas tras 30 min de ejecución (lo rellena el evaluador A/B) |
| `ganadora` | TINYINT(1) NULL | `1` = ganadora, `0` = perdedora, NULL = empate o no evaluada aún | Solo en pares A/B |

**Columnas que ya existían:**

| Columna | Tipo | Valores posibles |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | — |
| `festival_id` | INT FK | FK → `festivales.id` |
| `puesto_id` | INT FK NULL | FK → `puestos.id` |
| `descripcion` | TEXT | Texto legible para el gestor |
| `estado` | ENUM | `pendiente`, `aprobada`, `rechazada`, `ejecutada` |
| `creado_en` | TIMESTAMP | AUTO |

---

### 2.2 `parametros` — tabla de umbrales (una sola fila, id=1)

| Columna | Tipo | Valor por defecto | Descripción |
|---|---|---|---|
| `id` | INT PK | 1 (siempre) | Fila única |
| `umbral_cola` | INT | 5 | Nº pedidos activos para pausar un puesto |
| `umbral_ventas_bajas` | INT | 3 | Ventas diarias por debajo de las cuales se considera producto lento |
| `porcentaje_subida` | DECIMAL(5,2) | 10.00 | Columna legacy — ya no usada por el motor de decisiones |
| `porcentaje_bajada` | DECIMAL(5,2) | 10.00 | % de bajada al aplicar `descuento_producto` |
| `pricing_dinamico_activo` | TINYINT(1) | 1 | Reservado — no usado por el motor de decisiones aún |
| `promociones_activas` | TINYINT(1) | 1 | Reservado — no usado por el motor de decisiones aún |


---

### 2.3 `promociones` — columnas nuevas

| Columna | Tipo | Valores posibles | Descripción |
|---|---|---|---|
| `producto_id` | INT NULL | FK → `productos.id` | Producto al que aplica la promo. NULL = promo de puesto genérica |
| `tipo` | VARCHAR(40) | `precio_fijo`, `descuento_porcentaje`, `tres_por_dos`, `dos_por_uno` | Tipo de promoción |
| `valor_descuento` | DECIMAL(10,2) NULL | ej. `10.00` para 10% | Solo relevante en `descuento_porcentaje`. NULL en combos |
| `actualizado_en` | TIMESTAMP | AUTO | — |

**Tipos de promoción:**

| `tipo` | Lógica en pedido | `precio_promo` almacenado | `valor_descuento` |
|---|---|---|---|
| `precio_fijo` | Precio directo a `precio_promo` | Precio final | NULL |
| `descuento_porcentaje` | `precio * (1 - valor_descuento/100)` | Precio resultante | % de descuento (ej. 10) |
| `tres_por_dos` | Paga 2 unidades, lleva 3 | `precio * 2/3` (precio unitario efectivo) | NULL |
| `dos_por_uno` | Paga 1 unidad, lleva 2 | `precio / 2` (precio unitario efectivo) | NULL |

---

### 2.4 `productos` — columna nueva

| Columna | Tipo | Valores posibles | Descripción |
|---|---|---|---|
| `categoria` | ENUM | `bebida`, `comida`, `premium`, `otro` | Determina qué tipo de promoción genera el sistema automático |

**Criterio de categorización:**

| `categoria` | Cuándo usar | Promo auto-generada |
|---|---|---|
| `bebida` | Refrescos, cervezas, cócteles de precio medio/bajo | `tres_por_dos` |
| `comida` | Burritos, tacos, pizzas, cualquier plato | `dos_por_uno` |
| `premium` | Botellas caras, cócteles premium (precio alto) | `descuento_porcentaje` (-10%) |
| `otro` | Sin categoría clara | `descuento_porcentaje` (-10%) |

---

### 2.5 `gestor_config`

| Columna | Tipo | Valores | Descripción |
|---|---|---|---|
| `festival_id` | INT PK FK | FK → `festivales.id` | Una fila por festival |
| `modo_auto` | TINYINT(1) | `1` = automático, `0` = manual | En automático las decisiones se ejecutan solas; en manual quedan pendientes |

---

## 3. Reglas automáticas

El motor evalúa cada puesto del festival en orden. Umbrales leídos de `parametros` (fila id=1).

### Regla 1 — Pausar pedidos (`cerrar_barra`)
**Condición:** `puesto.abierto = 1` AND `pedidos activos >= umbral_cola`

Pedidos activos = estados `pendiente`, `confirmado`, `preparando`.

**Efecto al ejecutar:** `UPDATE puestos SET abierto = 0`

---

### Regla 2 — Reanudar pedidos (`abrir_barra`)
**Condición:** `puesto.abierto = 0` AND `pedidos activos < floor(umbral_cola / 2)`

**Efecto al ejecutar:** `UPDATE puestos SET abierto = 1`

---

### Regla 3 — Par A/B descuento (`descuento_producto` × 2)
**Condición:**
- `completados_hoy >= 5` (el festival lleva actividad suficiente)
- El puesto tiene ≥ 2 productos con `vendidos_hoy < umbral_ventas_bajas` AND `vendidos_hoy < maxVentas * 0.3`

Siendo maxVentas el producto más vendido hoy en ese puesto. 

Se seleccionan los 2 productos más lentos. Se genera un par A/B (mismo `grupo_ab`, variante A y B).

**Efecto al ejecutar:** INSERT en `promociones` según categoría del producto (ver tabla 2.4).

**Cooldown:** No se genera un nuevo par para el mismo puesto si ya hay uno en los últimos 15 minutos.

---

### Regla 4 — Reponer stock (`reposicion_stock`)
**Condición:** Existe alguna fila en `stock_puesto` para el puesto donde `stock_actual < stock_minimo` AND `stock_minimo > 0`

**Efecto al ejecutar:** Ninguno. Es solo una alerta — el operador debe actuar manualmente en almacén.

**Cooldown:** No se repite la misma materia prima en el mismo puesto dentro de 30 minutos.

---

## 4. Test A/B

### Generación
Cuando se detectan 2 productos lentos en el mismo puesto, se genera un par:
- Misma decisión duplicada con `grupo_ab = "{puesto_id}-{timestamp}"`
- `variante = 'A'` para el primero, `variante = 'B'` para el segundo
- Al ejecutarse: se crea/activa una promoción en `promociones` para cada producto

### Evaluación (automática tras 30 min)
El sistema compara `ventas_post` de cada producto desde su `creado_en`:
```
ventas_post = SUM(pedido_items.cantidad) donde pedido.creado_en > decision.creado_en
```
- Si hay ganador claro: `ganadora = 1` al ganador, `ganadora = 0` al perdedor
- Si empate: `ganadora = NULL` en ambas
- La promoción del perdedor se desactiva: `UPDATE promociones SET activa = 0`

### Estados posibles en UI

| `ganadora` | `estado` | Visual en panel |
|---|---|---|
| NULL | ejecutada/aprobada | "Par A/B — Comparando estrategias" |
| 1 | ejecutada/aprobada | Badge "Ganadora" con trofeo |
| 0 | ejecutada/aprobada | Badge "Perdedora" en gris |

---

## 5. Integración con Promociones

### Qué genera cada categoría
Cuando `descuento_producto` se ejecuta, el sistema lee `productos.categoria`:

```
bebida   → INSERT promociones tipo='tres_por_dos',         precio_promo = precio * 2/3
comida   → INSERT promociones tipo='dos_por_uno',          precio_promo = precio / 2
premium  → INSERT promociones tipo='descuento_porcentaje', precio_promo = precio * 0.9, valor_descuento = 10
otro     → INSERT promociones tipo='descuento_porcentaje', precio_promo = precio * 0.9, valor_descuento = 10
```

Si ya existe una promo activa para ese producto, se actualiza en lugar de crear una nueva.

### Ciclo de vida de una promoción auto-generada
```
1. A/B generado           → promociones.activa = NULL (no existe aún)
2. Decisión ejecutada     → INSERT promociones activa = 1
3. 30 min después         → evaluarGanadoresAB() corre
4a. Si ganadora           → promociones sigue activa = 1
4b. Si perdedora          → UPDATE promociones SET activa = 0
4c. Si empate             → ambas quedan activa = 1 (el gestor decide)
```

## Notas para el equipo

- **Modo automático vs manual**: en producción se recomienda manual para que el gestor tenga control. El automático es útil para demos.
- **Cooldown 15 min**: el sistema no genera dos veces la misma decisión (mismo tipo + puesto + producto) en menos de 15 minutos. Si los datos de prueba no generan nuevas decisiones, ejecutar `DELETE FROM decisiones_automaticas WHERE festival_id = X` para resetear.
- **El par A/B requiere ≥ 3 productos activos** en el puesto: 1 caliente (para establecer `maxVentas`) y 2 lentos. Con solo 2 productos nunca se genera el par.
