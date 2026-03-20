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

// Operador: obtiene los pedidos de su puesto
export const getPedidosPuesto = async (puestoId: number) => {
    const res = await fetch(`${API_URL}/pedidos/puesto/${puestoId}`, { headers: headers() });
    return res.json();
};

// Operador: actualiza el estado de un pedido (confirmado, preparando, listo...)
export const actualizarEstadoPedido = async (pedidoId: number, estado: string) => {
    const res = await fetch(`${API_URL}/pedidos/${pedidoId}/estado`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ estado })
    });
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

export const actualizarPuesto = async (id: number, data: any) => {
    const res = await fetch(`${API_URL}/admin/puestos/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(data)
    });
    return res.json();
};

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

export const getUsuarios = async () => {
    const res = await fetch(`${API_URL}/admin/usuarios`, { headers: headers() });
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

export const eliminarPuesto = async (id: number) => {
    const res = await fetch(`${API_URL}/admin/puestos/${id}`, {
        method: 'DELETE',
        headers: headers()
    });
    if (!res.ok) throw new Error('Error al eliminar puesto');
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

export const eliminarUsuario = async (id: number) => {
    const res = await fetch(`${API_URL}/admin/usuarios/${id}`, {
        method: 'DELETE',
        headers: headers()
    });
    if (!res.ok) throw new Error('Error al eliminar usuario');
    return res.json();
};

export const getFestivales = async () => {
    const res = await fetch(`${API_URL}/admin/festivales`, { headers: headers() });
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

// ==================== PROMOCIONES (OFERTAS) ====================

export const getPromociones = async (puestoId?: number) => {
    const query = puestoId ? `?puesto_id=${puestoId}` : '';
    const res = await fetch(`${API_URL}/admin/promociones${query}`, { headers: headers() });
    // This allows it to work even without full auth in client screens if the backend allows it, 
    // though the admin path implies authentication. If it fails, fallback gracefully in UI.
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