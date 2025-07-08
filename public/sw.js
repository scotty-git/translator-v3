/**
 * Service Worker for Real-time Translator PWA
 * Provides offline functionality and caching for better mobile browser experience
 */

const CACHE_NAME = 'translator-v3-v1.0.0'
const STATIC_CACHE = 'translator-static-v1.0.0'
const DYNAMIC_CACHE = 'translator-dynamic-v1.0.0'

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Core app files will be added by build process
]

// Network-first resources (always try network first)
const NETWORK_FIRST = [
  '/api/',
  'supabase.co',
  'openai.com',
  '/session/',
  '/conversations',
  '/settings'
]

// Cache-first resources (serve from cache if available)
const CACHE_FIRST = [
  '.js',
  '.css',
  '.woff2',
  '.png',
  '.jpg',
  '.svg',
  '.ico'
]

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('🔧 [SW] Service Worker installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('🔧 [SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('🔧 [SW] Static assets cached')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('🔧 [SW] Failed to cache static assets:', error)
      })
  )
})

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('🔧 [SW] Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🔧 [SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('🔧 [SW] Service Worker activated')
        return self.clients.claim()
      })
  )
})

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return
  }

  // Network-first strategy for API calls and dynamic content
  if (NETWORK_FIRST.some(pattern => request.url.includes(pattern))) {
    event.respondWith(networkFirst(request))
    return
  }

  // Cache-first strategy for static assets
  if (CACHE_FIRST.some(pattern => request.url.includes(pattern))) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Default: network-first with fallback
  event.respondWith(networkFirst(request))
})

/**
 * Network-first caching strategy
 */
async function networkFirst(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // If successful, update cache
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Network failed, try cache
    console.log('🔧 [SW] Network failed, trying cache for:', request.url)
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // If no cache, return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html')
    }
    
    // For other requests, return a basic response
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

/**
 * Cache-first caching strategy
 */
async function cacheFirst(request) {
  // Try cache first
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    // Cache miss, try network
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('🔧 [SW] Cache and network failed for:', request.url)
    
    // Return offline fallback
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('🔧 [SW] Background sync:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync())
  }
})

/**
 * Handle background sync when online
 */
async function handleBackgroundSync() {
  try {
    // Sync offline actions (messages, session data, etc.)
    console.log('🔧 [SW] Performing background sync')
    
    // Check for pending messages in IndexedDB
    // Sync with Supabase when online
    // This would integrate with your existing offline storage
    
  } catch (error) {
    console.error('🔧 [SW] Background sync failed:', error)
  }
}

/**
 * Push notifications (for future use)
 */
self.addEventListener('push', (event) => {
  console.log('🔧 [SW] Push notification received')
  
  const options = {
    body: 'New translation message received',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'translation-notification',
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }
  
  if (event.data) {
    const data = event.data.json()
    options.body = data.message || options.body
  }
  
  event.waitUntil(
    self.registration.showNotification('Real-time Translator', options)
  )
})

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  console.log('🔧 [SW] Notification clicked:', event.action)
  
  event.notification.close()
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

/**
 * Handle messages from main thread
 */
self.addEventListener('message', (event) => {
  console.log('🔧 [SW] Message received:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        )
      })
    )
  }
})

console.log('🔧 [SW] Service Worker script loaded')