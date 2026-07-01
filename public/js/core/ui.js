(function () {
  "use strict";
  var App = window.App = window.App || {};

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  function ensureToastStack() {
    var stack = document.querySelector(".ls-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "ls-toast-stack";
      stack.setAttribute("aria-live", "polite");
      stack.setAttribute("aria-atomic", "true");
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(message, type, timeout) {
    var stack = ensureToastStack();
    var item = document.createElement("div");
    item.className = "ls-toast";
    item.dataset.type = type || "info";
    item.textContent = String(message || "Ação concluída.");
    stack.appendChild(item);
    window.setTimeout(function () { item.remove(); }, timeout || 4200);
    return item;
  }

  function pageLabel(file) {
    file = (file || "").replace(/\.html$/i, "");
    var known = {
      portal: "Início", index: "Início", operador: "Operador", gestao: "Gestor",
      "sala-situacao": "Sala de Situação", emergencias: "Ocorrências", comando: "Comando"
    };
    if (known[file]) return known[file];
    return file.replace(/^(operador|gestao)-/i, "").replace(/-/g, " ").replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }

  function injectBreadcrumb() {
    if (document.querySelector(".ls-breadcrumb") || document.body.classList.contains("portal-page")) return;
    var main = document.querySelector(".main-dashboard");
    var topbar = document.querySelector(".topbar");
    if (!main || !topbar) return;
    var file = (location.pathname.split("/").pop() || "portal.html").toLowerCase();
    var area = /^gestao/.test(file) ? "Gestor" : (/^operador/.test(file) ? "Operador" : "Painel");
    var nav = document.createElement("nav");
    nav.className = "ls-breadcrumb";
    nav.setAttribute("aria-label", "breadcrumb");
    var home = document.createElement("a");
    home.href = window.appUrl ? window.appUrl("/") : "/";
    home.textContent = "Início";
    var sep1 = document.createElement("span"); sep1.setAttribute("aria-hidden", "true"); sep1.textContent = "/";
    var areaEl = document.createElement("span"); areaEl.textContent = area;
    var sep2 = document.createElement("span"); sep2.setAttribute("aria-hidden", "true"); sep2.textContent = "/";
    var current = document.createElement("span"); current.setAttribute("aria-current", "page"); current.textContent = pageLabel(file);
    nav.append(home, sep1, areaEl, sep2, current);
    topbar.insertAdjacentElement("afterend", nav);
  }

  function makeEmptyStates() {
    document.querySelectorAll("table tbody").forEach(function (tbody) {
      if (tbody.dataset.h544EmptyChecked === "1") return;
      tbody.dataset.h544EmptyChecked = "1";
      var rows = Array.prototype.slice.call(tbody.rows || []);
      if (rows.length !== 1) return;
      var firstCell = rows[0].cells && rows[0].cells[0];
      if (!firstCell || !firstCell.hasAttribute("colspan")) return;
      rows[0].classList.add("is-empty");
    });
  }

  function improveTooltips() {
    document.querySelectorAll("[title]").forEach(function (el) {
      if (el.dataset.tooltip || el.dataset.noTooltip === "1") return;
      var title = el.getAttribute("title");
      if (!title || title.length > 120) return;
      el.dataset.tooltip = title;
      el.setAttribute("aria-label", el.getAttribute("aria-label") || title);
      el.removeAttribute("title");
    });
  }

  function improveInputs() {
    document.querySelectorAll("input, textarea, select").forEach(function (el) {
      var name = (el.getAttribute("name") || el.id || "").toLowerCase();
      var sensitive = /(cpf|paciente|telefone|email|senha|password|sus|cartao|nascimento|endereco)/i.test(name + " " + (el.placeholder || ""));
      if (!el.id) el.id = "field-" + Math.random().toString(36).slice(2, 9);
      if (!el.closest("label") && !el.getAttribute("aria-label")) {
        el.setAttribute("aria-label", el.placeholder || name || "Campo de formulário");
      }
      if (sensitive) {
        el.dataset.sensitive = "true";
        el.setAttribute("autocomplete", el.type === "password" ? "current-password" : "off");
        el.setAttribute("autocorrect", "off");
        el.setAttribute("autocapitalize", "off");
        el.setAttribute("spellcheck", "false");
      }
    });
  }

  function enableHashSections() {
    function apply() {
      var id = decodeURIComponent((location.hash || "").replace(/^#/, ""));
      if (!id) return;
      var esc = window.CSS && CSS.escape ? CSS.escape(id) : id.replace(/[^a-zA-Z0-9_-]/g, "");
      var target = document.getElementById(id) || (esc ? document.querySelector('[data-route="' + esc + '"]') : null);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (target.tabIndex < 0) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
    window.addEventListener("hashchange", apply);
    window.setTimeout(apply, 120);
  }

  function bindHttpFeedback() {
    window.addEventListener("app:http-success", function (event) {
      var method = (event.detail && event.detail.method) || "GET";
      if (method !== "GET") toast("Ação salva com sucesso.", "success");
    });
    window.addEventListener("app:http-error", function (event) {
      var detail = event.detail || {};
      toast(detail.message || "Falha ao processar a ação.", "error", 5600);
    });
  }

  function boot() {
    injectBreadcrumb();
    makeEmptyStates();
    improveTooltips();
    improveInputs();
    enableHashSections();
    bindHttpFeedback();
    window.setInterval(makeEmptyStates, 2000);
  }

  App.UI = {
    toast: toast,
    emptyStates: makeEmptyStates,
    improveInputs: improveInputs,
    breadcrumb: injectBreadcrumb
  };

  ready(boot);
})();
