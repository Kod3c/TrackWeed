const CACHE_NAME = 'weed-tracker-v1';

// Install service worker - minimal caching
self.addEventListener('install', event => {
  console.log('Service worker installing...');
  self.skipWaiting();
});

// Fetch strategy: Network first, cache as fallback
self.addEventListener('fetch', event => {
  // Skip caching for HTML, CSS, and JS files to ensure fresh content
  if (event.request.url.includes('.html') || 
      event.request.url.includes('.css') || 
      event.request.url.includes('.js')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Only use cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For other resources (images, etc.), use network first but cache them
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response for caching
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});

// Update service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});