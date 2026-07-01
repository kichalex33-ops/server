(function () {
  "use strict";
  var App = window.App = window.App || {};
  var privateState = {
    usuario: null,
    token: null,
    refreshToken: null,
    moduloAtual: null,
    paginaAtual: (window.__APP_CONTEXT__ && window.__APP_CONTEXT__.page) || "index.html",
    listeners: []
  };

  function snapshot() {
    var out = Object.assign({}, privateState);
    delete out.listeners;
    return out;
  }

  function notify(key, value) {
    privateState.listeners.slice().forEach(function (fn) {
      try { fn(key, value, snapshot()); } catch (error) { console.warn(error); }
    });
  }

  function broadcast(key) {
    try {
      if (key === "token" || key === "refreshToken" || key === "usuario") {
        localStorage.setItem("painel-logistico-auth-sync", String(Date.now()));
      }
    } catch (_) {}
  }

  function set(key, value, silent) {
    privateState[key] = value;
    if (!silent) notify(key, value);
    broadcast(key);
    return value;
  }

  function clearAuthState(reason) {
    privateState.usuario = null;
    privateState.token = null;
    privateState.refreshToken = null;
    notify("auth", null);
    try {
      sessionStorage.removeItem("painel-logistico-auth");
      localStorage.removeItem("painel-logistico-auth");
      localStorage.setItem("painel-logistico-auth-logout", String(Date.now()));
      if (reason) sessionStorage.setItem("painel-logistico-login-message", reason);
    } catch (_) {}
  }

  window.addEventListener("storage", function (event) {
    if (event.key === "painel-logistico-auth-logout") {
      try { sessionStorage.removeItem("painel-logistico-auth"); } catch (_) {}
      privateState.usuario = null;
      privateState.token = null;
      privateState.refreshToken = null;
      notify("auth", null);
    }
    if (event.key === "painel-logistico-auth-sync") {
      try {
        var raw = sessionStorage.getItem("painel-logistico-auth");
        var session = raw ? JSON.parse(raw) : null;
        privateState.usuario = session && session.usuario ? session.usuario : null;
        privateState.token = session && (session.accessToken || session.token) ? (session.accessToken || session.token) : null;
        privateState.refreshToken = session && session.refreshToken ? session.refreshToken : null;
        notify("auth", session || null);
      } catch (_) {}
    }
  });

  App.State = {
    get: function (key) { return privateState[key]; },
    set: set,
    merge: function (data) {
      Object.keys(data || {}).forEach(function (key) { set(key, data[key]); });
      return snapshot();
    },
    subscribe: function (fn) {
      if (typeof fn !== "function") return function () {};
      privateState.listeners.push(fn);
      return function () { App.State.off(fn); };
    },
    on: function (fn) { return App.State.subscribe(fn); },
    off: function (fn) {
      privateState.listeners = privateState.listeners.filter(function (item) { return item !== fn; });
    },
    clearAuth: clearAuthState,
    snapshot: snapshot
  };
})();
