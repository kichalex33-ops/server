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
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const login = String(data.get("login") || "").trim();
    const password = String(data.get("password") || "");
    const feedback = form.querySelector(".login-feedback");
    feedback.textContent = "";

    try {
      const response = await fetch(window.apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ login, password })
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Login invalido.");
      window.saveAuthSession(body.data);
      sessionStorage.setItem("painel-logistico-profile", form.dataset.profile);
      window.location.href = form.dataset.target;
      return;
    } catch (error) {
      feedback.textContent = error.message || "Login ou senha invalidos.";
    }
  });
});
