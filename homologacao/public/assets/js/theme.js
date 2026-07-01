(function () {
  "use strict";

  const painelThemeKey = "painel-logistico-theme";

  function normalizeTheme(theme) {
    return theme === "dark" ? "dark" : "light";
  }

  function savedTheme() {
    try {
      return normalizeTheme(localStorage.getItem(painelThemeKey) || document.documentElement.dataset.theme || "light");
    } catch (_) {
      return "light";
    }
  }

  function updateThemeButtons(theme) {
    const buttons = document.querySelectorAll("#themeToggle, [data-theme-toggle]");
    buttons.forEach((button) => {
      button.textContent = theme === "dark" ? "☾" : "☀";
      button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      button.setAttribute("title", theme === "dark" ? "Usar modo claro" : "Usar modo escuro");
    });
  }

  let themeTransitionTimer = null;

  function beginThemeTransition(options) {
    const instant = options && options.instant;
    if (instant || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    document.documentElement.classList.add("theme-transitioning");
    if (document.body) document.body.classList.add("theme-transitioning");
    clearTimeout(themeTransitionTimer);
    themeTransitionTimer = setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
      if (document.body) document.body.classList.remove("theme-transitioning");
    }, 340);
  }

  function setPainelTheme(theme, options) {
    const normalized = normalizeTheme(theme);
    const current = document.body?.dataset.theme || document.documentElement.dataset.theme;
    if (current !== normalized) beginThemeTransition(options);
    document.documentElement.dataset.theme = normalized;
    document.documentElement.classList.toggle("theme-dark", normalized === "dark");
    document.documentElement.classList.toggle("theme-light", normalized !== "dark");
    if (document.body) {
      document.body.dataset.theme = normalized;
      document.body.classList.toggle("theme-dark", normalized === "dark");
      document.body.classList.toggle("theme-light", normalized !== "dark");
    }
    try { localStorage.setItem(painelThemeKey, normalized); } catch (_) {}
    updateThemeButtons(normalized);
    window.dispatchEvent(new CustomEvent("painel-theme-change", { detail: { theme: normalized } }));
  }

  function ensureFloatingToggle() {
    if (!document.body) return;
    if (document.querySelector("#themeToggle, [data-theme-toggle]")) return;
    if (document.body.dataset.themeToggle === "none") return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-button floating-theme-toggle";
    button.setAttribute("data-theme-toggle", "");
    button.setAttribute("aria-label", "Alternar tema");
    document.body.appendChild(button);
  }

  function bindThemeButtons() {
    document.querySelectorAll("#themeToggle, [data-theme-toggle]").forEach((button) => {
      if (button.dataset.themeBound === "1") return;
      button.dataset.themeBound = "1";
      button.addEventListener("click", () => {
        setPainelTheme((document.body?.dataset.theme || document.documentElement.dataset.theme) === "dark" ? "light" : "dark");
      });
    });
  }

  document.documentElement.dataset.theme = savedTheme();

  function initTheme() {
    const initial = savedTheme();
    if (!document.body.dataset.theme || document.body.dataset.theme === "light") {
      document.body.dataset.theme = initial;
    }
    ensureFloatingToggle();
    bindThemeButtons();
    setPainelTheme(document.body.dataset.theme || initial, { instant: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme, { once: true });
  } else {
    initTheme();
  }

  window.setPainelTheme = setPainelTheme;
})();
