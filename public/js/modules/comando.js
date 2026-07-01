(function () {
  "use strict";
  var App = window.App = window.App || {};

  function runLegacyRedirect() {
    var page = (window.__APP_CONTEXT__ && window.__APP_CONTEXT__.page) || (location.pathname.split("/").pop() || "").toLowerCase();
    if (["comando.html", "painel.html"].indexOf(page) === -1) return;
    var s = window.App?.Auth?.session ? window.App.Auth.session() : null;
    var profile = String((s && s.usuario && s.usuario.perfil) || "").toUpperCase();
    var target = window.appUrl ? window.appUrl("/") : "/";
    if (s && s.accessToken) {
      target = (profile === "GESTOR" || profile === "ADMIN")
        ? (window.appUrl ? window.appUrl("/painel-logistico/gestao") : "/painel-logistico/gestao")
        : (window.appUrl ? window.appUrl("/painel-logistico/operador") : "/painel-logistico/operador");
    }
    var msg = document.getElementById("appMessage") || document.querySelector(".app-message");
    if (msg) {
      msg.hidden = false;
      msg.textContent = "Tela legada desativada. Redirecionando para o painel atual...";
    }
    window.setTimeout(function () { window.location.replace(target); }, 450);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", runLegacyRedirect, { once: true });
  else runLegacyRedirect();

  App.Comando = { runLegacyRedirect: runLegacyRedirect, migratedFrom: ["comando.js", "painel.js"] };
})();
