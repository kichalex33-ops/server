window.PAINEL_API_ROOT = window.PAINEL_API_ROOT || "/api";

window.apiUrl = function apiUrl(path) {
  const root = String(window.PAINEL_API_ROOT || "/api").replace(/\/$/, "");
  const suffix = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${root}${suffix}`;
};
