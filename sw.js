const CACHE_NAME = 'mei-controle-cache-v1';
// Arquivos essenciais para que a página principal funcione offline
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    // Adicione os caminhos dos seus ícones aqui, se já existirem
    '/icons/icon-192x192.png', 
    '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    // Instala e armazena os arquivos essenciais em cache
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Cache aberto e arquivos essenciais adicionados.');
                return cache.addAll(urlsToCache).catch(error => {
                    console.warn('Alguns arquivos falharam ao serem cacheados. Verifique os caminhos.', error);
                });
            })
    );
});

self.addEventListener('fetch', (event) => {
    // Tenta encontrar o recurso no cache, se não estiver, busca na rede
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response; // Retorna o recurso do cache
                }
                
                // Se não estiver no cache, busca na rede e armazena em cache para a próxima vez (Cache-then-Network strategy)
                return fetch(event.request.clone()).then(
                    (response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Armazena em cache apenas requisições GET
                        if (event.request.method === 'GET') {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return response;
                    }
                ).catch(() => {
                    // Opcional: retornar uma página offline aqui, se você tiver uma
                    console.log('Service Worker: Falha ao buscar na rede.');
                });
            })
    );
});

self.addEventListener('activate', (event) => {
    // Limpa caches antigos
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
