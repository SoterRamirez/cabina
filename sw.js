// Cabina funciona sin señal: guarda la app en el celular la primera vez que se abre.
const VERSION = "cabina-v12";
const ARCHIVOS = [
  "./", "index.html", "manifest.webmanifest", "css/cabina.css",
  "js/app.js", "js/ui.js", "js/iconos.js", "js/ayuda.js", "js/metricas.js", "js/normas.js", "js/tramites.js", "js/cuentas.js",
  "datos/sedes-apto-medico.json", "img/marca.svg", "img/icono-192.png", "img/icono-512.png"
];

self.addEventListener("install", (e) => {
  // cache: "reload" evita tomar copias viejas de la memoria del navegador al instalar una versión nueva.
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // El IEPS cambia cada semana: primero la red, si no hay señal lo último guardado.
  if (url.pathname.endsWith("/datos/carretera.json")) {
    e.respondWith(
      fetch(e.request).then((r) => {
        const copia = r.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copia));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});
