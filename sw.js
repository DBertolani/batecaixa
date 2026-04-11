// sw.js — Service Worker BateCaixa
// Finalidade: cumprir o requisito de PWA instalável (auditoria Chrome/Safari).
// Estratégia: Network First — tenta a rede, cai no cache se offline.

const CACHE_NAME = "batecaixa-v1";

// Arquivos essenciais para funcionar offline (ajuste conforme necessário)
const ARQUIVOS_CACHE = [
    "./index.html",
    "./style.css",
    "./script.js",
    "./logo.png",
    "./manifest.json"
];

// Instalação: pré-cacheia os arquivos estáticos e limpa cache antigo
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log("Removendo cache antigo:", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_CACHE));
        })
    );
    self.skipWaiting(); // ativa imediatamente sem esperar aba fechar
});

// Ativação: remove caches antigos
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((chaves) =>
            Promise.all(chaves.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: Network First — usa a rede, cai no cache se falhar
self.addEventListener("fetch", (event) => {
    // LIMPEZA DO CONSOLE: ignora requisições que não começam com http/https (chrome-extension, etc.)
    if (!event.request.url.startsWith("http")) return;
    
    // Não intercepta requisições ao Apps Script (sempre precisam de rede)
    if (event.request.url.includes("script.google.com")) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Atualiza o cache com a resposta mais recente
                if (response && response.status === 200 && response.type === "basic") {
                    const copia = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
                }
                return response;
            })
            .catch(() => {
                // Sem rede: usa o cache
                return caches.match(event.request);
            })
    );
});