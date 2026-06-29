const authStorageKey = "painel-logistico-auth";

function saveAuthSession(session) {
  sessionStorage.setItem(authStorageKey, JSON.stringify(session));
}

function loadAuthSession() {
  try {
    return JSON.parse(sessionStorage.getItem(authStorageKey) || "null");
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

function authHeaders(extra = {}) {
  const session = loadAuthSession();
  const headers = { ...extra };
  if (session && session.accessToken) {
    headers.Authorization = `${session.tokenType || "Bearer"} ${session.accessToken}`;
  }
  return headers;
}

async function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: authHeaders(options.headers || {})
  });
}

window.saveAuthSession = saveAuthSession;
window.loadAuthSession = loadAuthSession;
window.clearAuthSession = clearAuthSession;
window.authHeaders = authHeaders;
window.authFetch = authFetch;


function currentAuthProfile() {
  const session = loadAuthSession();
  return String(session?.usuario?.perfil || "").toUpperCase();
}

function requirePanelAccess(allowedProfiles = [], message = "Faça login para acessar este painel.") {
  const session = loadAuthSession();
  const profile = currentAuthProfile();
  const allowed = allowedProfiles.map((item) => String(item).toUpperCase());
  if (!session?.accessToken || (allowed.length && !allowed.includes(profile) && profile !== "ADMIN")) {
    clearAuthSession();
    try { sessionStorage.setItem("painel-logistico-login-message", message); } catch (error) {}
    window.location.href = window.appUrl ? window.appUrl("/") : "/homologacao/";
    return false;
  }
  return true;
}

function bindLogoutButtons() {
  document.querySelectorAll("[data-logout], #logoutBtn").forEach((button) => {
    if (button.dataset.logoutBound) return;
    button.dataset.logoutBound = "true";
    button.addEventListener("click", () => {
      clearAuthSession();
      window.location.href = window.appUrl ? window.appUrl("/") : "/homologacao/";
    });
  });
}

window.currentAuthProfile = currentAuthProfile;
window.requirePanelAccess = requirePanelAccess;
window.bindLogoutButtons = bindLogoutButtons;
