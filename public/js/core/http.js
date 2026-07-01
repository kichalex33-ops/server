(function () {
  "use strict";
  var App = window.App = window.App || {};
  var storageKey = "painel-logistico-auth";
  var refreshPromise = null;

  function normalizeSession(input) {
    var session = Object.assign({}, input || {});
    if (!session.accessToken && session.token) session.accessToken = session.token;
    if (!session.token && session.accessToken) session.token = session.accessToken;
    if (!session.expiresIn && session.expires_in) session.expiresIn = session.expires_in;
    if (!session.expires_in && session.expiresIn) session.expires_in = session.expiresIn;
    if (!session.tokenType) session.tokenType = "Bearer";
    return session;
  }

  function readSession() {
    if (typeof window.loadAuthSession === "function") return normalizeSession(window.loadAuthSession());
    try {
      var raw = sessionStorage.getItem(storageKey) || "null" // CORREÇÃO FALHA 7: somente sessionStorage;
      return normalizeSession(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }

  function saveSession(session) {
    var normalized = normalizeSession(session);
    try { sessionStorage.setItem(storageKey, JSON.stringify(normalized)); }
    catch (_) {} // CORREÇÃO FALHA 7: sem fallback localStorage
    if (App.State) {
      App.State.set("usuario", normalized.usuario || null);
      App.State.set("token", normalized.accessToken || null);
      App.State.set("refreshToken", normalized.refreshToken || null);
    }
    try { localStorage.setItem("painel-logistico-auth-sync", String(Date.now())); } catch (_) {}
    return normalized;
  }

  function clearSession(reason) {
    if (App.State && typeof App.State.clearAuth === "function") App.State.clearAuth(reason);
    else {
      try {
        sessionStorage.removeItem(storageKey);
        localStorage.removeItem(storageKey);
        localStorage.setItem("painel-logistico-auth-logout", String(Date.now()));
        if (reason) sessionStorage.setItem("painel-logistico-login-message", reason);
      } catch (_) {}
    }
  }

  function stripLegacyPasswordHeaders(headers) {
    ["x-comando-senha", "X-Comando-Senha", "x-local-password", "X-Local-Password"].forEach(function (name) {
      if (headers.has(name)) headers.delete(name);
    });
  }

  function makeHeaders(headers, options) {
    options = options || {};
    var output = new Headers(headers || {});
    stripLegacyPasswordHeaders(output);
    if (!output.has("Accept")) output.set("Accept", "application/json");
    if (options.json !== false && options.body && !(options.body instanceof FormData) && !output.has("Content-Type")) {
      output.set("Content-Type", "application/json");
    }
    var session = readSession();
    if (!options.skipAuth && session && session.accessToken && !output.has("Authorization")) {
      output.set("Authorization", (session.tokenType || "Bearer") + " " + session.accessToken);
    }
    return output;
  }

  function resolveApi(path) {
    if (/^https?:\/\//i.test(String(path || ""))) return path;
    if (typeof window.apiUrl === "function") return window.apiUrl(path);
    var suffix = String(path || "");
    suffix = suffix.charAt(0) === "/" ? suffix : "/" + suffix;
    return "/api" + suffix;
  }

  function parseResponse(response) {
    var contentType = response.headers.get("content-type") || "";
    if (contentType.indexOf("application/json") !== -1) {
      return response.json().catch(function () { return null; });
    }
    return response.text().catch(function () { return ""; });
  }

  function payloadFromBody(body) {
    if (body && body.ok === true && Object.prototype.hasOwnProperty.call(body, "data")) return body.data;
    return body;
  }

  async function refreshSession() {
    var session = readSession();
    if (!session || !session.refreshToken) return null;
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async function () {
      try {
        var response = await fetch(resolveApi("/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ refreshToken: session.refreshToken })
        });
        var body = await parseResponse(response);
        if (!response.ok) {
          clearSession("Sessão expirada. Faça login novamente.");
          return null;
        }
        var data = normalizeSession(payloadFromBody(body));
        if (!data || !data.accessToken) {
          clearSession("Sessão expirada. Faça login novamente.");
          return null;
        }
        return saveSession(data);
      } catch (_) {
        clearSession("Falha ao renovar sessão. Faça login novamente.");
        return null;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  function emit(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (_) {}
  }

  async function request(path, options) {
    options = options || {};
    var url = resolveApi(path);
    var body = options.body;
    if (body && !(body instanceof FormData) && typeof body !== "string") body = JSON.stringify(body);
    var fetchOptions = Object.assign({}, options, { body: body, headers: makeHeaders(options.headers, options) });
    delete fetchOptions.skipAuth;
    delete fetchOptions.json;
    delete fetchOptions.retry;

    var response = await fetch(url, fetchOptions);
    if (response.status === 401 && !options.skipAuth && !options.retry && String(url).indexOf("/auth/refresh") === -1) {
      var refreshed = await refreshSession();
      if (refreshed) return request(path, Object.assign({}, options, { retry: true }));
    }

    var data = await parseResponse(response);
    if (!response.ok) {
      var message = (data && (data.error || data.message)) || response.statusText || "Erro de comunicação";
      var error = new Error(message);
      error.status = response.status;
      error.data = data;
      emit("app:http-error", { path: path, method: fetchOptions.method || "GET", status: response.status, message: message, data: data });
      throw error;
    }
    var payload = payloadFromBody(data);
    emit("app:http-success", { path: path, method: fetchOptions.method || "GET", status: response.status });
    return payload;
  }

  async function safeFetch(path, options) {
    return request(path, options);
  }

  App.Http = {
    request: request,
    safeFetch: safeFetch,
    resolveApi: resolveApi,
    authHeaders: makeHeaders,
    refreshSession: refreshSession,
    readSession: readSession,
    saveSession: saveSession,
    clearSession: clearSession,
    normalizeSession: normalizeSession
  };
})();
