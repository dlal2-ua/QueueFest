// public/sw.js
// Service Worker para recibir notificaciones Push

self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const title = data.title || 'QueueFest';
            const options = {
                body: data.body,
                icon: data.icon || '/favicon.ico',
                badge: '/favicon.ico',
                data: data.data || {}
            };

            event.waitUntil(
                self.registration.showNotification(title, options)
            );
        } catch (e) {
            // Si no es JSON válido
            event.waitUntil(
                self.registration.showNotification('QueueFest', {
                    body: event.data.text(),
                    icon: '/favicon.ico'
                })
            );
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    // Si la notificación tiene una URL en su data, la abrimos
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then(windowClients => {
                // Obtenemos todos los clientes de la PWA/web
                for (var i = 0; i < windowClients.length; i++) {
                    var client = windowClients[i];
                    if (client.url.includes(self.registration.scope) && 'focus' in client) {
                        client.navigate(event.notification.data.url);
                        return client.focus();
                    }
                }
                // Si no hay ventana abierta, abrimos una nueva
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data.url);
                }
            })
        );
    }
});
