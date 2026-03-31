// api.ts
// Capa de comunicación entre el frontend React y el backend Node.js
// Todas las llamadas HTTP a la API REST van aquí centralizadas
// Así si cambia la URL del servidor solo hay que tocarlo en un sitio
// API_URL apunta al servidor Oracle donde corre el backend Express

// const API_URL = 'http://143.47.35.13:3000/api';
const API_URL = 'http://localhost:3000/api';

// Recupera el token JWT guardado en localStorage tras el login
const getToken = () => localStorage.getItem('token');

// Cabeceras comunes para rutas protegidas (requieren estar logueado)
const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`
});

// ==================== AUTH ====================
// Login: devuelve token JWT y datos del usuario con su rol
export const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Credenciales incorrectas');
    return res.json();
};

// Register: crea un usuario nuevo con rol 'usuario' por defecto
export const register = async (email: string, password: string, nombre: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nombre })
    });
    if (!res.ok) throw new Error('Error al registrarse');
    return res.json();
};

// ==================== PUESTOS ====================
// Obtiene todos los puestos abiertos (barras y food trucks) — sin filtro de festival
export const getPuestos = async () => {
    const res = await fetch(`${API_URL}/puestos`, { headers: headers() });
    return res.json();
};

// Obtiene los puestos de un festival concreto (usado en AdminScreen con contexto de festival)
export const getPuestosByFestival = async (festivalId: number) => {
    const res = await fetch(`${API_URL}/admin/puestos?festival_id=${festivalId}`, { headers: headers() });
    if (!res.ok) throw new Error('Error al cargar puestos del festival');
    return res.json();
};

// Obtiene los puestos de un festival filtrados por tipo (barra/foodtruck), sin autenticación
// Usado en el flujo público: FestivalSelectScreen → SelectionScreen → HomeScreen
export const getPuestosByFestivalPublico = async (festivalId: number, tipo: string) => {
    const res = await fetch(`${API_URL}/puestos?festival_id=${festivalId}&tipo=${tipo}`);
    if (!res.ok) throw new Error('Error al cargar puestos');
    return res.json();
};

// Obtiene los productos activos de un puesto concreto
export const getProductos = async (puestoId: number) => {
    const res = await fetch(`${API_URL}/puestos/${puestoId}/productos`, { headers: headers() });
    return res.json();
};

// Obtiene el estado actual del puesto (VEND-004)
export const getPuestoEstado = async (puestoId: number) => {
    const res = await fetch(`${API_URL}/puestos/${puestoId}/estado`, { headers: headers() });
    if (!res.ok) throw new Error('Error obteniendo estado');
    return res.json();
};

// Llama al botón pánico (pausar, reanudar o llamar camarero) (VEND-004)
export const triggerPanico = async (puestoId: number, accion: string) => {
    const res = await fetch(`${API_URL}/puestos/${puestoId}/panico`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ accion })
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error en botón pánico');
    }
    return res.json();
};

// ==================== PEDIDOS ====================
// Crea un pedido nuevo y suma puntos loyalty automáticamente
export const crearPedido = async (data: any) => {
    const res = await fetch(`${API_URL}/pedidos`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data)
    });
    return res.json();
};
// ============= <Stripe> ===============
export const getPaymentConfig = async () => {
    const res = await fetch(`${API_URL}/payments/config`, { headers: headers() });
    if (!res.ok) throw new Error('Error cargando configuración de pagos');
    return res.json();
};

export const createPayment = async (data: any) => {
    const res = await fetch(`${API_URL}/payments/create`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data)
    });

    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(responseData.error || 'Error creando el pago');
    return responseData;
};

export const getPaymentSession = async (sessionId: string) => {
    const res = await fetch(`${API_URL}/payments/session/${sessionId}`, { headers: headers() });
    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(responseData.error || 'Error consultando el pago');
    return responseData;
};
// ============= </Stripe> ===============

// Obtiene el historial de pedidos del usuario logueado
export const getMisPedidos = async () => {
    const res = await fetch(`${API_URL}/pedidos/mis-pedidos`, { headers: headers() });
    return res.json();
};

// Obtiene el detalle completo de un pedido (para TrackOrderScreen)
export const getPedido = async (pedidoId: number) => {
    const res = await fetch(`${API_URL}/pedidos/${pedidoId}`, { headers: headers() });
    if (!res.ok) return null; // Return null instead of throwing — TrackOrderScreen handles this as "not found"
    return res.json();
};

// Operador: obtiene los pedidos de su puesto
export const getPedidosPuesto = async (puestoId: number) => {
    const res = await fetch(`${API_URL}/pedidos/puesto/${puestoId}`, { headers: headers() });
    return res.json();
};

// Operador: actualiza el estado de un pedido (confirmado, preparando, listo...)
export const cambiarEstadoPedido = async (pedidoId: number, estado: string) => {
    const res = await fetch(`${API_URL}/pedidos/${pedidoId}/estado`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ estado })
    });
    if (!res.ok) throw new Error('Error actualizando pedido');
    return res.json();
};

// ─── PUSH NOTIFICATIONS ───
export const getVapidPublicKey = async () => {
    const res = await fetch(`${API_URL}/notifications/public-key`);
    if (!res.ok) throw new Error('No se pudo obtener VAPID Key');
    const data = await res.json();
    return data.publicKey;
};

export const subscribeToPushNotifications = async (subscription: PushSubscription) => {
    const res = await fetch(`${API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(subscription)
    });
    if (!res.ok) throw new Error('Failed to save subscription');
    return res.json();
};

// ==================== LOYALTY ====================
// Obtiene los puntos acumulados del usuario logueado
export const getLoyalty = async () => {
    const res = await fetch(`${API_URL}/loyalty`, { headers: headers() });
    return res.json();
};

// ==================== GESTOR ====================
// Estadísticas del día: pedidos, ingresos, espera media, puestos abiertos
export const getEstadisticas = async () => {
    const res = await fetch(`${API_URL}/gestor/estadisticas`, { headers: headers() });
    return res.json();
};

// Heatmap data: activity and stats per post
export const getHeatmap = async () => {
    const res = await fetch(`${API_URL}/gestor/heatmap`, { headers: headers() });
    if (!res.ok) throw new Error('Error al cargar heatmap');
    return res.json();
};

// ==================== ADMIN ====================

// ── Festivales ────────────────────────────────────────────────────────────

// Lista todos los festivales
export const getFestivales = async () => {
    const res = await fetch(`${API_URL}/admin/festivales`, { headers: headers() });
    return res.json();
};

// Crea un festival nuevo
export const crearFestival = async (data: any) => {
    const res = await fetch(`${API_URL}/admin/festivales`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data)
    });
    return res.json();
};

// Desactiva un festival: actualiza activo = 0 sin eliminar sus datoss
export const desactivarFestival = async (id: number) => {
    const res = await fetch(`${API_URL}/admin/festivales/${id}/desactivar`, {
        method: 'PATCH',
        headers: headers()
    });
    if (!res.ok) throw new Error('Error al desactivar el festival');
    return res.json();
};

export const eliminarFestival = async (id: number) => {
    const res = await fetch(`${API_URL}/admin/festivales/${id}`, {
        method: 'DELETE',
        headers: headers()
    });
    if (!res.ok) throw new Error('Error al eliminar festival');
    return res.json();
};

// Activa un festival: actualiza activo = 1
export const activarFestival = async (id: number) => {
    const res = await fetch(`${API_URL}/admin/festivales/${id}/activar`, {
        method: 'PATCH',
        headers: headers()
    });
    if (!res.ok) throw new Error('Error al activar el festival');
    return res.json();
};

// Actualiza los datos de un festival existente
export const actualizarFestival = async (id: number, data: any) => {
    const res = await fetch(`${API_URL}/admin/festivales/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al actualizar festival');
    return res.json();
};

// Obtiene festivales activos públicamente (sin auth) — usado en FestivalSelectScreen
export const getFestivalesPublicos = async () => {
    const res = await fetch(`${API_URL}/festivales`);
    if (!res.ok) throw new Error('Error al cargar festivales');
    return res.json();
};

// ── Puestos ───────────────────────────────────────────────────────────────

// Crea un puesto (barra o food truck) dentro de un festival
export const crearPuesto = async (data: any) => {
    const res = await fetch(`${API_URL}/admin/puestos`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data)
    });
    return res.json();
};

export const actualizarPuesto = async (id: number, data: any) => {
    const res = await fetch(`${API_URL}/admin/puestos/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(data)
    });
    return res.json();
};

export const eliminarPuesto = async (id: number) => {
    const res = await fetch(`${API_URL}/admin/puestos/${id}`, {
        method: 'DELETE',
        headers: headers()
    });
    if (!res.ok) throw new Error('Error al eliminar puesto');
    return res.json();
};

// ── Productos ─────────────────────────────────────────────────────────────

export const crearProducto = async (data: any) => {
    const res = await fetch(`${API_URL}/admin/productos`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data)
    });
    return res.json();
};

export const actualizarProducto = async (id: number, data: any) => {
    const res = await fetch(`${API_URL}/admin/productos/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(data)
    });
    return res.json();
};

export const eliminarProducto = async (id: number) => {
    const res = await fetch(`${API_URL}/admin/productos/${id}`, {
        method: 'DELETE',
        headers: headers()
    });
    if (!res.ok) throw new Error('Error al eliminar producto');
    return res.json();
};

// ── Parámetros ────────────────────────────────────────────────────────────

export const getParametros = async () => {
    const res = await fetch(`${API_URL}/admin/parametros`, { headers: headers() });
    return res.json();
};

export const actualizarParametros = async (data: any) => {
    const res = await fetch(`${API_URL}/admin/parametros`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(data)
    });
    return res.json();
};

// ── Usuarios ──────────────────────────────────────────────────────────────

// Obtiene TODOS los usuarios (sin filtro de rol)
export const getUsuarios = async () => {
    const res = await fetch(`${API_URL}/admin/usuarios`, { headers: headers() });
    return res.json();
};

// Obtiene solo el personal de staff: administrador (rol_id 1), gestor (2), operador (3)
// El backend filtra WHERE rol_id IN (1, 2, 3)
export const getUsuariosStaff = async () => {
    const res = await fetch(`${API_URL}/admin/usuarios/staff`, { headers: headers() });
    if (!res.ok) throw new Error('Error al cargar personal staff');
    return res.json();
};

export const crearUsuario = async (data: any) => {
    const res = await fetch(`${API_URL}/admin/usuarios`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al crear usuario');
    return res.json();
};

export const eliminarUsuario = async (id: number) => {
    const res = await fetch(`${API_URL}/admin/usuarios/${id}`, {
        method: 'DELETE',
        headers: headers()
    });
    if (!res.ok) throw new Error('Error al eliminar usuario');
    return res.json();
};

// ── Promociones ───────────────────────────────────────────────────────────

export const getPromociones = async (puestoId?: number) => {
    const query = puestoId ? `?puesto_id=${puestoId}` : '';
    const res = await fetch(`${API_URL}/admin/promociones${query}`, { headers: headers() });
    return res.json();
};

export const crearPromocion = async (data: any) => {
    const res = await fetch(`${API_URL}/admin/promociones`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al crear promocion');
    return res.json();
};

export const actualizarPromocion = async (id: number, data: any) => {
    const res = await fetch(`${API_URL}/admin/promociones/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al actualizar promocion');
    return res.json();
};

export const eliminarPromocion = async (id: number) => {
    const res = await fetch(`${API_URL}/admin/promociones/${id}`, {
        method: 'DELETE',
        headers: headers()
    });
    if (!res.ok) throw new Error('Error al eliminar promocion');
    return res.json();
};


