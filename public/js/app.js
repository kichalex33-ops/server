(function () {
  "use strict";

  var App = window.App = window.App || {};
  App.version = "h549";
  App.startedAt = Date.now();

  var script = document.currentScript;
  var appBase = new URL(".", script ? script.src : window.location.href);
  var publicBase = new URL("../", appBase);
  var loaded = {};

  function withVersion(url) {
    if (/^https?:\/\//i.test(url)) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "v=" + encodeURIComponent(App.version);
  }

  function appUrl(path) {
    return withVersion(new URL(path.replace(/^\/+/, ""), appBase).href);
  }

  function publicUrl(path) {
    return withVersion(new URL(path.replace(/^\/+/, ""), publicBase).href);
  }

  function loadScript(src, options) {
    options = options || {};
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.defer = true;
      s.dataset.appLoaded = App.version || "h549";
      if (options.crossOrigin) s.crossOrigin = options.crossOrigin;
      if (options.integrity) {
        s.integrity = options.integrity;
        if (!s.crossOrigin) s.crossOrigin = "anonymous";
      }
      if (options.referrerPolicy) s.referrerPolicy = options.referrerPolicy;
      s.onload = function () { resolve(src); };
      s.onerror = function () {
        var err = new Error("Falha ao carregar script: " + src);
        if (options.optional) {
          console.warn(err.message);
          resolve(src);
        } else {
          reject(err);
        }
      };
      document.head.appendChild(s);
    });
    return loaded[src];
  }

  function loadStyle(href, options) {
    options = options || {};
    var filename = href.split("/").pop().split("?")[0];
    if (document.querySelector('link[href*="' + filename + '"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.appLoaded = App.version || "h549";
    if (options.crossOrigin) link.crossOrigin = options.crossOrigin;
    if (options.integrity) {
      link.integrity = options.integrity;
      if (!link.crossOrigin) link.crossOrigin = "anonymous";
    }
    if (options.referrerPolicy) link.referrerPolicy = options.referrerPolicy;
    document.head.appendChild(link);
  }

  function installPwaHead() {
    if (!document.querySelector('link[rel="manifest"]')) {
      var manifest = document.createElement("link");
      manifest.rel = "manifest";
      manifest.href = new URL("manifest.json", publicBase).href;
      document.head.appendChild(manifest);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      var theme = document.createElement("meta");
      theme.name = "theme-color";
      theme.content = "#0d9488";
      document.head.appendChild(theme);
    }
    loadStyle(publicUrl("assets/css/h547-advanced-pwa.css"));
    loadStyle(publicUrl("assets/css/h549-governance.css"));
  }

  function loadSequential(list) {
    return list.reduce(function (promise, item) {
      return promise.then(function () {
        if (!item) return null;
        if (typeof item === "string") return loadScript(item);
        return loadScript(item.src, item);
      });
    }, Promise.resolve());
  }

  function loadParallel(list) {
    return Promise.all((list || []).filter(Boolean).map(function (item) {
      if (typeof item === "string") return loadScript(item);
      return loadScript(item.src, item);
    }));
  }

  function pageName() {
    var file = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    return file || "index.html";
  }

  function pageContext() {
    var page = pageName();
    var path = window.location.pathname.toLowerCase();
    return {
      page: page,
      path: path,
      isPortal: page === "index.html" || page === "portal.html",
      isLegacyRedirect: ["painel.html", "comando.html"].indexOf(page) !== -1,
      isComando: page === "comando.html",
      isPainel: page === "painel.html",
      isSistema: page === "sistema-saude.html",
      isOperador: /^operador/.test(page),
      isGestao: /^gestao/.test(page),
      isSala: page === "sala-situacao.html",
      isEmergencias: page === "emergencias.html",
      isAdminInfra: page === "admin-infra.html"
    };
  }

  App.loader = {
    appUrl: appUrl,
    publicUrl: publicUrl,
    loadScript: loadScript,
    loadStyle: loadStyle,
    loadSequential: loadSequential,
    loadParallel: loadParallel,
    pageContext: pageContext
  };

  function markBootError(error) {
    console.error(error);
    document.documentElement.dataset.appBootError = "1";
    var target = document.querySelector("#appMessage, .app-message, #operatorFeed");
    if (target) {
      target.hidden = false;
      target.textContent = "Falha ao iniciar a interface. Recarregue a página ou verifique o cache.";
    }
  }


  function protectedPage(ctx) {
    return !ctx.isPortal && !ctx.isLegacyRedirect && !ctx.isSistema;
  }

  function setupSessionTimeout(ctx) {
    if (!protectedPage(ctx)) return;
    var idleMinutes = Number(window.PAINEL_IDLE_MINUTES || 20);
    var idleLimit = Math.max(5, idleMinutes) * 60 * 1000;
    var lastActivity = Date.now();
    var events = ["click", "keydown", "mousemove", "touchstart", "scroll", "visibilitychange"];

    function touch() { lastActivity = Date.now(); }
    function expire(reason) {
      if (App.State && typeof App.State.clearAuth === "function") App.State.clearAuth(reason);
      else {
        try { sessionStorage.removeItem("painel-logistico-auth"); localStorage.removeItem("painel-logistico-auth"); } catch (_) {}
      }
      window.location.replace(window.appUrl ? window.appUrl("/") : "/");
    }

    events.forEach(function (eventName) {
      window.addEventListener(eventName, touch, { passive: true });
    });

    window.setInterval(function () {
      if (Date.now() - lastActivity > idleLimit) expire("Sessão encerrada por inatividade.");
    }, 30000);

    window.addEventListener("pageshow", function (event) {
      if (event.persisted) window.location.reload();
    });
  }

  var ctx = pageContext();
  window.__APP_CONTEXT__ = ctx;
  installPwaHead();

  loadSequential([
    publicUrl("assets/js/api-config.js"),
    appUrl("core/state.js"),
    appUrl("core/sanitize.js"),
    appUrl("core/ui.js"),
    appUrl("core/ux.js"),
    appUrl("core/operator-workflow.js"),
    publicUrl("assets/js/h549-theme-governor.js"),
    appUrl("core/http.js"),
    appUrl("core/offline-store.js"),
    appUrl("core/pwa.js"),
    appUrl("core/preferences.js"),
    appUrl("core/realtime-collab.js"),
    appUrl("core/intelligence.js"),
    appUrl("core/signature-print.js"),
    appUrl("core/onboarding.js"),
    appUrl("core/analytics.js"),
    appUrl("core/router.js"),
    appUrl("modules/auth.js"),
    appUrl("modules/dashboard.js"),
    appUrl("modules/menu.js"),
    appUrl("modules/comando.js"),
    appUrl("modules/legacy.js")
  ]).then(function () {
    if (App.Legacy && typeof App.Legacy.boot === "function") {
      return App.Legacy.boot(ctx);
    }
    return null;
  }).then(function () {
    App.ready = true;
    setupSessionTimeout(ctx);
    window.dispatchEvent(new CustomEvent("app:ready", { detail: ctx }));
  }).catch(markBootError);
})();
