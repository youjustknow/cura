const CACHE_NAME = 'courier-app-v1';
const urlsToCache = [
    './',
    'index.html',
    'styles.css',
    'script.js',
    'manifest.json',
    'icons/android-launchericon-192-192.png',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    'https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2'
];

// Установка service worker и кэширование файлов
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Кэширование ресурсов');
                return cache.addAll(urlsToCache);
            })
    );
});

// Активация service worker и удаление старых кэшей
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                        console.log('Удаление старого кэша:', cacheName);
                        return caches.delete(cacheName);
                })
            );
        })
    );
});

// Перехват запросов и обработка кэшированных ресурсов
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Возвращаем кэшированный ответ, если он есть
                if (response) {
                    return response;
                }

                // Если ответа нет в кэше, делаем запрос к сети
                return fetch(event.request).then(
                    (networkResponse) => {
                        // Проверяем валидность ответа
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Кэшируем новый ответ
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                );
            })
    );
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const options = {
            body: data.body || 'Уведомление от приложения',
            icon: 'icons/android-launchericon-192-192.png',
            badge: 'icons/android-launchericon-72-72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                url: data.url || '/'
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Уведомление', options)
        );
    } catch (error) {
        console.error('Ошибка при обработке push-уведомления:', error);
    }
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Проверяем, есть ли URL для перехода
    if (event.notification.data && event.notification.data.url) {
        // Открываем URL, указанный в данных уведомления
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                // Проверяем, есть ли уже открытое окно с нашим приложением
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Если нет открытого окна, открываем новое
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data.url);
                }
            })
        );
    }
}); 