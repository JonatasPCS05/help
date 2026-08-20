// Service worker simples e conservador: cacheia o essencial pra permitir
// abrir o app offline (ou com internet instável), sem tentar cachear tudo
// nem interferir em chamadas à API (que precisam sempre ir pra rede).
const CACHE_VERSION = "help-v1";
const PRECACHE_URLS = ["/", "/manifest.json", "/favicon-32.png", "/logo192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE_VERSION).map((c) => caches.delete(c))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Nunca interceptar chamadas à API — precisam sempre ir pra rede, dados
  // sempre atualizados.
  if (new URL(request.url).hostname.startsWith("api.")) {
    return;
  }

  if (request.mode === "navigate") {
    // Navegação (abrir a página): tenta a rede primeiro, cai pro cache se
    // estiver offline.
    event.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/", copia));
          return resposta;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Demais assets (JS/CSS/imagens do bundle): cache primeiro, já que os
  // nomes têm hash de conteúdo e nunca mudam sob o mesmo nome.
  event.respondWith(
    caches.match(request).then((cacheado) => {
      if (cacheado) return cacheado;
      return fetch(request).then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copia));
        }
        return resposta;
      });
    })
  );
});
