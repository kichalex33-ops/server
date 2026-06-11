const themeKey = "painel-logistico-theme";
const page = document.body;
const toggle = document.querySelector("#themeToggle");

function applyTheme(theme) {
  page.dataset.theme = theme;
  if (toggle) toggle.textContent = theme === "dark" ? "☾" : "☀";
  localStorage.setItem(themeKey, theme);
}

applyTheme(localStorage.getItem(themeKey) || "light");

if (toggle) {
  toggle.addEventListener("click", () => applyTheme(page.dataset.theme === "dark" ? "light" : "dark"));
}

document.querySelectorAll(".login-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const login = String(data.get("login") || "").trim().toUpperCase();
    const password = String(data.get("password") || "");
    const feedback = form.querySelector(".login-feedback");
    if (login === form.dataset.profile && password === form.dataset.password) {
      sessionStorage.setItem("painel-logistico-profile", form.dataset.profile);
      window.location.href = form.dataset.target;
      return;
    }
    feedback.textContent = "Login ou senha invalidos.";
  });
});
