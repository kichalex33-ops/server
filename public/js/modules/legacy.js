(function () {
  "use strict";
  var App = window.App = window.App || {};

  function load(list) {
    return App.loader.loadSequential(list);
  }

  function loadParallel(list) {
    if (App.loader.loadParallel) return App.loader.loadParallel(list);
    return Promise.all((list || []).map(function (item) { return App.loader.loadScript(item.src || item, item); }));
  }

  function publicScript(path, optional) {
    return { src: App.loader.publicUrl(path), optional: optional !== false };
  }

  var VENDOR_SRI = {
    leafletCss: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
    leafletJs: "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=",
    // Auditoria H548→H549, item 1.7: hash SRI do chart.js@4.4.9 (chart.umd.min.js
    // servido pelo jsdelivr) gerado e aplicado, fechando o único CDN sem proteção.
    chartJs: "sha256-vOFUCAlZxXS+C7axqST/MvCOvG/0YMFZFx9RxTgCyEQ="
  };
  var VENDOR_URLS = {
    chartJs: "https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js",
    leafletJs: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  };

  function vendor(url, integrity) {
    var item = { src: url, optional: true, crossOrigin: "anonymous", referrerPolicy: "no-referrer" };
    if (integrity) item.integrity = integrity;
    return item;
  }

  function protectedPage(ctx) {
    return !ctx.isPortal && !ctx.isLegacyRedirect && !ctx.isSistema;
  }

  function needsCharts(ctx) {
    return ctx.isOperador || ctx.isGestao;
  }

  function needsQr(ctx) {
    return ctx.isOperador;
  }

  function needsLeaflet(ctx) {
    return ctx.isOperador || ctx.isGestao || ctx.isSala;
  }

  function pageScript(ctx) {
    if (ctx.isPortal) return "assets/js/portal.js";
    if (ctx.isAdminInfra) return "assets/js/admin-infra.js";
    if (ctx.isEmergencias) return "assets/js/emergencias.js";
    if (ctx.isSala) return "assets/js/sala-situacao.js";
    if (ctx.isSistema) return "assets/js/sistema-saude.js";
    if (ctx.isGestao) return "assets/js/gestao.js";
    if (ctx.isOperador && ctx.page === "operador-sincronizacao.html") return "assets/js/operador-sincronizacao.js";
    if (ctx.isOperador) return "assets/js/operador-dashboard.js";
    return null;
  }

  async function boot(ctx) {
    ctx = ctx || App.loader.pageContext();
    var sequence = [];

    sequence.push(publicScript("assets/js/auth-client.js", false));
    sequence.push(publicScript("assets/js/theme.js", false));

    if (protectedPage(ctx)) sequence.push(publicScript("assets/js/h526-security-auth.js", false));

    var vendors = [];
    if (needsCharts(ctx)) vendors.push(vendor(VENDOR_URLS.chartJs, VENDOR_SRI.chartJs));
    if (needsQr(ctx)) vendors.push(publicScript("assets/js/vendor/qrcode.min.js", true));
    if (needsLeaflet(ctx)) vendors.push(vendor(VENDOR_URLS.leafletJs, VENDOR_SRI.leafletJs));
    if (vendors.length) await loadParallel(vendors);

    sequence.push(publicScript("assets/js/charts/dashboard-charts.js", true));

    var page = pageScript(ctx);
    if (page) sequence.push(publicScript(page, false));

    if (ctx.isGestao || ctx.isEmergencias || ctx.isSala) sequence.push(publicScript("assets/js/h534-security-lgpd.js", true));
    if (ctx.isOperador || ctx.isGestao || ctx.isSala) sequence.push(publicScript("assets/js/live-map.js", true));
    if (ctx.isOperador && ctx.page === "operador-conectar-app.html") sequence.push(publicScript("assets/js/driver-pairing.js", true));

    sequence.push(publicScript("assets/js/h549-theme-governor.js", true));
    if (ctx.isGestao) {
      sequence.push(publicScript("assets/js/h538-gestao-kpi-fix.js", true));
      sequence.push(publicScript("assets/js/h539-gestao-final.js", true));
    }
    sequence.push(publicScript("assets/js/h540-interface-polish.js", true));

    await load(sequence);
  }

  App.Legacy = { boot: boot };
})();
