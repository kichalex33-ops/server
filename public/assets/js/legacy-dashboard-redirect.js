(function () {
  const session = window.loadAuthSession ? window.loadAuthSession() : null;
  const profile = String(session?.usuario?.perfil || "").toUpperCase();
  let target = window.appUrl ? window.appUrl("/") : "/";
  if (session?.accessToken) {
    target = profile === "GESTOR" || profile === "ADMIN" ? (window.appUrl ? window.appUrl("/painel-logistico/gestao") : "/painel-logistico/gestao") : (window.appUrl ? window.appUrl("/painel-logistico/operador") : "/painel-logistico/operador");
  } else {
    try { sessionStorage.setItem("painel-logistico-login-message", "Faça login para acessar o painel."); } catch (error) {}
  }
  window.setTimeout(() => window.location.replace(target), 600);
})();
