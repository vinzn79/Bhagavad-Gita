// Offline support for /stotras/. build.py fills in VERSION and ASSETS.
var VERSION = "stotras-3fcc830336";
var FONTS = "stotras-fonts";
var ASSETS = ["./", "aigiri-nandini.html", "css/style.css", "daily-prayers.html", "dhanvantari-mantra.html", "ganesha-shlokas.html", "gayatri-mantra.html", "guru-vandana.html", "hanuman-chalisa.html", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "img/lotus-pattern.svg", "img/lotus.svg", "index.html", "js/app.js", "lalitha-sahasranamam.html", "mahalakshmi-ashtakam.html", "mahamrityunjaya-mantra.html", "manifest.webmanifest", "saraswati-vandana.html", "sarva-mangala-mangalye.html", "shanti-mantras.html", "shiva-panchakshara-stotram.html", "sri-lakshmi-mantras.html", "vishnu-sahasranamam.html"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("stotras-") === 0 && k !== VERSION && k !== FONTS; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (r) { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).catch(function () { return caches.match("./", { ignoreSearch: true }); });
  }));
});
