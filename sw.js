// صفوة رتّل: تشغيل المنصة تطبيقًا، مع حفظ صفحات المصحف التي فُتحت للعودة إليها سريعًا.
const SHELL = "safwa-shell-v2";
const PAGES = "safwa-mushaf-v1";
const SHELL_FILES = ["./", "./index.html", "./firebase-config.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== PAGES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // ملفات المنصة: الشبكة أولًا ليصل كل تحديث فورًا، والنسخة المحفوظة عند انقطاع الاتصال.
  if (url.origin === location.origin) {
    e.respondWith(fetch(req, { cache: "no-cache" }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
    return;
  }
  // صفحات المصحف: من المحفوظ أولًا، ثم من الشبكة.
  if (url.hostname === "android.quran.com" || url.hostname === "quran.ksu.edu.sa") {
    e.respondWith(caches.open(PAGES).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") {
        c.put(req, res.clone());
        c.keys().then(k => { if (k.length > 150) c.delete(k[0]); });
      }
      return res;
    }));
  }
  // التلاوة وقاعدة البيانات تمر مباشرة دون تدخل.
});
