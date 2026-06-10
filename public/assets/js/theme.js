const painelThemeKey = "painel-logistico-theme";
const themeToggle = document.querySelector("#themeToggle");

function setPainelTheme(theme) {
  document.body.dataset.theme = theme;
  if (themeToggle) themeToggle.textContent = theme === "dark" ? "☾" : "☀";
  localStorage.setItem(painelThemeKey, theme);
}

setPainelTheme(localStorage.getItem(painelThemeKey) || document.body.dataset.theme || "light");

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    setPainelTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
  });
}
