# Sistema de Royalties - QueueFest

## Indice
1. [Resumen](#1-resumen)
2. [Reglas economicas](#2-reglas-economicas)
3. [Niveles](#3-niveles)
4. [Como se ganan puntos](#4-como-se-ganan-puntos)
5. [Cartera y movimientos](#5-cartera-y-movimientos)
6. [QR de usuario](#6-qr-de-usuario)
7. [Pantallas de usuario](#7-pantallas-de-usuario)
8. [Configuracion admin](#8-configuracion-admin)
9. [Backend y base de datos](#9-backend-y-base-de-datos)
10. [SQL de inicializacion](#10-sql-de-inicializacion)
11. [Notas de negocio](#11-notas-de-negocio)

---

## 1. Resumen

Los royalties son la moneda virtual de QueueFest. Sirven para recompensar actividad real del usuario dentro de la aplicacion:

1. Registro inicial.
2. Compras confirmadas.
3. Reseñas verificadas.
4. Futuras promociones o activaciones especiales.

El usuario ve sus royalties desde:

1. Resumen del perfil.
2. Pantalla `/profile/royalties`.
3. Tab de royalties dentro de `/offers`.
4. Confirmacion de pedido.
5. Resumen de pago.
6. Listado de reseñas propias.

---

## 2. Reglas economicas

| Concepto | Regla |
|---|---|
| Puntos por compra | 100 royalties por cada 1 EUR gastado |
| Equivalencia por centimo | 1 royalty por cada 0,01 EUR |
| Canje teorico | 1000 royalties = 1 EUR |
| Cashback equivalente | 10 por cien del gasto |
| Bonus bienvenida | 1000 royalties |

Ejemplos:

| Compra | Royalties ganados | Valor canjeable teorico |
|---:|---:|---:|
| 1,00 EUR | 100 | 0,10 EUR |
| 13,52 EUR | 1352 | 1,352 EUR |
| 100,00 EUR | 10000 | 10,00 EUR |

El calculo se hace con `Math.round(total * 100)`.

---

## 3. Niveles

Los niveles se calculan sobre el saldo de puntos del usuario.

| Nivel | Puntos minimos por defecto | Gasto equivalente |
|---|---:|---:|
| Fan | 0 | 0 EUR |
| VIP | 10000 | 100 EUR |
| Headliner | 25000 | 250 EUR |
| Backstage | 50000 | 500 EUR |

Los umbrales se guardan en `parametros`:

| Columna | Default |
|---|---:|
| `loyalty_vip_threshold` | 10000 |
| `loyalty_headliner_threshold` | 25000 |
| `loyalty_backstage_threshold` | 50000 |

El admin puede cambiar estos valores desde el panel de administracion, en la pestaña de usuarios, al final de la pantalla.

---

## 4. Como se ganan puntos

### 4.1 Bonus de bienvenida

Al crear una cuenta se genera:

1. Registro en `loyalty`.
2. Saldo inicial de `1000`.
3. Movimiento `bonus` en `loyalty_movimientos`.
4. Pantalla de bienvenida con confeti.

### 4.2 Compras

Cuando se confirma un pedido:

1. Se calcula el total real del pedido.
2. Se calculan `Math.round(total * 100)` puntos.
3. Se actualiza `loyalty.puntos_total`.
4. Se actualiza `loyalty.puntos_ganados_total`.
5. Se inserta un movimiento tipo `compra`.
6. Se guarda `pedidos.puntos_ganados`.

Esto ocurre tanto en pago simulado como en Stripe confirmado.

### 4.3 Reseñas

Las reseñas suman puntos solo si se crean sobre pedidos reales.

| Accion | Puntos |
|---|---:|
| Crear reseña con estrellas generales | 50 |
| Comentario de al menos 10 caracteres | +20 |
| Valorar servicio, personal y rapidez | +20 |
| Valorar producto concreto del pedido | +20 por producto |
| Maximo global de acciones extra | 5 |
| Maximo total por reseña | 150 |

El limite de 5 acciones extra es global. Por ejemplo, si el usuario añade comentario y subvaloraciones, solo quedan 3 acciones extra bonificables para productos.

### 4.4 Promociones futuras

La documentacion y textos de UI contemplan activaciones especiales del festival que podrian multiplicar royalties. La logica base actual ya tiene el espacio funcional, pero no hay multiplicadores conectados todavia en backend.

---

## 5. Cartera y movimientos

### Tabla `loyalty`

| Columna | Funcion |
|---|---|
| `id` | Identificador de cartera |
| `usuario_id` | Usuario propietario |
| `puntos_total` | Saldo disponible |
| `puntos_pendientes` | Puntos aun no confirmados |
| `puntos_ganados_total` | Historico ganado |
| `puntos_canjeados_total` | Historico canjeado |
| `nivel` | Nivel textual almacenado |
| `activo` | Cartera activa |
| `ultimo_movimiento_en` | Fecha del ultimo movimiento |
| `creado_en` | Fecha de creacion |
| `actualizado_en` | Ultima actualizacion |

### Tabla `loyalty_movimientos`

| Columna | Funcion |
|---|---|
| `id` | Identificador del movimiento |
| `loyalty_id` | Cartera afectada |
| `pedido_id` | Pedido relacionado, si aplica |
| `tipo` | `bonus`, `compra`, `resena`, `canje`, etc. |
| `origen` | Origen funcional del movimiento |
| `puntos` | Puntos positivos o negativos |
| `saldo_resultante` | Saldo tras el movimiento |
| `estado` | `confirmado`, `pendiente`, `cancelado`, etc. |
| `descripcion` | Texto visible |
| `creado_en` | Fecha del movimiento |
| `confirmado_en` | Fecha de confirmacion |

---

## 6. QR de usuario

Cada usuario tiene un QR de identificacion loyalty.

Formato de codigo:

```text
QFU-000001
```

Payload del QR:

```json
{
  "type": "QUEUEFEST_LOYALTY",
  "userId": 1,
  "loyaltyCode": "QFU-000001",
  "userName": "Nombre usuario",
  "userEmail": "usuario@email.com"
}
```

Uso previsto:

1. El usuario pide presencialmente en una barra o food truck.
2. Antes de cobrar, el empleado escanea el QR.
3. El pedido queda asociado a ese usuario.
4. El usuario acumula royalties tambien por compras presenciales.

Actualmente el QR esta implementado en frontend y listo para integrarse con el flujo de operador/punto de venta.

---

## 7. Pantallas de usuario

### Perfil

`ProfileScreen` muestra:

1. Saldo disponible.
2. Puntos pendientes.
3. Nivel actual.
4. Progreso hacia el siguiente nivel.
5. Acceso directo a la pantalla de royalties.

### Pantalla de royalties

`RoyaltiesScreen` contiene `RoyaltiesPanel`, que muestra:

1. Saldo disponible.
2. Equivalencia de canje.
3. Puntos pendientes.
4. Puntos acumulados historicos.
5. Nivel y objetivo.
6. QR de usuario.
7. Reglas para ganar royalties.
8. Beneficios esperados.
9. Actividad reciente.

### Ofertas

`OffersScreen` tiene dos pestañas:

1. Ofertas generales del festival.
2. Royalties, con QR y panel de saldo.

### Pago

`PaymentScreen` muestra antes de pagar cuantos royalties se ganaran con la compra.

### Confirmacion

`OrderConfirmationScreen` muestra los puntos ganados tras crear el pedido.

### Reseñas

`ReviewsScreen` muestra los puntos ganados por cada reseña propia.

---

## 8. Configuracion admin

El admin puede ajustar los umbrales globales de nivel desde `AdminScreen`.

Ubicacion:

```text
Admin -> Usuarios -> final de la pantalla -> Niveles globales de Royalties
```

El admin introduce valores en euros, pero la aplicacion los convierte a puntos:

```text
euros * 100 = puntos de umbral
```

Ejemplos:

| Valor admin | Puntos guardados |
|---:|---:|
| 100 EUR | 10000 |
| 250 EUR | 25000 |
| 500 EUR | 50000 |

Endpoint:

| Endpoint | Metodo | Uso |
|---|---|---|
| `/api/admin/parametros` | GET | Leer parametros globales |
| `/api/admin/parametros` | PUT | Guardar umbrales y otros parametros |

---

## 9. Backend y base de datos

### Endpoints principales

| Endpoint | Metodo | Uso |
|---|---|---|
| `/api/loyalty` | GET | Obtener cartera, niveles y movimientos |
| `/api/auth/register` | POST | Crea cartera y bonus de bienvenida |
| `/api/payments/create` | POST | Crea pedido y suma puntos por compra |
| `/api/payments/session/:sessionId` | GET | Confirma Stripe y suma puntos si procede |
| `/api/resenas` | POST | Crea reseña y suma puntos |
| `/api/admin/parametros` | PUT | Actualiza umbrales de niveles |

### Funciones frontend importantes

| Funcion | Archivo | Uso |
|---|---|---|
| `calculateRoyaltiesForPurchase` | `profileData.ts` | Calcula puntos por compra |
| `getRoyaltyTierStatus` | `profileData.ts` | Calcula nivel actual y siguiente |
| `getRoyaltyProgress` | `profileData.ts` | Calcula progreso visual |
| `getRoyaltiesToNextTier` | `profileData.ts` | Calcula puntos restantes |
| `getLoyalty` | `api.ts` | Consume `/api/loyalty` |

### Migraciones automaticas del backend

Al arrancar, el backend asegura:

1. Columnas de loyalty en `parametros`.
2. Tablas de reseñas.
3. Configuracion de puntos por reseña.
4. Tabla `payment_sessions`.
5. Columnas necesarias en `pedido_items`.

---

## 10. SQL de inicializacion

El archivo principal relacionado es:

```text
server-backend/loyalty_welcome_and_reviews.sql
```

Incluye:

1. Alta segura de columnas en `parametros` para umbrales loyalty.
2. Valores por defecto de niveles.
3. Configuracion de puntos de reseñas.
4. Creacion de carteras faltantes con 1000 puntos.
5. Movimiento inicial de bienvenida si no existe.

Debe ejecutarse sobre la base de datos activa de QueueFest.

---

## 11. Notas de negocio

### Cashback

Con la regla actual:

```text
100 puntos por 1 EUR gastado
1000 puntos canjeables por 1 EUR
```

El sistema equivale a un cashback del 10 por cien.

### Reseñas

La recompensa maxima de reseña es 150 puntos, equivalente a 0,15 EUR de valor canjeable teorico. Esto incentiva el feedback sin competir con la recompensa principal por compra.

### Niveles

Los niveles por defecto son alcanzables:

1. VIP con 100 EUR de gasto acumulado.
2. Headliner con 250 EUR.
3. Backstage con 500 EUR.

Esto permite progresion visible durante uno o varios festivales sin exigir gasto excesivo.

### Pendiente futuro

1. Implementar canje real de royalties en checkout.
2. Integrar QR de usuario en el flujo de operador para compras presenciales.
3. Añadir multiplicadores temporales por campaña.
4. Persistir favoritos y metodos de pago en backend si se decide llevarlos a produccion.
