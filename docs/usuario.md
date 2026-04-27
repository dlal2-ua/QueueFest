# Funcionalidades de Usuario - QueueFest

## Indice
1. [Resumen](#1-resumen)
2. [Rutas de usuario](#2-rutas-de-usuario)
3. [Autenticacion y alta](#3-autenticacion-y-alta)
4. [Seleccion de festival y exploracion](#4-seleccion-de-festival-y-exploracion)
5. [Barras, food trucks, productos y ofertas](#5-barras-food-trucks-productos-y-ofertas)
6. [Carrito, pago y pedidos](#6-carrito-pago-y-pedidos)
7. [Perfil de usuario](#7-perfil-de-usuario)
8. [Reseñas](#8-reseñas)
9. [Notificaciones](#9-notificaciones)
10. [Internacionalizacion](#10-internacionalizacion)
11. [Estado actual y notas](#11-estado-actual-y-notas)

---

## 1. Resumen

La parte de usuario final de QueueFest permite que un asistente del festival:

1. Cree una cuenta o inicie sesion.
2. Seleccione un festival.
3. Consulte barras y food trucks disponibles.
4. Vea menus, productos, detalle de productos, reseñas y ofertas.
5. Añada productos o promociones al carrito.
6. Pague con Stripe o pago simulado segun configuracion.
7. Genere un pedido con QR de recogida.
8. Consulte pedidos activos e historial.
9. Gestione su perfil, idioma, notificaciones, favoritos y metodos de pago locales.
10. Acumule royalties por compras, bonus de bienvenida y reseñas verificadas.

La app de usuario se renderiza dentro de `PhoneFrameShell` y usa navegacion interna basada en `window.history` desde `src/app/App.tsx`.

---

## 2. Rutas de usuario

| Ruta | Pantalla | Funcion |
|---|---|---|
| `/register` | `RegisterScreen` | Registro de usuario |
| `/welcome-bonus` | `WelcomeBonusScreen` | Pantalla de bienvenida con bonus de 1000 royalties |
| `/festival-select` | `FestivalSelectScreen` | Seleccion de festival |
| `/selection` | `SelectionScreen` | Seleccion inicial dentro de la app |
| `/home` | `HomeScreen` | Listado principal de barras y food trucks |
| `/food-truck/:id` | `FoodTruckDetailScreen` | Detalle y menu de food truck |
| `/food-truck/:id/offers` | `FoodTruckOffersScreen` | Ofertas de un food truck |
| `/bar/:id` | `BarDetailScreen` | Detalle y menu de barra |
| `/bar/:id/offers` | `BarOffersScreen` | Ofertas de una barra |
| `/product/:id` | `ProductDetailScreen` | Detalle de producto, favoritos y reseñas |
| `/offers` | `OffersScreen` | Toggle entre ofertas generales y royalties |
| `/cart` | `CartScreen` | Carrito |
| `/payment` | `PaymentScreen` | Checkout |
| `/confirmation` | `OrderConfirmationScreen` | Pedido confirmado, QR y CTA de reseña |
| `/track-order/:id` | `TrackOrderScreen` | Seguimiento del pedido |
| `/profile` | `ProfileScreen` | Perfil principal |
| `/profile/info` | `PersonalInfoScreen` | Informacion personal editable |
| `/profile/royalties` | `RoyaltiesScreen` | Wallet y actividad de royalties |
| `/profile/payments` | `PaymentMethodsScreen` | Metodos de pago locales |
| `/profile/orders` | `OrderHistoryScreen` | Pedidos actuales e historial |
| `/profile/reviews` | `ReviewsScreen` | Mis reseñas |
| `/profile/notifications` | `ProfileNotificationsScreen` | Buzon de notificaciones |
| `/profile/favorites` | `FavoritesScreen` | Favoritos |
| `/profile/support` | `HelpSupportScreen` | Ayuda y soporte |
| `/profile/language` | `LanguageScreen` | Cambio de idioma |

---

## 3. Autenticacion y alta

### Login y registro

El backend expone:

| Endpoint | Metodo | Uso |
|---|---|---|
| `/api/auth/login` | POST | Iniciar sesion |
| `/api/auth/register` | POST | Crear usuario |
| `/api/perfil` | GET | Obtener perfil autenticado |
| `/api/perfil` | PUT | Actualizar perfil |

El registro crea el usuario, inicia sesion automaticamente y redirige a `/welcome-bonus`.

### Bonus de bienvenida

Al registrarse por primera vez:

1. Backend crea una cartera en `loyalty`.
2. Se asignan `1000` puntos iniciales.
3. Se inserta un movimiento en `loyalty_movimientos` con tipo `bonus`.
4. Frontend muestra `WelcomeBonusScreen` con confeti y boton para ir al perfil.

---

## 4. Seleccion de festival y exploracion

### Festival

El usuario puede seleccionar un festival activo. La seleccion se guarda en `sessionStorage` como `festivalSeleccionado`.

Endpoints relacionados:

| Endpoint | Metodo | Uso |
|---|---|---|
| `/api/festivales` | GET | Listar festivales activos |
| `/api/puestos` | GET | Listar puestos, opcionalmente filtrados |
| `/api/puestos/esperas` | GET | Obtener tiempos de espera |

### Home

La pantalla principal muestra barras y food trucks del festival seleccionado. El usuario puede entrar al detalle de cada puesto para consultar productos y ofertas.

---

## 5. Barras, food trucks, productos y ofertas

### Detalle de barra o food truck

Las pantallas `BarDetailScreen` y `FoodTruckDetailScreen` muestran:

1. Nombre, tipo y estado del puesto.
2. Tiempo de espera aproximado.
3. Acceso a ofertas especiales.
4. Menu real cargado desde backend.
5. Boton de añadir al carrito.
6. Boton de ver detalle del producto.
7. Seccion de reseñas del puesto.

Endpoints:

| Endpoint | Metodo | Uso |
|---|---|---|
| `/api/puestos/:id` | GET | Datos del puesto |
| `/api/puestos/:id/productos` | GET | Productos del puesto |
| `/api/puestos/:id/estado` | GET | Estado de apertura/cocina |
| `/api/promociones` | GET | Promociones disponibles |

### Detalle de producto

`ProductDetailScreen` muestra:

1. Nombre, foto, descripcion y precio.
2. Puestos donde se puede pedir.
3. Opcion de volver atras.
4. Opcion visual de favorito.
5. Reseñas propias del producto.
6. Boton para reseñar solo si el usuario ya pidio ese producto y tiene un pedido pendiente de reseñar.

### Ofertas

La ruta `/offers` tiene un toggle:

1. `Ofertas`: promociones generales del festival.
2. `Royalties`: saldo del usuario, QR y actividad del programa.

Las promociones soportan precio fijo, descuento porcentual y combos como `dos_por_uno` o `tres_por_dos`.

---

## 6. Carrito, pago y pedidos

### Carrito

El carrito vive en `CartContext` y se persiste en `localStorage`.

Funcionalidades implementadas:

1. Añadir productos desde barras, food trucks y ofertas.
2. Unificar cantidades si el producto ya existe en carrito.
3. Evitar mezclar productos de puestos distintos en un mismo pedido.
4. Soportar promociones con unidades por aplicacion.
5. Actualizar cantidades.
6. Eliminar productos.
7. Aplicar cupones locales: `SAVE10`, `SAVE20`, `WELCOME`, `FIRSTORDER`.
8. Mostrar total arriba para evitar solaparse con la navbar.
9. Boton flotante para subir arriba cuando el carrito es largo.

### Pago

`PaymentScreen` soporta:

1. Pago simulado.
2. Stripe Checkout si el backend esta configurado con `PAYMENT_PROVIDER=stripe` y clave de Stripe.
3. Validacion de puesto abierto.
4. Validacion de stock.
5. Resumen visual del pedido.
6. Estimacion de royalties a ganar por compra.

Endpoints del modulo de pago:

| Endpoint | Metodo | Uso |
|---|---|---|
| `/api/payments/config` | GET | Saber si Stripe esta activo |
| `/api/payments/create` | POST | Crear pago o pedido simulado |
| `/api/payments/session/:sessionId` | GET | Resolver sesion Stripe y pedido |
| `/api/stripe/webhook` | POST | Confirmacion asincrona de Stripe |

### Pedido confirmado

Tras pagar:

1. Se crea un registro en `pedidos`.
2. Se insertan sus `pedido_items`.
3. Se calcula el total real.
4. Se suman royalties por compra.
5. Se muestra QR de recogida.
6. Se ofrece seguimiento del pedido.
7. Se ofrece reseñar el pedido.

### Mis pedidos

`OrderHistoryScreen` separa:

1. Pedidos actuales: `pendiente`, `confirmado`, `preparando`, `listo`.
2. Historial: pedidos entregados o cancelados.

Cada pedido enlaza a `/track-order/:id`.

---

## 7. Perfil de usuario

### Perfil principal

`ProfileScreen` muestra:

1. Alias como nombre visible si existe.
2. Email.
3. Nivel actual de royalties.
4. Tarjeta resumen de saldo loyalty.
5. Accesos a informacion personal, royalties, pagos, pedidos, reseñas, notificaciones, favoritos, idioma y soporte.

### Informacion personal

`PersonalInfoScreen` permite editar campos reales del perfil:

| Campo | Editable | Persistencia |
|---|---|---|
| Nombre | No | Backend |
| Email | No | Backend |
| Alias | Si | Backend |
| Telefono | Si | Backend |
| Fecha de nacimiento | Si | Backend, acepta `null` si esta vacia |
| Ciudad | Si | Backend |
| Idioma preferido | Si | Backend |
| Festival favorito | Si | Backend |
| Preferencias dieteticas | Si | Backend |
| Alergias | Si | Backend |
| Notificaciones push | Si | Backend |
| Notificaciones email | Si | Backend |
| Consentimiento comercial | Si | Backend |
| Miembro desde | No | Backend |

### Metodos de pago

`PaymentMethodsScreen` gestiona tarjetas en `localStorage`. Es una funcionalidad de interfaz local, no esta conectada a Stripe Customer ni a una tabla de base de datos.

### Favoritos

`FavoritesScreen` usa `localStorage`. Actualmente muestra favoritos guardados localmente y permite eliminarlos. La pantalla no depende todavia de una tabla backend de favoritos.

### Idioma

El idioma se gestiona desde `LanguageContext` y se guarda en `localStorage`. Idiomas definidos:

1. Español.
2. Ingles.
3. Frances.
4. Aleman.
5. Arabe con soporte RTL.

---

## 8. Reseñas

### Objetivo

Las reseñas son verificadas y estan vinculadas a pedidos reales. El usuario puede reseñar un pedido desde la confirmacion o desde un producto elegible.

### Reglas de reseña

1. Solo hay una reseña por pedido.
2. Las estrellas generales son obligatorias.
3. El comentario es opcional.
4. Las estrellas de servicio, personal y rapidez son opcionales.
5. Las valoraciones de productos del pedido son opcionales.
6. Un producto solo se puede reseñar si el usuario lo ha pedido.

### Puntos por reseña

La reseña suma royalties segun esta regla:

| Accion | Puntos |
|---|---:|
| Reseña con estrellas generales | 50 |
| Comentario de al menos 10 caracteres | +20 |
| Valorar servicio, personal y rapidez | +20 |
| Valorar productos concretos | +20 por producto |
| Maximo global de extras | 5 acciones |
| Maximo total por reseña | 150 |

Ejemplo: estrellas generales + comentario + subvaloraciones + 3 productos = `50 + 5 * 20 = 150`.

### Pantallas de reseñas

| Pantalla | Uso |
|---|---|
| `ReviewFormScreen` | Crear reseña de pedido |
| `ReviewsScreen` | Listado general o listado de mis reseñas |
| `ReviewsList` | Componente reutilizable para usuario, producto y puesto |
| `ProductDetailScreen` | Reseñas de producto y boton de reseñar si es elegible |
| `BarDetailScreen` / `FoodTruckDetailScreen` | Reseñas del puesto |

### Endpoints

| Endpoint | Metodo | Uso |
|---|---|---|
| `/api/resenas/context?pedido_id=...` | GET | Preparar formulario de reseña |
| `/api/resenas/eligibilidad/producto/:id` | GET | Saber si el usuario puede reseñar un producto |
| `/api/resenas` | GET | Listar reseñas por usuario, puesto, producto o pedido |
| `/api/resenas` | POST | Crear reseña y sumar puntos |

### Tablas

| Tabla | Funcion |
|---|---|
| `resenas` | Reseña padre del pedido |
| `resenas_productos` | Valoraciones por producto dentro de una reseña |
| `resena_puntos_config` | Configuracion de puntos por accion |
| `loyalty_movimientos` | Movimiento de puntos generado por la reseña |

---

## 9. Notificaciones

El usuario tiene dos niveles de notificaciones:

1. Push notifications mediante suscripcion web push.
2. Buzon interno en `/profile/notifications`.

Endpoints:

| Endpoint | Metodo | Uso |
|---|---|---|
| `/api/notifications/public-key` | GET | Clave publica VAPID |
| `/api/notifications/subscribe` | POST | Registrar suscripcion push |
| `/api/notifications/me` | GET | Listar notificaciones del usuario |
| `/api/notifications/:id/read` | PUT | Marcar notificacion como leida |

El buzon puede enlazar al usuario a una barra o a sus ofertas cuando la notificacion representa una oportunidad.

---

## 10. Internacionalizacion

La app usa `LanguageContext` y la funcion `t(key)`.

Se han externalizado textos de:

1. Navegacion.
2. Perfil.
3. Carrito.
4. Pedidos.
5. Pagos.
6. Reseñas.
7. Royalties.
8. Favoritos.
9. Ayuda.

El soporte RTL se activa automaticamente para arabe.

---

## 11. Estado actual y notas

### Implementado con backend

1. Registro, login y perfil.
2. Listado de festivales, puestos y productos.
3. Pedidos y pedido items.
4. Pago simulado y Stripe Checkout.
5. Historial de pedidos.
6. Royalties por compras, bienvenida y reseñas.
7. Reseñas verificadas.
8. Notificaciones internas y push.

### Implementado local/mock

1. Metodos de pago guardados en `localStorage`.
2. Favoritos guardados en `localStorage`.
3. Cupones locales del carrito.

### Limitaciones conocidas

1. El flujo de pedido actual procesa productos de un unico puesto por carrito.
2. Los favoritos aun no estan persistidos en base de datos.
3. Los metodos de pago del perfil no estan vinculados a Stripe.
4. Algunas pantallas antiguas conservan textos pendientes de internacionalizar al 100 por cien, aunque las nuevas de reseñas y royalties ya usan placeholders.
