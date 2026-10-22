// Qazaq Teachers AI — service worker. It exists so the site can be INSTALLED as
// an app (home-screen / desktop shortcut). Pages and code are NEVER cached: every
// such request goes to the network, so a new deploy reaches users at once.
// Only a page navigation gets a tiny offline message when there is no internet.
//
// The ONE exception (2026-10-22): game MEDIA — .glb models (with their animations)
// and .webp pictures under the game folders below. A file there never changes under
// the same URL (a new version gets a new name or ?v=), so they are kept on the device
// (cache-first). A classroom board then opens the games instantly instead of
// downloading ~35 MB every lesson. Installing the app fills it in advance.
// Nothing executable is ever stored: no JS, no HTML, no SVG (owner: platform security).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

const OFFLINE = `<!doctype html><html lang="kk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Qazaq Teachers AI</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#ecfdf5;color:#064e3b;text-align:center;padding:24px}
h1{font-size:20px;margin:0 0 8px}p{margin:0 0 18px;color:#047857}button{border:0;border-radius:12px;background:#047857;color:#fff;font-weight:700;padding:12px 22px;font-size:15px}</style></head>
<body><div><h1>Интернет байланысы жоқ</h1><p>Байланысты тексеріп, қайта көріңіз.</p><button onclick="location.reload()">Қайта жүктеу</button></div></body></html>`;

const ASSETS = "qt-assets-v1";
// same allow-list as src/lib/offline-assets.ts
const HEAVY = /^\/(mb3d\/m|mart|qq\/c3d|qq\/char|qq\/ul|qq\/games|qq\/themes)\/([\w-]+\/)?[\w.-]+\.(glb|webp)$/;

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
    );
    return;
  }
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !HEAVY.test(url.pathname)) return; // the browser as usual
  e.respondWith(caches.open(ASSETS).then(async (cache) => {
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    // only a real file: the SPA fallback answers a missing path with index.html
    const type = res.headers.get("content-type") || "";
    if (res.status === 200 && !/html|javascript/.test(type)) cache.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(() => fetch(req))); // storage refused: just the network
});
