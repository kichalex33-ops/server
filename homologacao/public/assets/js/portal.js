const themeKey = "painel-logistico-theme";
const page = document.body;
const toggle = document.querySelector("#themeToggle");

function applyTheme(theme) {
  page.dataset.theme = theme;
  if (toggle) toggle.textContent = theme === "dark" ? "☾" : "☀";
  localStorage.setItem(themeKey, theme);
}

function validProfileForForm(formProfile, returnedProfile) {
  const expected = String(formProfile || "").toUpperCase();
  const actual = String(returnedProfile || "").toUpperCase();
  if (actual === "ADMIN") return true;
  if (expected === "OPERADOR") return actual === "OPERADOR";
  if (expected === "GESTAO" || expected === "GESTOR") return actual === "GESTOR";
  return true;
}

applyTheme(localStorage.getItem(themeKey) || "light");

if (toggle) {
  toggle.addEventListener("click", () => applyTheme(page.dataset.theme === "dark" ? "light" : "dark"));
}

const loginMessage = sessionStorage.getItem("painel-logistico-login-message");
if (loginMessage) {
  document.querySelectorAll(".login-feedback").forEach((feedback) => { feedback.textContent = loginMessage; });
  sessionStorage.removeItem("painel-logistico-login-message");
}

document.querySelectorAll(".login-form").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const login = String(data.get("login") || "").trim();
    const password = String(data.get("password") || "");
    const feedback = form.querySelector(".login-feedback");
    const button = form.querySelector("button[type=submit]");
    const originalLabel = button?.dataset.label || button?.textContent || "Entrar";
    if (button?.disabled) return;
    if (button) {
      button.dataset.label = originalLabel;
      button.disabled = true;
      button.textContent = "Entrando…";
    }
    feedback.textContent = "";

    try {
      const response = await fetch(window.apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ login, password })
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Login inválido.");
      const usuario = body.data.usuario || {};
      if (!validProfileForForm(form.dataset.profile, usuario.perfil)) {
        throw new Error("Este usuário não tem permissão para este painel.");
      }
      window.saveAuthSession(body.data);
      sessionStorage.setItem("painel-logistico-profile", form.dataset.profile);
      window.location.href = window.appUrl ? window.appUrl(form.dataset.target) : form.dataset.target;
      return;
    } catch (error) {
      feedback.textContent = error.message || "Login ou senha inválidos.";
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  });
});
