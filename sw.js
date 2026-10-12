// Qazaq Teachers AI — service worker. It exists so the site can be INSTALLED as
// an app (home-screen / desktop shortcut). It deliberately caches NOTHING: every
// request still goes to the network, so a new deploy reaches users at once.
// Only a page navigation gets a tiny offline message when there is no internet.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

const OFFLINE = `<!doctype html><html lang="kk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Qazaq Teachers AI</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#ecfdf5;color:#064e3b;text-align:center;padding:24px}
h1{font-size:20px;margin:0 0 8px}p{margin:0 0 18px;color:#047857}button{border:0;border-radius:12px;background:#047857;color:#fff;font-weight:700;padding:12px 22px;font-size:15px}</style></head>
<body><div><h1>Интернет байланысы жоқ</h1><p>Байланысты тексеріп, қайта көріңіз.</p><button onclick="location.reload()">Қайта жүктеу</button></div></body></html>`;

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // everything else: the browser as usual
  e.respondWith(
    fetch(e.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
  );
});
