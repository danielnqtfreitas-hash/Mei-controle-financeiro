// Nome do cache, atualizado a cada nova versão de arquivos estáticos
const CACHE_NAME = 'mei-controle-cache-v1.0.1';

// Arquivos essenciais para o shell do aplicativo
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    // URLs de CDN essenciais para o funcionamento offline
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js',
    'https://unpkg.com/@phosphor-icons/web@2.1.1',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    
    // Firebase CDN links
    "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js",
    "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js",
    "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js",
    "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js"
];

// Instalação do Service Worker: Abre o cache e adiciona todos os arquivos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache aberto. Adicionando arquivos...');
                // Garante que o service worker espere até que todos os arquivos críticos estejam no cache
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Força o novo Service Worker a assumir imediatamente
            .catch(error => {
                console.error('Falha ao adicionar ao cache:', error);
            })
    );
});

// Ativação do Service Worker: Limpa caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('ServiceWorker: Deletando cache antigo', cacheName);
                        return caches.delete(cacheName);
                    }
                    return null;
                })
            );
        })
        .then(() => self.clients.claim()) // Permite que o novo Service Worker controle imediatamente a página
    );
});

// Evento Fetch: Estratégia Cache-First (primeiro o cache, depois a rede) para recursos estáticos
self.addEventListener('fetch', (event) => {
    // Intercepta apenas requisições GET
    if (event.request.method !== 'GET') return;
    
    // Exclui requisições de documentos de Cloud Storage e Firestore
    const url = new URL(event.request.url);
    if (url.hostname.includes('googleapis.com') || url.hostname.includes('firestore.googleapis.com')) {
        // Para dados dinâmicos, sempre vai para a rede
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Retorna o recurso do cache se existir
                if (response) {
                    return response;
                }
                
                // Se não estiver no cache, faz a requisição de rede
                return fetch(event.request).then(
                    (response) => {
                        // Verifica se a resposta é válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Se a URL for um recurso estático (como JS, CSS ou ícones), clona a resposta para armazenar no cache
                        const responseToCache = response.clone();
                        if (urlsToCache.includes(event.request.url) || event.request.url.includes('cdn')) {
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }

                        return response;
                    }
                );
            })
            .catch(() => {
                // Fallback para quando o cache e a rede falham (útil para imagens offline)
                console.log('Falha de rede/cache. Não há fallback definido.');
                // Neste app financeiro, o modo offline só garante o shell, não os dados.
                return new Response('Você está offline. O aplicativo de controle precisa de conexão para carregar os dados financeiros.');
            })
    );
});

