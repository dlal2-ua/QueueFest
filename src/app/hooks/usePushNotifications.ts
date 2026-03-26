import { useEffect } from 'react';
import { getVapidPublicKey, subscribeToPushNotifications } from '../api';
import { toast } from 'sonner';

export function usePushNotifications() {
    useEffect(() => {
        // Solo pedimos permisos e inicializamos el SW si el nav lo soporta
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return;
        }

        const initPush = async () => {
            try {
                // Registramos el worker
                const register = await navigator.serviceWorker.register('/sw.js');

                // Esperar a que el worker esté activo
                await navigator.serviceWorker.ready;

                // Comprobamos permisos
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    return;
                }

                // Obtener nuestra clave pública VAPID del backend
                const publicKeyBase64 = await getVapidPublicKey();
                const applicationServerKey = urlB64ToUint8Array(publicKeyBase64);

                // Suscribirse
                const subscription = await register.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey
                });

                // Enviar subscripción a nuestro backend Oracle
                await subscribeToPushNotifications(subscription);
                // Silencioso. El backend ya tiene nuestro endpoint para avisarnos si el pedido está listo.

            } catch (err) {
                console.error('Error suscribiendo a Push:', err);
            }
        };

        initPush();
    }, []);
}

// Función auxiliar indispensable para el protocolo Web Push
function urlB64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
