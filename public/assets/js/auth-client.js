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
window.authHeaders = authHeaders;
window.authFetch = authFetch;
