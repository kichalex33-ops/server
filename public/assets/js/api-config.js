(function () {
  "use strict";

  function trimTrailingSlash(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function detectBasePath() {
    var path = window.location.pathname || "/";
    var markers = ["/public/", "/painel-logistico", "/api/", "/motorista", "/comando", "/sala-situacao", "/emergencias"];
    for (var i = 0; i < markers.length; i += 1) {
      var index = path.indexOf(markers[i]);
      if (index > 0) return trimTrailingSlash(path.slice(0, index));
    }
    if (path === "/") return "";
    if (/\/index\.php$/i.test(path)) return trimTrailingSlash(path.replace(/\/index\.php$/i, ""));
    if (/\/$/.test(path)) return trimTrailingSlash(path);
    var parts = path.split("/").filter(Boolean);
    if (parts.length === 1) return "/" + parts[0];
    return trimTrailingSlash(path.replace(/\/[^/]*$/, ""));
  }

  var basePath = trimTrailingSlash(window.PAINEL_BASE_PATH || detectBasePath());
  var apiRoot = trimTrailingSlash(window.PAINEL_API_ROOT || (basePath + "/api"));

  window.PAINEL_BASE_PATH = basePath;
  window.PAINEL_API_ROOT = apiRoot;

  window.apiUrl = function apiUrl(path) {
    var suffix = String(path || "");
    if (/^https?:\/\//i.test(suffix)) return suffix;
    suffix = suffix.charAt(0) === "/" ? suffix : "/" + suffix;
    return apiRoot + suffix;
  };

  window.appUrl = function appUrl(path) {
    var suffix = String(path || "");
    if (/^https?:\/\//i.test(suffix)) return suffix;
    if (!suffix || suffix === "/") return (basePath || "") + "/";
    suffix = suffix.charAt(0) === "/" ? suffix : "/" + suffix;
    return (basePath || "") + suffix;
  };

  window.assetUrl = function assetUrl(path) {
    var suffix = String(path || "").replace(/^\/+/, "");
    return (basePath || "") + "/public/" + suffix;
  };
})();
