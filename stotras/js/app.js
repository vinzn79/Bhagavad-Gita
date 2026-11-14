(function () {
  var KEY = "stotras-prefs";
  var prefs = { lang: "en", mal: false };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}

  function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }

  function apply() {
    document.body.setAttribute("data-lang", prefs.lang);
    document.documentElement.lang = prefs.lang;
    document.body.classList.toggle("show-mal", !!prefs.mal);
    document.querySelectorAll("[data-set-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-set-lang") === prefs.lang ? "true" : "false");
    });
    var t = document.getElementById("mal-toggle");
    if (t) t.checked = !!prefs.mal;
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-set-lang]");
    if (b) { prefs.lang = b.getAttribute("data-set-lang"); save(); apply(); }
  });
  var t = document.getElementById("mal-toggle");
  if (t) t.addEventListener("change", function () { prefs.mal = t.checked; save(); apply(); });
  apply();

  // back-to-top button
  var top = document.querySelector(".totop");
  if (top) {
    window.addEventListener("scroll", function () { top.classList.toggle("show", window.scrollY > 700); }, { passive: true });
    top.addEventListener("click", function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  }

  // offline + install
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
  var deferred = null, hint = document.getElementById("install-hint");
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e; if (hint) hint.hidden = false;
  });
  var btn = document.getElementById("install-btn");
  if (btn) btn.addEventListener("click", function () {
    if (!deferred) return; deferred.prompt(); deferred = null; hint.hidden = true;
  });
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  var iosHint = document.getElementById("ios-hint");
  if (ios && !standalone && iosHint) iosHint.hidden = false;
})();
