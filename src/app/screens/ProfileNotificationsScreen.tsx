import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { getMisNotificaciones, marcarNotificacionLeida, type InAppNotification } from '../api';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';

const isRead = (notification: InAppNotification) =>
  notification.leida === 1 || notification.leida === true;

const parseNotificationId = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const resolveNotificationDate = (notification: InAppNotification) =>
  notification.creado_en ||
  notification.created_at ||
  (notification as any).fecha ||
  (notification as any).createdAt ||
  '';

const resolvePuestoId = (notification: InAppNotification) => {
  const payload = notification.payload || {};
  return parseNotificationId(
    notification.puesto_id ??
    payload.puesto_id ??
    payload.bar_id ??
    payload.vendor_id
  );
};

const resolveNotificationDestination = (notification: InAppNotification) => {
  const puestoId = resolvePuestoId(notification);
  if (!puestoId) return null;

  const payload = notification.payload || {};
  const puestoTipo = String(payload.puesto_tipo || payload.tipo_puesto || '').toLowerCase();
  const isWaitZero = notification.tipo === 'wait_zero' || payload.trigger === 'wait_zero';

  if (isWaitZero && (puestoTipo === 'foodtruck' || puestoTipo === 'food-truck')) {
    return '/food-truck/' + puestoId + '/offers';
  }

  if (isWaitZero) {
    return '/bar/' + puestoId + '/offers';
  }

  if (puestoTipo === 'foodtruck' || puestoTipo === 'food-truck') {
    return '/food-truck/' + puestoId;
  }

  return '/bar/' + puestoId;
};

const resolveCtaLabel = (notification: InAppNotification) => {
  const payload = notification.payload || {};
  if (notification.tipo === 'wait_zero' || payload.trigger === 'wait_zero') {
    return 'Ir a ofertas';
  }
  return 'Ver barra';
};

const formatNotificationDate = (rawDate: string) => {
  if (!rawDate) return 'Sin fecha';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
  return parsed.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function ProfileNotificationsScreen() {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);

  const loadNotifications = async (opts?: { refresh?: boolean }) => {
    const isManualRefresh = Boolean(opts?.refresh);
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const data = await getMisNotificaciones();
      setNotifications(Array.isArray(data) ? data : []);
      setHasLoadError(false);
    } catch {
      setHasLoadError(true);
    } finally {
      setLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !isRead(notification)).length,
    [notifications]
  );

  const handleMarkAsRead = async (notification: InAppNotification) => {
    const notificationId = parseNotificationId(notification.id);
    if (!notificationId || isRead(notification)) return;

    setNotifications((prev) =>
      prev.map((item) => {
        const itemId = parseNotificationId(item.id);
        return itemId === notificationId ? { ...item, leida: 1 } : item;
      })
    );

    try {
      await marcarNotificacionLeida(notificationId);
    } catch {
      // Silent fail: keep UI responsive even if endpoint fails.
    }
  };

  const handleOpenOpportunity = async (notification: InAppNotification) => {
    const destination = resolveNotificationDestination(notification);
    if (!destination) return;

    await handleMarkAsRead(notification);
    navigate(destination);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Notificaciones</h1>
            <p className="text-sm text-gray-500">Buzon de avisos y oportunidades</p>
          </div>
          <button
            onClick={() => loadNotifications({ refresh: true })}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Actualizar notificaciones"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-5 h-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">No leidas</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{unreadCount}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 text-gray-500 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm border border-gray-100">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Bell className="h-6 w-6 text-gray-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">No hay notificaciones todavia</h2>
            <p className="mt-1 text-sm text-gray-500">
              Cuando llegue una nueva oportunidad, aparecera aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const destination = resolveNotificationDestination(notification);
              const read = isRead(notification);
              const dateLabel = formatNotificationDate(resolveNotificationDate(notification));

              return (
                <article
                  key={notification.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm ${read ? 'border-gray-100' : 'border-orange-200'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {notification.titulo || 'Nueva notificacion'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {notification.mensaje || 'Tienes una nueva novedad en la app.'}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">{dateLabel}</p>
                    </div>
                    {!read && (
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                        Nueva
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {destination && (
                      <button
                        onClick={() => handleOpenOpportunity(notification)}
                        className="inline-flex items-center gap-1 rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                      >
                        {resolveCtaLabel(notification)}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}

                    {!read && (
                      <button
                        onClick={() => handleMarkAsRead(notification)}
                        className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Marcar leida
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {hasLoadError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            No se pudieron actualizar las notificaciones ahora mismo. Puedes seguir usando la app con normalidad.
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
