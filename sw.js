// Service Worker para notificaciones del tablero IMSA
const CACHE_NAME = 'tablero-imsa-v1';

// Instalar el service worker
self.addEventListener('install', (event) => {
    console.log('Service Worker instalado');
    self.skipWaiting();
});

// Activar el service worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activado');
    event.waitUntil(self.clients.claim());
});

// Manejar notificaciones push
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/IMSA_Logo1-01 (1) (2).png',
            badge: '/IMSA_Logo1-01 (1) (2).png',
            tag: data.tag || 'tablero-alert',
            requireInteraction: data.requireInteraction || false,
            data: data.data || {},
            actions: [
                {
                    action: 'view',
                    title: 'Ver Tablero'
                },
                {
                    action: 'dismiss',
                    title: 'Descartar'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'view') {
        // Abrir o enfocar el tablero
        event.waitUntil(
            self.clients.matchAll().then((clients) => {
                // Buscar si ya hay una ventana abierta
                for (const client of clients) {
                    if (client.url.includes('localhost:5490') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Si no hay ventana abierta, abrir una nueva
                if (self.clients.openWindow) {
                    return self.clients.openWindow('/');
                }
            })
        );
    }
});

// Manejar mensajes desde la aplicación principal
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag, requireInteraction } = event.data;
        
        const options = {
            body: body,
            icon: '/IMSA_Logo1-01 (1) (2).png',
            badge: '/IMSA_Logo1-01 (1) (2).png',
            tag: tag || 'tablero-alert',
            requireInteraction: requireInteraction || false,
            silent: false,
            vibrate: [200, 100, 200]
        };

        self.registration.showNotification(title, options);
    }
}); 