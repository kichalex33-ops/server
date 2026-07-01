(function () {
  "use strict";
  var App = window.App = window.App || {};

  function session() {
    return App.Http && App.Http.readSession ? App.Http.readSession() : null;
  }

  function profile() {
    var s = session();
    return String((s && s.usuario && s.usuario.perfil) || "").toUpperCase();
  }

  function cleanPasswordFields(root) {
    (root || document).querySelectorAll('input[type="password"], input[name="password"], input[name="senha"]').forEach(function (input) {
      input.value = "";
      input.setAttribute("autocomplete", input.name === "password" ? "current-password" : "off");
      input.setAttribute("spellcheck", "false");
      input.setAttribute("autocorrect", "off");
      input.setAttribute("autocapitalize", "off");
    });
  }

  async function login(credentials, form) {
    var payload = {
      login: String((credentials && (credentials.login || credentials.email)) || "").trim(),
      password: String((credentials && (credentials.password || credentials.senha)) || "")
    };
    if (!payload.login || !payload.password) throw new Error("Login e senha são obrigatórios.");
    try {
      var data = await App.Http.request("/auth/login", {
        method: "POST",
        skipAuth: true,
        body: payload
      });
      var sessionData = App.Http.saveSession(data);
      return sessionData;
    } finally {
      payload.password = "";
      cleanPasswordFields(form || document);
    }
  }

  async function logout() {
    var s = session();
    try {
      if (s && s.refreshToken) {
        await App.Http.request("/auth/logout", {
          method: "POST",
          body: { refreshToken: s.refreshToken }
        });
      }
    } catch (_) {}
    if (App.Http && App.Http.clearSession) App.Http.clearSession();
    else if (typeof window.clearAuthSession === "function") window.clearAuthSession();
    window.location.href = window.appUrl ? window.appUrl("/") : "/";
  }

  function isAuthenticated() {
    var s = session();
    return Boolean(s && (s.accessToken || s.token));
  }

  App.Auth = {
    session: session,
    profile: profile,
    login: login,
    logout: logout,
    cleanPasswordFields: cleanPasswordFields,
    isAuthenticated: isAuthenticated
  };
})();
