/**
 * Service Worker for BuyWhatSG PWA
 * Handles caching, offline functionality, and URL interception for automatic app launching
 */

// Import Workbox modules (will be injected by Vite PWA plugin)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst } = workbox.strategies;

const CACHE_NAME = 'buywhatsg-v1';
const DYNAMIC_CACHE_NAME = 'buywhatsg-dynamic-v1';

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Install event - skip waiting for immediate activation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event - take control immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(self.clients.claim());
});

// Register Workbox routes for caching strategies
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [{
      cacheKeyWillBeUsed: async ({ request }) => {
        return `${request.url}?v=${CACHE_NAME}`;
      }
    }]
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [{
      cacheKeyWillBeUsed: async ({ request }) => {
        return `${request.url}?v=${CACHE_NAME}`;
      }
    }]
  })
);

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [{
      cacheKeyWillBeUsed: async ({ request }) => {
        return `${request.url}?v=${CACHE_NAME}`;
      }
    }]
  })
);

// Handle protocol handler requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle protocol handler requests for automatic app launching
  if (url.searchParams.has('handler')) {
    console.log('[SW] Protocol handler request detected:', url.href);
    
    event.respondWith(
      caches.match('/').then((response) => {
        // Notify the app about the URL that was opened
        const handlerPath = url.searchParams.get('handler');
        if (handlerPath) {
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'URL_OPENED',
                url: decodeURIComponent(handlerPath)
              });
            });
          });
        }
        return response || fetch('/');
      })
    );
  }
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle any pending offline actions here
      Promise.resolve()
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from BuyWhatSG',
    icon: '/pwa-192x192.svg',
    badge: '/masked-icon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/pwa-192x192.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/masked-icon.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('BuyWhatSG', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle URL opening from protocol handlers
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Handle protocol handler logic (integrated into main fetch handler above)

// Periodic background sync for data updates
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'content-sync') {
    event.waitUntil(
      // Sync data in the background
      Promise.resolve()
    );
  }
});

// Handle app installation
self.addEventListener('appinstalled', (event) => {
  console.log('[SW] App was installed');
  
  // Track installation analytics or perform post-install actions
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'APP_INSTALLED'
      });
    });
  });
});

console.log('[SW] Service worker script loaded');