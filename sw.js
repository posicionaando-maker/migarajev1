// ============================================
// SERVICE WORKER - GARAJE EN LÍNEA
// ============================================

const CACHE_NAME = 'garaje-v1';
const OFFLINE_URL = 'offline.html';

// Recursos a cachear en la instalación
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/css/style.css',
    '/js/app.js',
    '/js/qrcode.min.js',
    '/img/icon-192.png',
    '/img/icon-512.png',
    '/img/placeholder.webp'
];

// ===== INSTALACIÓN =====
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Cacheando assets estáticos...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Assets cacheados');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('❌ Error en instalación:', err);
            })
    );
});

// ===== ACTIVACIÓN =====
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Eliminando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => self.clients.claim())
    );
});

// ===== INTERCEPCIÓN DE PETICIONES =====
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Estrategia para producto.json (stale-while-revalidate)
    if (url.pathname === '/productos.json') {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        // Actualizar caché en segundo plano
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => {
                        // Si falla la red, devolver el caché (incluso si es null)
                        return cachedResponse;
                    });
                    
                    // Devolver el caché si existe, si no, esperar la red
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }
    
    // Estrategia para imágenes (cache first, luego red)
    if (url.pathname.match(/\.(webp|jpg|jpeg|png|gif|svg)$/i)) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(networkResponse => {
                    // Guardar en caché para futuras visitas
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    // Si no hay imagen, devolver placeholder
                    return caches.match('/img/placeholder.webp');
                });
            })
        );
        return;
    }
    
    // Estrategia para archivos JS y CSS (cache first)
    if (url.pathname.match(/\.(js|css)$/i)) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                });
            })
        );
        return;
    }
    
    // Estrategia para HTML (network first, fallback a offline)
    if (url.pathname.match(/\.html$/) || url.pathname === '/') {
        event.respondWith(
            fetch(event.request).then(networkResponse => {
                // Si la red funciona, devolver la respuesta
                return networkResponse;
            }).catch(() => {
                // Si no hay red, devolver offline.html
                return caches.match(OFFLINE_URL);
            })
        );
        return;
    }
    
    // Estrategia por defecto (network first)
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
