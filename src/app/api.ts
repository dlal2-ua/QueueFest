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

const parseApiError = async (res: Response, fallback: string) => {
    try {
        const data = await res.json();
        if (typeof data?.error === 'string' && data.error.trim()) return data.error;
        if (typeof data?.message === 'string' && data.message.trim()) return data.message;
    } catch {
        // Ignore parse errors and use fallback message.
    }
    return fallback;
};

// ==================== AUTH ====================
// Login: devuelve token JWT y datos del usuario con su rol
export const login = async (email: string, password: string) => {
    let res: Response;
    try {
        res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
    } catch {
        throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
    }

    if (!res.ok) {
        try {
            const data = await res.json();
            throw new Error(data?.error || 'Credenciales incorrectas');
        } catch {
            throw new Error('Credenciales incorrectas');
        }
    }

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

// Obtener perfil del usuario autenticado
export const getProfile = async () => {
    const res = await fetch(`${API_URL}/perfil`, {
        headers: headers()
    });
    if (!res.ok) {
        throw new Error('Error al obtener el perfil');
    }
    return res.json();
};

// Actualizar perfil del usuario autenticado
export const updateProfile = async (profileData: {
    alias?: string;
    telefono?: string;
    fecha_nacimiento?: string | null;
    ciudad?: string;
    idioma_preferido?: string;
    festival_favorito?: string;
    preferencias_dieteticas?: string;
    alergias?: string;
    notificaciones_push?: boolean;
    notificaciones_email?: boolean;
    acepta_marketing?: boolean;
}) => {
    const res = await fetch(`${API_URL}/perfil`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(profileData)
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Error al actualizar el perfil');
    }
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

// Obtiene el detalle publico de un puesto concreto, con espera calculada si existe
export const getPuesto = async (puestoId: number) => {
    const res = await fetch(`${API_URL}/puestos/${puestoId}`);
    if (!res.ok) throw new Error('Error cargando el puesto');
    return res.json();
};

// Obtiene el estado actual del puesto (VEND-004)
export const getPuestoEstado = async (puestoId: number) => {
    const res = await fetch(`${API_URL}/puestos/${puestoId}/estado`, { headers: headers() });
    if (!res.ok) throw new Error('Error obteniendo estado');
    return res.json();
};
//Obtiene los puestos del operador
export const getMisPuestosOperador = async () => {
    const res = await fetch(`${API_URL}/operador/mis-puestos`, { headers: headers() });
    if (!res.ok) throw new Error('Error cargando puestos del operador');
    return res.json();
};

// Operador: obtiene el stock de materias primas de su puesto
export const getStockPuesto = async (puestoId: number) => {
    const res = await fetch(`${API_URL}/operador/stock/${puestoId}`, { headers: headers() });
    if (!res.ok) throw new Error('Error cargando stock del puesto');
    return res.json();
};

// Operador: consultar stock disponible en almacén central para una materia prima
export const getStockAlmacen = async (puestoId: number, materiaPrimaId: number) => {
    const res = await fetch(`${API_URL}/operador/stock/${puestoId}/almacen/${materiaPrimaId}`, { headers: headers() });
    if (!res.ok) throw new Error('Error consultando stock del almacén');
    return res.json() as Promise<{ id: number; nombre: string; unidad_medida: string; stock_disponible: number }>;
};

// Operador: reabastecer una materia prima de su puesto (transaccional: descuenta del almacén central)
export const reabastecerMateriaPrima = async (puestoId: number, materiaPrimaId: number, cantidad: number) => {
    const res = await fetch(`${API_URL}/operador/stock/${puestoId}/reabastecer`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ materia_prima_id: materiaPrimaId, cantidad })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Error al reabastecer');
    }
    return res.json();
};

// Operador: predicción de consumo para las próximas 5 horas
export const getPrediccion5h = async (puestoId: number) => {
    const res = await fetch(`${API_URL}/operador/stock/${puestoId}/prediccion-5h`, { headers: headers() });
    if (!res.ok) throw new Error('Error cargando predicción');
    return res.json();
};

// Operador: reposiciones de stock aprobadas por gestor pendientes de confirmar
export const getReposicionesAprobadas = async (puestoId: number) => {
    const res = await fetch(`${API_URL}/operador/stock/${puestoId}/reposiciones-aprobadas`, { headers: headers() });
    if (!res.ok) throw new Error('Error cargando reposiciones');
    return res.json() as Promise<{ id: number; descripcion: string; creado_en: string }[]>;
};

// Operador: confirma que repuso el stock físicamente
export const confirmarReposicion = async (decisionId: number) => {
    const res = await fetch(`${API_URL}/operador/decisiones/${decisionId}/ejecutar`, {
        method: 'POST',
        headers: headers(),
    });
    if (!res.ok) throw new Error('Error confirmando reposición');
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
export const buildImageUrl = (fotoUrl?: string | null) => {
    if (!fotoUrl) return '';
    if (fotoUrl.startsWith('http://') || fotoUrl.startsWith('https://')) {
        return `${fotoUrl}${fotoUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
    }

    const API_ORIGIN = 'http://localhost:3000';
    const base = fotoUrl.startsWith('/') ? `${API_ORIGIN}${fotoUrl}` : `${API_ORIGIN}/${fotoUrl}`;
    return `${base}${base.includes('?') ? '&' : '?'}v=${Date.now()}`;
};
export const setProductoAgotado = async (producto: any, agotado: boolean) => {
    // agotado=true => activo=false (no disponible)
    // agotado=false => activo=true (disponible)
    const payload = {
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: Number(producto.precio),
        precio_dinamico: Number(producto.precio_dinamico || 0),
        stock: Number(producto.stock ?? 0),
        activo: agotado ? 0 : 1
    };

    return actualizarProducto(producto.id, payload);
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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
    return data;
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

export interface InAppNotification {
    id: number;
    usuario_id: number;
    puesto_id: number | null;
    tipo: string;
    titulo: string;
    mensaje: string;
    leida: number | boolean;
    payload?: Record<string, any> | null;
    creado_en?: string;
    created_at?: string;
}

export const getMisNotificaciones = async (): Promise<InAppNotification[]> => {
    const res = await fetch(`${API_URL}/notifications/me`, { headers: headers() });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al cargar notificaciones'));
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
};

export const marcarNotificacionLeida = async (notificationId: number) => {
    const res = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: headers()
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al marcar notificacion como leida'));
    return res.json();
};

// ==================== LOYALTY ====================
export interface LoyaltyMovementRecord {
    id: number;
    loyalty_id: number;
    pedido_id?: number | null;
    tipo: string;
    origen?: string | null;
    puntos: number;
    saldo_resultante?: number | null;
    estado: string;
    descripcion?: string | null;
    creado_en: string;
    confirmado_en?: string | null;
}

export interface LoyaltyTierThresholds {
    vip: number;
    headliner: number;
    backstage: number;
}

export interface LoyaltyResponse {
    id?: number;
    usuario_id?: number;
    puntos_total: number;
    puntos_pendientes: number;
    puntos_ganados_total: number;
    puntos_canjeados_total: number;
    nivel: string;
    activo: boolean;
    ultimo_movimiento_en?: string | null;
    ultimo_canje_en?: string | null;
    tier_thresholds: LoyaltyTierThresholds;
    movements: LoyaltyMovementRecord[];
}

// Obtiene los puntos acumulados del usuario logueado
export const getLoyalty = async (): Promise<LoyaltyResponse> => {
    const res = await fetch(`${API_URL}/loyalty`, { headers: headers() });
    if (!res.ok) throw new Error('Error al cargar loyalty');
    return res.json();
};

// ==================== RESENAS ====================
export interface ReviewProductRecord {
    id: number;
    resena_id: number;
    producto_id: number;
    estrellas: number;
    comentario?: string | null;
    origen: 'manual' | 'ia';
    producto_nombre: string;
    foto_url?: string | null;
}

export interface ReviewRecord {
    id: number;
    pedido_id: number;
    usuario_id: number;
    puesto_id: number;
    estrellas_general: number;
    comentario?: string | null;
    estrellas_servicio?: number | null;
    estrellas_personal?: number | null;
    estrellas_rapidez?: number | null;
    puntos_sumados: number;
    creado_en: string;
    usuario_nombre: string;
    puesto_nombre: string;
    puesto_tipo: string;
    productos: ReviewProductRecord[];
}

export interface ReviewContextProduct {
    producto_id: number;
    cantidad: number;
    nombre: string;
    descripcion?: string | null;
    foto_url?: string | null;
}

export interface ReviewContext {
    pedido: {
        id: number;
        usuario_id: number;
        puesto_id: number;
        total: number | string;
        estado: string;
        creado_en: string;
        puesto_nombre: string;
        puesto_tipo: string;
    };
    productos: ReviewContextProduct[];
    existing_review?: { id: number; puntos_sumados: number } | null;
    can_review: boolean;
}

export interface ProductReviewEligibility {
    has_ordered: boolean;
    can_review: boolean;
    pedido?: {
        pedido_id: number;
        puesto_id: number;
        puesto_nombre: string;
        puesto_tipo: string;
        creado_en: string;
    } | null;
}

export interface CreateReviewPayload {
    pedido_id: number;
    estrellas_general: number;
    comentario?: string | null;
    estrellas_servicio?: number | null;
    estrellas_personal?: number | null;
    estrellas_rapidez?: number | null;
    productos?: Array<{
        producto_id: number;
        estrellas: number;
        comentario?: string | null;
    }>;
}

export const getReviewContext = async (pedidoId: number): Promise<ReviewContext> => {
    const res = await fetch(`${API_URL}/resenas/context?pedido_id=${pedidoId}`, { headers: headers() });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al cargar el pedido para reseñar'));
    return res.json();
};

export const getProductReviewEligibility = async (productId: number): Promise<ProductReviewEligibility> => {
    const res = await fetch(`${API_URL}/resenas/eligibilidad/producto/${productId}`, { headers: headers() });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al comprobar si puedes reseñar'));
    return res.json();
};

export const getReviews = async (params: {
    mine?: boolean;
    puesto_id?: number | string;
    producto_id?: number | string;
    pedido_id?: number | string;
    limit?: number;
} = {}): Promise<ReviewRecord[]> => {
    const query = new URLSearchParams();
    if (params.mine) query.set('mine', '1');
    if (params.puesto_id) query.set('puesto_id', String(params.puesto_id));
    if (params.producto_id) query.set('producto_id', String(params.producto_id));
    if (params.pedido_id) query.set('pedido_id', String(params.pedido_id));
    if (params.limit) query.set('limit', String(params.limit));

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_URL}/resenas${suffix}`, { headers: headers() });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al cargar reseñas'));
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
};

export const createReview = async (payload: CreateReviewPayload) => {
    const res = await fetch(`${API_URL}/resenas`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al guardar la reseña'));
    return res.json();
};

// ==================== GESTOR ====================
// Estadísticas del día: pedidos, ingresos, espera media, puestos abiertos
export const getEstadisticas = async (festivalId?: number) => {
    const url = festivalId
        ? `${API_URL}/gestor/estadisticas?festival_id=${festivalId}`
        : `${API_URL}/gestor/estadisticas`;
    const res = await fetch(url, { headers: headers() });
    return res.json();
};

// Heatmap data: activity and stats per post
export const getHeatmap = async () => {
    const res = await fetch(`${API_URL}/gestor/heatmap`, { headers: headers() });
    if (!res.ok) throw new Error('Error al cargar heatmap');
    return res.json();
};

// Lee el modo auto/manual del festival
export const getModoAuto = async (festivalId: number) => {
    const res = await fetch(`${API_URL}/gestor/modo-auto?festival_id=${festivalId}`, { headers: headers() });
    if (!res.ok) throw new Error('Error al obtener modo automático');
    return res.json();
};

// Cambia el modo auto/manual del festival
export const setModoAuto = async (festivalId: number, activo: boolean) => {
    const res = await fetch(`${API_URL}/gestor/modo-auto`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ festival_id: festivalId, activo })
    });
    if (!res.ok) throw new Error('Error al cambiar modo automático');
    return res.json();
};

// Obtiene (y genera) las decisiones automáticas de un festival
export const getDecisiones = async (festivalId: number) => {
    const res = await fetch(`${API_URL}/gestor/decisiones?festival_id=${festivalId}`, { headers: headers() });
    if (!res.ok) throw new Error('Error al cargar decisiones');
    return res.json();
};

// El gestor aprueba (y ejecuta) una decisión pendiente
export type BotComprasPeriodo = 'hoy' | '7d' | 'festival';

export const getBotComprasDashboard = async (festivalId: number, periodo: BotComprasPeriodo = 'festival') => {
    const query = new URLSearchParams({
        festival_id: String(festivalId),
        periodo
    });
    const res = await fetch(`${API_URL}/gestor/bot-compras/dashboard?${query.toString()}`, { headers: headers() });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al cargar el dashboard del bot'));
    return res.json();
};

export const evaluarBotCompras = async (festivalId: number) => {
    const res = await fetch(`${API_URL}/gestor/bot-compras/evaluar`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ festival_id: festivalId })
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al evaluar el bot de compra'));
    return res.json();
};

export const aprobarDecision = async (id: number) => {
    const res = await fetch(`${API_URL}/gestor/decisiones/${id}/aprobar`, {
        method: 'POST',
        headers: headers()
    });
    if (!res.ok) throw new Error('Error al aprobar decisión');
    return res.json();
};

// El gestor rechaza una decisión pendiente
export const rechazarDecision = async (id: number) => {
    const res = await fetch(`${API_URL}/gestor/decisiones/${id}/rechazar`, {
        method: 'POST',
        headers: headers()
    });
    if (!res.ok) throw new Error('Error al rechazar decisión');
    return res.json();
};

// SSE stream de eventos del panel gestor — devuelve función de cleanup
export function subscribeGestorEventos(festivalId: number, onEvent: (type: string) => void): () => void {
    const token = localStorage.getItem('token');
    if (!token) return () => {};
    const url = `${API_URL}/gestor/eventos?festival_id=${festivalId}&token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.onmessage = (e) => { try { onEvent(JSON.parse(e.data).type); } catch {} };
    return () => es.close();
}

// Puestos del festival con posición en el mapa y métricas en tiempo real
export const getMapaPuestos = async (festivalId: number) => {
    const res = await fetch(`${API_URL}/gestor/mapa?festival_id=${festivalId}`, { headers: headers() });
    if (!res.ok) throw new Error('Error al cargar mapa');
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

export const subirFotoFestival = async (id: number, formData: FormData) => {
    const authHeaders = headers();
    delete (authHeaders as any)['Content-Type']; // fetch pone el boundary automáticamente

    const res = await fetch(`${API_URL}/admin/festivales/${id}/foto`, {
        method: 'POST',
        headers: authHeaders,
        body: formData
    });
    if (!res.ok) throw new Error('Error al subir foto de festival');
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

export const subirFotoPuesto = async (id: number, formData: FormData) => {
    const authHeaders = headers();
    delete (authHeaders as any)['Content-Type'];

    const res = await fetch(`${API_URL}/admin/puestos/${id}/foto`, {
        method: 'POST',
        headers: authHeaders,
        body: formData
    });
    if (!res.ok) throw new Error('Error al subir foto de puesto');
    return res.json();
};

// ── Productos ─────────────────────────────────────────────────────────────

export const getAdminProductos = async (puestoId: number) => {
    const res = await fetch(`${API_URL}/admin/productos?puesto_id=${puestoId}`, { headers: headers() });
    if (!res.ok) throw new Error('Error al cargar productos del admin');
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

export const eliminarProducto = async (id: number) => {
    const res = await fetch(`${API_URL}/admin/productos/${id}`, {
        method: 'DELETE',
        headers: headers()
    });
    if (!res.ok) throw new Error('Error al eliminar producto');
    return res.json();
};

export const subirFotoProducto = async (id: number, formData: FormData) => {
    const authHeaders = headers();
    delete (authHeaders as any)['Content-Type'];

    const res = await fetch(`${API_URL}/admin/productos/${id}/foto`, {
        method: 'POST',
        headers: authHeaders,
        body: formData
    });
    if (!res.ok) throw new Error('Error al subir foto de producto');
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

// Gestor: stock mínimos por puesto (agrupado)
export const getStockMinimos = async (festivalId: number) => {
    const res = await fetch(`${API_URL}/gestor/stock-minimos?festival_id=${festivalId}`, { headers: headers() });
    if (!res.ok) throw new Error('Error cargando stock mínimos');
    return res.json() as Promise<{
        puesto_id: number;
        puesto_nombre: string;
        items: { materia_prima_id: number; mp_nombre: string; unidad_medida: string; stock_minimo: number; stock_actual: number }[];
    }[]>;
};

// Gestor: actualizar stock_minimo de una materia prima en un puesto
export const updateStockMinimo = async (puesto_id: number, materia_prima_id: number, stock_minimo: number) => {
    const res = await fetch(`${API_URL}/gestor/stock-minimos`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ puesto_id, materia_prima_id, stock_minimo }),
    });
    if (!res.ok) throw new Error('Error actualizando stock mínimo');
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

export type PromotionType =
    | 'precio_fijo'
    | 'dos_por_uno'
    | 'tres_por_dos'
    | 'descuento_porcentaje'
    | 'descuento_valor';

export interface PromotionRecord {
    id: number;
    puesto_id: number;
    producto_id: number | null;
    titulo: string;
    descripcion: string | null;
    precio_promo: number;
    tipo?: PromotionType | string;
    valor_descuento?: number | null;
    cantidad_promocion?: number;
    cantidad_cobrada?: number;
    activa: boolean;
    creado_en?: string;
    actualizado_en?: string;
    puesto_nombre?: string;
    puesto_tipo?: string;
    festival_id?: number;
    producto_nombre?: string | null;
    producto_precio?: number | null;
    producto_precio_dinamico?: number | null;
    producto_activo?: boolean | null;
}

export interface PromotionMutationPayload {
    puesto_id: number;
    producto_id: number;
    titulo: string;
    descripcion?: string | null;
    precio_promo?: number | null;
    tipo?: PromotionType | string;
    valor_descuento?: number | null;
    activa?: boolean;
}

export const getPuestoPromociones = async (puestoId: number): Promise<PromotionRecord[]> => {
    const res = await fetch(`${API_URL}/promociones?puesto_id=${puestoId}`);
    if (!res.ok) throw new Error('Error al cargar promociones del puesto');
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
};

export const getFestivalPromociones = async (festivalId: number): Promise<PromotionRecord[]> => {
    const res = await fetch(`${API_URL}/promociones?festival_id=${festivalId}`);
    if (!res.ok) throw new Error('Error al cargar promociones del festival');
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
};

export const getGestorPromociones = async (festivalId: number, puestoId?: number): Promise<PromotionRecord[]> => {
    const query = new URLSearchParams({ festival_id: String(festivalId) });
    if (puestoId) query.set('puesto_id', String(puestoId));
    const res = await fetch(`${API_URL}/gestor/promociones?${query.toString()}`, { headers: headers() });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al cargar promociones del gestor'));
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
};

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

// ==================== ADMIN DASHBOARD (queuefest_dw — puerto 3001) ====================
// Todos los endpoints de esta sección apuntan al servidor de Data Warehouse (index-adminDashboard.js)
// que corre en http://localhost:3001 y conecta con la base de datos queuefest_dw.

export const crearPromocionGestor = async (data: PromotionMutationPayload) => {
    const res = await fetch(`${API_URL}/gestor/promociones`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al crear promocion'));
    return res.json();
};

export const actualizarPromocionGestor = async (id: number, data: Partial<PromotionMutationPayload>) => {
    const res = await fetch(`${API_URL}/gestor/promociones/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al actualizar promocion'));
    return res.json();
};

export const eliminarPromocionGestor = async (id: number) => {
    const res = await fetch(`${API_URL}/gestor/promociones/${id}`, {
        method: 'DELETE',
        headers: headers()
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Error al eliminar promocion'));
    return res.json();
};

const DW_URL = 'http://localhost:3001/api';

// Cabeceras con token JWT para el servidor DW (mismo JWT_SECRET que el principal)
const dwHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
});

// Helper genérico: construye query string a partir de un objeto de filtros
function buildDwQuery(filters: { [k: string]: string | number | undefined }): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    return qs ? '?' + qs : '';
}

// ── Tipos de filtros globales del dashboard ───────────────────────────────
export interface DwFilters {
    periodo?: 'hoy' | 'sem' | 'mes' | 'todo';
    festival_id?: number | string;
    tipo_puesto?: 'barra' | 'foodtruck' | '';
    sort_by?: string;
    [key: string]: string | number | undefined;  // index signature — necesario para pasar DwFilters a buildDwQuery
}

// ── Festivales (selector de filtro) ──────────────────────────────────────
export const getDwFestivales = async () => {
    const res = await fetch(`${DW_URL}/festivales`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar festivales del DW');
    return res.json();
};

// ── Sección 1: Resumen global ─────────────────────────────────────────────
export const getDwResumen = async (filters: DwFilters = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/resumen${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar resumen');
    return res.json();
};

export const getDwIngresosPorPuesto = async (filters: DwFilters = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/ingresos-por-puesto${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar ingresos por puesto');
    return res.json();
};

export const getDwPedidosPorTipo = async (filters: DwFilters = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/pedidos-por-tipo${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar pedidos por tipo');
    return res.json();
};

// ── Sección 2: Ingresos y actividad ──────────────────────────────────────
export const getDwIngresosActividad = async (filters: DwFilters = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/ingresos-actividad${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar ingresos y actividad');
    return res.json();
};

// ── Sección 3: Rendimiento por puesto ────────────────────────────────────
export const getDwPuestosKpis = async (filters: DwFilters = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/puestos/kpis${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar KPIs de puestos');
    return res.json();
};

export const getDwPuestosTabla = async (filters: DwFilters & { sort_by?: string } = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/puestos/tabla${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar tabla de puestos');
    return res.json();
};

export const getDwPuestosEspera = async (filters: DwFilters = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/puestos/espera${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar esperas de puestos');
    return res.json();
};

// ── Sección 4: Productos y rentabilidad ──────────────────────────────────
export const getDwProductos = async (filters: DwFilters = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/productos${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar productos del dashboard');
    return res.json();
};

// ── Sección 5: Stock y operaciones ───────────────────────────────────────
export const getDwStock = async (filters: Pick<DwFilters, 'festival_id'> = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/stock${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar stock');
    return res.json();
};

// ── Sección 6: Usuarios y comportamiento ─────────────────────────────────
export const getDwUsuarios = async (filters: DwFilters = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/usuarios${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar usuarios');
    return res.json();
};

// ── Sección 7: Loyalty ────────────────────────────────────────────────────
export const getDwLoyalty = async (filters: Pick<DwFilters, 'festival_id'> = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/loyalty${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar loyalty');
    return res.json();
};

// ── Sección 8: Promociones ────────────────────────────────────────────────
export const getDwPromociones = async (filters: DwFilters = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/promociones${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar promociones');
    return res.json();
};

// ── Sección 9: Alertas ────────────────────────────────────────────────────
export const getDwAlertas = async (filters: Pick<DwFilters, 'festival_id'> = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/alertas${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar alertas');
    return res.json();
};

export const getDwAlertasCount = async () => {
    const res = await fetch(`${DW_URL}/dashboard/alertas/count`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar conteo de alertas');
    return res.json();
};

export const resolverAlertaDw = async (id: number) => {
    const res = await fetch(`${DW_URL}/alertas/${id}/resolver`, {
        method: 'PATCH',
        headers: dwHeaders(),
    });
    if (!res.ok) throw new Error('Error al resolver alerta');
    return res.json();
};

export const resolverTodasAlertasDw = async (categoria?: string) => {
    const qs = categoria ? `?categoria=${categoria}` : '';
    const res = await fetch(`${DW_URL}/alertas/resolver-todas${qs}`, {
        method: 'POST',
        headers: dwHeaders(),
    });
    if (!res.ok) throw new Error('Error al marcar alertas como resueltas');
    return res.json();
};

// ── Sección 10: Predicción de demanda ────────────────────────────────────
export const getDwPrediccion = async (filters: DwFilters = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/prediccion${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar predicción');
    return res.json();
};

// ── Sección 11: Heatmap del festival ─────────────────────────────────────
export const getDwHeatmap = async (filters: Required<Pick<DwFilters, 'festival_id'>> & Partial<DwFilters>) => {
    const res = await fetch(`${DW_URL}/dashboard/heatmap${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar heatmap');
    return res.json();
};

// ── Sección 12: CLV ───────────────────────────────────────────────────────
export const getDwClv = async (filters: Pick<DwFilters, 'festival_id'> = {}) => {
    const res = await fetch(`${DW_URL}/dashboard/clv${buildDwQuery(filters)}`, { headers: dwHeaders() });
    if (!res.ok) throw new Error('Error al cargar CLV');
    return res.json();
};
