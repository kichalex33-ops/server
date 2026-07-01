(function () {
  "use strict";
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
})();
