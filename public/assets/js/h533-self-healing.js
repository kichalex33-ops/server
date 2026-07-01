(function () {
  "use strict";
  var VERSION = "h535";

  function ensureFinalCss() {
    var href = window.assetUrl ? window.assetUrl("assets/css/h533-correcao-final.css?v=" + VERSION) : "assets/css/h533-correcao-final.css?v=" + VERSION;
    var existing = document.querySelector('link[data-h533-visual="1"]');
    if (existing) {
      existing.setAttribute("href", href);
      document.head.appendChild(existing);
      return;
    }
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.h533Visual = "1";
    document.head.appendChild(link);
  }

  function normalizeTheme() {
    var key = "painel-logistico-theme";
    var theme = "dark";
    try { theme = localStorage.getItem(key) || document.body.dataset.theme || "dark"; } catch (_) {}
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
    document.body.classList.toggle("theme-dark", theme === "dark");
  }

  function rewriteBrokenHomologacaoLinks() {
    if (!window.appUrl || !window.assetUrl || !window.apiUrl) return;
    document.querySelectorAll("a[href], link[href], script[src], img[src]").forEach(function (el) {
      var attr = el.tagName === "SCRIPT" || el.tagName === "IMG" ? "src" : "href";
      var value = el.getAttribute(attr) || "";
      if (!value || /^https?:|^data:|^blob:/i.test(value)) return;
      var clean = value.replace(/\?v=h\d+/, "?v=" + VERSION);
      if (clean.indexOf("/homologacao/public/assets/") === 0) clean = window.assetUrl("assets/" + clean.split("/homologacao/public/assets/")[1]);
      else if (clean.indexOf("/homologacao/assets/") === 0) clean = window.assetUrl("assets/" + clean.split("/homologacao/assets/")[1]);
      else if (clean.indexOf("/homologacao/api/") === 0) clean = window.apiUrl("/" + clean.split("/homologacao/api/")[1]);
      else if (clean.indexOf("/homologacao/public/") === 0) clean = window.appUrl("/public/" + clean.split("/homologacao/public/")[1]);
      else if (clean.indexOf("/homologacao/painel-logistico") === 0) clean = window.appUrl(clean.split("/homologacao")[1]);
      if (clean !== value) el.setAttribute(attr, clean);
    });
  }

  function markLightSurfaces() {
    document.querySelectorAll('[style*="background: white"], [style*="background:white"], [style*="background: #fff"], [style*="background:#fff"], [style*="background-color: white"], [style*="background-color:white"], [style*="background-color: #fff"], [style*="background-color:#fff"]').forEach(function (el) {
      el.classList.add("h533-light-surface");
    });
  }

  ensureFinalCss();
  normalizeTheme();
  rewriteBrokenHomologacaoLinks();
  markLightSurfaces();

  document.addEventListener("DOMContentLoaded", function () {
    ensureFinalCss();
    normalizeTheme();
    rewriteBrokenHomologacaoLinks();
    markLightSurfaces();
  });
})();
