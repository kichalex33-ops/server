window.PAINEL_BASE_PATH = window.PAINEL_BASE_PATH || "/homologacao";
window.PAINEL_API_ROOT = window.PAINEL_API_ROOT || "/homologacao/api";

window.apiUrl = function apiUrl(path) {
  const root = String(window.PAINEL_API_ROOT || "/homologacao/api").replace(/\/$/, "");
  const suffix = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${root}${suffix}`;
};

window.appUrl = function appUrl(path) {
  const base = String(window.PAINEL_BASE_PATH || "").replace(/\/$/, "");
  const suffix = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
};
