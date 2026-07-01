const authStorageKey = "painel-logistico-auth";
let authRefreshPromise = null;

function saveAuthSession(session) {
  try {
    sessionStorage.setItem(authStorageKey, JSON.stringify(session || {}));
  } catch (error) {
    try { localStorage.setItem(authStorageKey, JSON.stringify(session || {})); } catch (_) {}
  }
}

function loadAuthSession() {
  try {
    return JSON.parse(sessionStorage.getItem(authStorageKey) || localStorage.getItem(authStorageKey) || "null");
  } catch (error) {
    return null;
  }
}

function clearAuthSession() {
  try {
    sessionStorage.removeItem(authStorageKey);
    localStorage.removeItem(authStorageKey);
  } catch (error) {
    // ignora storage indisponivel
  }
}

function toHeaders(input) {
  const headers = new Headers(input || {});
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
      if (!response.ok || !body || !body.ok || !body.data) {
        clearAuthSession();
        return null;
      }
      saveAuthSession(body.data);
      return body.data;
    } catch (error) {
      clearAuthSession();
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
  clearAuthSession();
  try { if (message) sessionStorage.setItem("painel-logistico-login-message", message); } catch (error) {}
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
      const session = loadAuthSession();
      try {
        if (session?.refreshToken) {
          await fetch(window.apiUrl ? window.apiUrl("/auth/logout") : "/api/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ refreshToken: session.refreshToken })
          });
        }
      } catch (error) {}
      redirectToLogin();
    });
  });
}

window.saveAuthSession = saveAuthSession;
window.loadAuthSession = loadAuthSession;
window.clearAuthSession = clearAuthSession;
window.authHeaders = authHeaders;
window.authFetch = authFetch;
window.refreshAuthSession = refreshAuthSession;
window.currentAuthProfile = currentAuthProfile;
window.requirePanelAccess = requirePanelAccess;
window.bindLogoutButtons = bindLogoutButtons;
