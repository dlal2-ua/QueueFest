// api.ts
// Capa de comunicación entre el frontend React y el backend Node.js
// Todas las llamadas HTTP a la API REST van aquí centralizadas
// Así si cambia la URL del servidor solo hay que tocarlo en un sitio
// API_URL apunta al servidor Oracle donde corre el backend Express

const API_URL = 'http://143.47.35.13:3000/api';

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
// Obtiene todos los puestos abiertos (barras y food trucks)
export const getPuestos = async () => {
    const res = await fetch(`${API_URL}/puestos`, { headers: headers() });
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

// ==================== ADMIN ====================
// Crea un festival nuevo
export const crearFestival = async (data: any) => {
    const res = await fetch(`${API_URL}/admin/festivales`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data)
    });
    return res.json();
};

// Crea un puesto (barra o food truck) dentro de un festival
export const crearPuesto = async (data: any) => {
    const res = await fetch(`${API_URL}/admin/puestos`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data)
    });
    return res.json();
};