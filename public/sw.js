// Service Worker para notificaciones push
const CACHE_NAME = 'homeapp-cache-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/favicon.ico'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Manejo de notificaciones push
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de HomeApp',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/favicon.ico'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('HomeApp', options)
  );
});

// Manejo de clic en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('Notification click received.');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Abrir la aplicación en la página de dashboard
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'close') {
    // Solo cerrar la notificación
    event.notification.close();
  } else {
    // Comportamiento por defecto: abrir dashboard
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Fetch events para manejar offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
