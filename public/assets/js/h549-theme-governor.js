(function () {
  "use strict";
  var App = window.App = window.App || {};

  function normalizeTheme(value) {
    return String(value || "").toLowerCase() === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    theme = normalizeTheme(theme || localStorage.getItem("painel-logistico-theme") || document.body?.dataset.theme || document.documentElement.dataset.theme || "light");
    document.documentElement.dataset.theme = theme;
    if (document.body) document.body.dataset.theme = theme;
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
    document.documentElement.classList.toggle("theme-light", theme !== "dark");
    if (document.body) {
      document.body.classList.toggle("theme-dark", theme === "dark");
      document.body.classList.toggle("theme-light", theme !== "dark");
    }
    return theme;
  }

  function inferLabel(input) {
    var value = input.getAttribute("aria-label") || input.getAttribute("placeholder") || input.name || input.id || input.type || "Campo";
    return String(value).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function ensureInputLabels(scope) {
    (scope || document).querySelectorAll("input, select, textarea").forEach(function (input) {
      if (input.labels && input.labels.length) return;
      if (input.getAttribute("aria-label") || input.getAttribute("aria-labelledby")) return;
      var label = inferLabel(input);
      input.setAttribute("aria-label", label || "Campo do formulário");
      input.dataset.h549Label = "runtime";
    });
  }

  function protectSensitiveInputs(scope) {
    (scope || document).querySelectorAll('input[name*="cpf" i], input[id*="cpf" i], input[name*="senha" i], input[id*="senha" i], input[type="password"], input[name*="email" i], input[id*="email" i], input[name*="titular" i], input[id*="titular" i]').forEach(function (input) {
      input.setAttribute("autocomplete", input.type === "password" ? "current-password" : "off");
      input.setAttribute("autocorrect", "off");
      input.setAttribute("autocapitalize", "off");
      input.setAttribute("spellcheck", "false");
    });
  }

  function markReady() {
    document.documentElement.dataset.h549Governor = "ready";
    document.documentElement.dataset.selfHealing = "disabled";
  }

  function init() {
    applyTheme();
    ensureInputLabels(document);
    protectSensitiveInputs(document);
    markReady();
  }

  var originalSetTheme = window.setPainelTheme;
  window.setPainelTheme = function (theme, options) {
    var applied = applyTheme(theme);
    try { localStorage.setItem("painel-logistico-theme", applied); } catch (_) {}
    if (typeof originalSetTheme === "function") {
      try { return originalSetTheme.call(this, applied, options || {}); } catch (_) {}
    }
    return applied;
  };

  App.ThemeGovernor = { applyTheme: applyTheme, ensureInputLabels: ensureInputLabels, protectSensitiveInputs: protectSensitiveInputs };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
