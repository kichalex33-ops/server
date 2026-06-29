(function () {
  const session = window.loadAuthSession ? window.loadAuthSession() : null;
  const profile = String(session?.usuario?.perfil || "").toUpperCase();
  let target = "/homologacao/";
  if (session?.accessToken) {
    target = profile === "GESTOR" || profile === "ADMIN" ? "/homologacao/painel-logistico/gestao" : "/homologacao/painel-logistico/operador";
  } else {
    try { sessionStorage.setItem("painel-logistico-login-message", "Faça login para acessar o painel."); } catch (error) {}
  }
  window.setTimeout(() => window.location.replace(target), 600);
})();
