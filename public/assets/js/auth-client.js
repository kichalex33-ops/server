const authStorageKey = "painel-logistico-auth";
let authRefreshPromise = null;

function normalizeAuthSession(input = {}) {
  const session = { ...(input || {}) };
  if (!session.accessToken && session.token) session.accessToken = session.token;
  if (!session.token && session.accessToken) session.token = session.accessToken;
  if (!session.expiresIn && session.expires_in) session.expiresIn = session.expires_in;
  if (!session.expires_in && session.expiresIn) session.expires_in = session.expiresIn;
  if (!session.tokenType) session.tokenType = "Bearer";
  return session;
}

function saveAuthSession(session) {
  const normalized = normalizeAuthSession(session || {});
  try {
    sessionStorage.setItem(authStorageKey, JSON.stringify(normalized));
  } catch (error) {
    // Sem fallback para localStorage: sessão sensível deve morrer ao fechar a aba.
  }
  try { localStorage.setItem("painel-logistico-auth-sync", String(Date.now())); } catch (_) {}
  if (window.App?.State) {
    window.App.State.set("usuario", normalized.usuario || null);
    window.App.State.set("token", normalized.accessToken || null);
    window.App.State.set("refreshToken", normalized.refreshToken || null);
  }
  return normalized;
}

function loadAuthSession() {
  try {
    return normalizeAuthSession(JSON.parse(sessionStorage.getItem(authStorageKey) || "null"));
  } catch (error) {
    return null;
  }
}

function clearAuthSession(reason) {
  try {
    sessionStorage.removeItem(authStorageKey);
    localStorage.removeItem(authStorageKey);
    localStorage.setItem("painel-logistico-auth-logout", String(Date.now()));
    if (reason) sessionStorage.setItem("painel-logistico-login-message", reason);
  } catch (error) {
    // ignora storage indisponivel
  }
}

function stripLegacyPasswordHeaders(headers) {
  ["x-comando-senha", "X-Comando-Senha", "x-local-password", "X-Local-Password"].forEach((name) => {
    if (headers.has(name)) headers.delete(name);
  });
}

function toHeaders(input) {
  const headers = new Headers(input || {});
  stripLegacyPasswordHeaders(headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  return headers;
}

function authHeaders(extra = {}) {
  const session = loadAuthSession();
  const headers = toHeaders(extra);
  if (session && session.accessToken) {
    headers.set("Authorization", `${session.tokenType || "Bearer"} ${session.accessToken}`);
  }
  return headers;
}

function withAuthOptions(options = {}) {
  return {
    ...options,
    headers: authHeaders(options.headers || {})
  };
}

function isAuthRefreshRequest(url) {
  return String(url || "").indexOf("/auth/refresh") !== -1;
}

async function refreshAuthSession() {
  if (window.App?.Http?.refreshSession) return window.App.Http.refreshSession();
  const session = loadAuthSession();
  if (!session || !session.refreshToken) return null;
  if (authRefreshPromise) return authRefreshPromise;

  authRefreshPromise = (async () => {
    try {
      const response = await fetch(window.apiUrl ? window.apiUrl("/auth/refresh") : "/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refreshToken: session.refreshToken })
      });
      const body = await response.json().catch(() => null);
      const data = body?.ok ? body.data : body;
      if (!response.ok || !data) {
        clearAuthSession("Sessão expirada. Faça login novamente.");
        return null;
      }
      return saveAuthSession(data);
    } catch (error) {
      clearAuthSession("Falha ao renovar sessão. Faça login novamente.");
      return null;
    } finally {
      authRefreshPromise = null;
    }
  })();

  return authRefreshPromise;
}

async function authFetch(url, options = {}) {
  const response = await fetch(url, withAuthOptions(options));
  if (response.status !== 401 || isAuthRefreshRequest(url)) return response;

  const refreshed = await refreshAuthSession();
  if (!refreshed) return response;

  return fetch(url, withAuthOptions(options));
}

function currentAuthProfile() {
  const session = loadAuthSession();
  return String(session?.usuario?.perfil || "").toUpperCase();
}

function redirectToLogin(message) {
  clearAuthSession(message);
  window.location.href = window.appUrl ? window.appUrl("/") : "/";
}

function requirePanelAccess(allowedProfiles = [], message = "Faça login para acessar este painel.") {
  const session = loadAuthSession();
  const profile = currentAuthProfile();
  const allowed = allowedProfiles.map((item) => String(item).toUpperCase());
  if (!session?.accessToken || (allowed.length && !allowed.includes(profile) && profile !== "ADMIN")) {
    redirectToLogin(message);
    return false;
  }
  return true;
}

function bindLogoutButtons() {
  document.querySelectorAll("[data-logout], #logoutBtn").forEach((button) => {
    if (button.dataset.logoutBound) return;
    button.dataset.logoutBound = "true";
    button.addEventListener("click", async () => {
      if (window.App?.Auth?.logout) {
        await window.App.Auth.logout();
        return;
      }
      const session = loadAuthSession();
      try {
        if (session?.refreshToken) {
          await fetch(window.apiUrl ? window.apiUrl("/auth/logout") : "/api/auth/logout", {
            method: "POST",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ refreshToken: session.refreshToken })
          });
        }
      } catch (error) {}
      redirectToLogin();
    });
  });
}

window.normalizeAuthSession = normalizeAuthSession;
window.saveAuthSession = saveAuthSession;
window.loadAuthSession = loadAuthSession;
window.clearAuthSession = clearAuthSession;
window.authHeaders = authHeaders;
window.authFetch = authFetch;
window.refreshAuthSession = refreshAuthSession;
window.currentAuthProfile = currentAuthProfile;
window.requirePanelAccess = requirePanelAccess;
window.bindLogoutButtons = bindLogoutButtons;
