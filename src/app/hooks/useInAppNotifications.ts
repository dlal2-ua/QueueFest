import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getMisNotificaciones, marcarNotificacionLeida, type InAppNotification } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from '../utils/navigation';

const POLL_INTERVAL_MS = 12000;
const SHOWN_NOTIFICATIONS_STORAGE_KEY = 'queuefest.shown-inapp-notifications';
const TOAST_BATCH_THRESHOLD = 3;

const getShownNotificationsStorageKey = (userId?: number | null) =>
    userId ? `${SHOWN_NOTIFICATIONS_STORAGE_KEY}:${userId}` : SHOWN_NOTIFICATIONS_STORAGE_KEY;

const parseNotificationId = (value: unknown): number | null => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
};

const isNotificationRead = (notification: InAppNotification) =>
    notification.leida === 1 || notification.leida === true;

const loadShownNotificationIds = (storageKey: string) => {
    try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return new Set<number>();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set<number>();
        const ids = parsed
            .map(parseNotificationId)
            .filter((id): id is number => id !== null);
        return new Set<number>(ids);
    } catch {
        return new Set<number>();
    }
};

const persistShownNotificationIds = (storageKey: string, ids: Set<number>) => {
    try {
        sessionStorage.setItem(storageKey, JSON.stringify([...ids]));
    } catch {
        // Ignore storage errors to keep experience stable.
    }
};

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

export function useInAppNotifications(enabled = true) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    const storageKeyRef = useRef(getShownNotificationsStorageKey(user?.id));
    const shownIdsRef = useRef<Set<number>>(loadShownNotificationIds(storageKeyRef.current));
    const knownIdsRef = useRef<Set<number>>(new Set<number>());
    const isInitializedRef = useRef(false);

    navigateRef.current = navigate;

    useEffect(() => {
        storageKeyRef.current = getShownNotificationsStorageKey(user?.id);
        knownIdsRef.current = new Set<number>();
        isInitializedRef.current = false;
        shownIdsRef.current = loadShownNotificationIds(storageKeyRef.current);
    }, [user?.id]);

    useEffect(() => {
        if (!enabled || !user || user.rol !== 'usuario') return;

        let isDisposed = false;

        const syncNotifications = async () => {
            try {
                const notifications = await getMisNotificaciones();
                if (isDisposed || !Array.isArray(notifications)) return;

                const notificationsAsc = [...notifications].sort((a, b) => Number(a.id) - Number(b.id));

                if (!isInitializedRef.current) {
                    notificationsAsc.forEach((notification) => {
                        const id = parseNotificationId(notification.id);
                        if (id) knownIdsRef.current.add(id);
                    });
                    isInitializedRef.current = true;
                    return;
                }

                const freshNotifications: Array<{ id: number; notification: InAppNotification }> = [];

                notificationsAsc.forEach((notification) => {
                    const id = parseNotificationId(notification.id);
                    if (!id) return;

                    const alreadyKnown = knownIdsRef.current.has(id);
                    knownIdsRef.current.add(id);
                    if (alreadyKnown || isNotificationRead(notification)) return;

                    if (shownIdsRef.current.has(id)) return;
                    shownIdsRef.current.add(id);
                    persistShownNotificationIds(storageKeyRef.current, shownIdsRef.current);
                    freshNotifications.push({ id, notification });
                });

                if (freshNotifications.length === 0) return;

                if (freshNotifications.length >= TOAST_BATCH_THRESHOLD) {
                    toast('Tienes nuevas notificaciones', {
                        description: `Han llegado ${freshNotifications.length} avisos nuevos. Revisa tu buzon para no perderte ninguna oportunidad.`,
                        duration: 10000,
                        action: {
                            label: 'Ver buzon',
                            onClick: () => navigateRef.current('/profile/notifications')
                        }
                    });
                    return;
                }

                freshNotifications.forEach(({ id, notification }) => {
                    const destination = resolveNotificationDestination(notification);
                    const title = notification.titulo || 'Nueva oportunidad';
                    const message = notification.mensaje || 'Hay una nueva oportunidad para ti.';

                    toast(title, {
                        description: message,
                        duration: 12000,
                        action: destination
                            ? {
                                label: resolveCtaLabel(notification),
                                onClick: async () => {
                                    navigateRef.current(destination);
                                    try {
                                        await marcarNotificacionLeida(id);
                                    } catch {
                                        // Silent fail to avoid breaking the user flow.
                                    }
                                }
                            }
                            : undefined
                    });
                });
            } catch {
                // Silent fail: notification endpoint can be temporarily unavailable.
            }
        };

        syncNotifications();
        const intervalId = window.setInterval(syncNotifications, POLL_INTERVAL_MS);

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                syncNotifications();
            }
        };

        const handleFocus = () => {
            syncNotifications();
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('focus', handleFocus);

        return () => {
            isDisposed = true;
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('focus', handleFocus);
        };
    }, [enabled, user?.id, user?.rol]);
}
