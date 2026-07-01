
(function () {
  "use strict";

  const HOME = (window.appUrl ? window.appUrl("/public/") : ((window.PAINEL_BASE_PATH || "") + "/public/"));
  const icon = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l3-3 3 2 5-7"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/></svg>',
    fuel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15"/><path d="M3 20h14"/><path d="M16 8h2l2 2v7a2 2 0 0 1-2 2h-2"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 13h13l3 4v3H3v-7Z"/><path d="M5 13V7h8v6"/><circle cx="7" cy="20" r="2"/><circle cx="17" cy="20" r="2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 22c1.8-4 4.5-6 8-6s6.2 2 8 6"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9 12l2 2 4-4"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5V4a2 2 0 0 1 2-2h9l5 5v12.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6V20a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6V4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.36.4.68.6 1H20a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-.51 1Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 1-15.5 6.3"/><path d="M3 12A9 9 0 0 1 18.5 5.7"/><path d="M3 18h6v-6"/><path d="M21 6h-6v6"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>'
  };

  const managerMenu = [
    { section: "Gestão" },
    { label: "Dashboard Gerencial", href: "gestao.html", key: "dashboard", icon: "home" },
    { label: "Indicadores", href: "gestao-indicadores.html", key: "indicadores", icon: "chart" },
    { label: "IA Gerencial", href: "gestao-ia.html", key: "ia", icon: "spark" },
    { label: "Mapa Gerencial", href: "gestao-mapa.html", key: "mapa", icon: "map" },
    { label: "Custos Operacionais", href: "gestao-custos.html", key: "custos", icon: "money" },
    { label: "Combustível", href: "gestao-combustivel.html", key: "combustivel", icon: "fuel" },
    { label: "Frota", href: "gestao-frota.html", key: "frota", icon: "car" },
    { label: "Motoristas", href: "gestao-motoristas.html", key: "motoristas", icon: "user" },
    { label: "Passageiros", href: "gestao-passageiros.html", key: "passageiros", icon: "users" },
    { label: "Auditoria", href: "gestao-auditoria.html", key: "auditoria", icon: "shield" },
    { label: "Relatórios", href: "gestao-relatorios.html", key: "relatorios", icon: "file" },
    { label: "Exportações", href: "gestao-exportacoes.html", key: "exportacoes", icon: "down" },
    { label: "Segurança Operacional", href: "gestao-seguranca.html", key: "seguranca", icon: "shield" },
    { label: "Privacidade / LGPD", href: "gestao-lgpd.html", key: "lgpd", icon: "shield" },
    { section: "Configurações" },
    { label: "Operadores Logísticos", href: "gestao-operadores.html", key: "operadores", icon: "shield" },
    { label: "Perfis de Acesso", href: "gestao-perfis.html", key: "perfis", icon: "user" },
    { label: "Parâmetros do Sistema", href: "gestao-parametros.html", key: "parametros", icon: "gear" },
    { label: "Sair", href: "#", key: "logout", icon: "logout", logout: true }
  ];

  const operatorMenu = [
    { section: "Operação" },
    { label: "Visão Geral", href: "operador.html", key: "agenda", icon: "home" },
    { label: "Viagens do Dia", href: "operador-viagens.html", key: "trips", icon: "chart" },
    { label: "Mapa / Rastreamento", href: "operador-mapa.html", key: "monitoring", icon: "map" },
    { label: "Cadastros", href: "operador-cadastros.html", key: "registrations", icon: "plus" },
    { label: "IA Operacional", href: "operador-ia.html", key: "ai", icon: "spark" },
    { label: "Cadastro de Motorista", href: "operador-motoristas.html", key: "drivers", icon: "user" },
    { label: "Frota de Veículos", href: "operador-frota.html", key: "fleet", icon: "car" },
    { label: "Conectar App / Senha", href: "operador-conectar-app.html", key: "qr", icon: "phone" },
    { label: "Sincronização", href: "operador-sincronizacao.html", key: "sync", icon: "sync" },
    { section: "Centrais" },
    { label: "Sala de Situação", href: (window.appUrl ? window.appUrl("/painel-logistico/sala-situacao") : "/painel-logistico/sala-situacao"), key: "sala", icon: "gear" },
    { label: "Ocorrências", href: (window.appUrl ? window.appUrl("/painel-logistico/emergencias") : "/painel-logistico/emergencias"), key: "emergencias", icon: "alert" },
    { label: "App Motorista", href: (window.appUrl ? window.appUrl("/public/motorista/") : "/public/motorista/"), key: "app", icon: "phone" },
    { label: "Sair", href: "#", key: "logout", icon: "logout", logout: true }
  ];

  function linkHtml(item, currentPath) {
    if (item.section) return `<p>${item.section}</p>`;
    const href = item.href.startsWith("/") || item.href === "#" ? item.href : HOME + item.href;
    const cleanHref = href.split("?")[0].split("#")[0];
    const active = currentPath.endsWith(cleanHref) || currentPath.endsWith('/' + item.href) || (item.href === 'gestao.html' && /\/gestao\.html$/.test(currentPath)) || (item.href === 'operador.html' && /\/operador\.html$/.test(currentPath));
    const dataAttr = item.logout ? ' data-logout="true" class="nav-logout"' : ` class="${active ? 'active' : ''}" data-menu-key="${item.key}"`;
    return `<a href="${href}"${dataAttr}><span class="nav-icon" aria-hidden="true">${icon[item.icon] || icon.home}</span><span class="nav-label">${item.label}</span></a>`;
  }

  function rebuildMenu() {
    const shell = document.querySelector(".dashboard-shell");
    if (!shell) return;
    const isManager = shell.classList.contains("manager-app") || /gestao/.test(location.pathname);
    const isOperator = shell.classList.contains("operator-app") || /operador/.test(location.pathname);
    const sideNav = shell.querySelector(".side-nav");
    if (!sideNav) return;
    let nav = sideNav.querySelector(".nav-section");
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "nav-section";
      sideNav.appendChild(nav);
    }
    const currentPath = location.pathname.replace(/\/+$|\?.*$/g, "");
    if (isManager) {
      nav.setAttribute("aria-label", "Menu gestor");
      nav.innerHTML = managerMenu.map((item) => linkHtml(item, currentPath)).join("");
    } else if (isOperator) {
      nav.setAttribute("aria-label", "Menu operador");
      nav.innerHTML = operatorMenu.map((item) => linkHtml(item, currentPath)).join("");
    }
  }

  function bindDrawer() {
    const button = document.querySelector(".menu-button");
    const sideNav = document.querySelector(".side-nav");
    if (!button || !sideNav || button.dataset.h523Bound === "1") return;
    button.dataset.h523Bound = "1";
    const close = () => {
      document.body.classList.remove("operator-menu-open");
      document.body.classList.remove("manager-menu-open");
    };
    const toggle = () => {
      const willOpen = !document.body.classList.contains("operator-menu-open") && !document.body.classList.contains("manager-menu-open");
      close();
      if (willOpen) {
        document.body.classList.add("operator-menu-open");
        document.body.classList.add("manager-menu-open");
      }
    };
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });
    document.addEventListener("click", (event) => {
      if (!document.body.classList.contains("operator-menu-open") && !document.body.classList.contains("manager-menu-open")) return;
      if (sideNav.contains(event.target) || button.contains(event.target)) return;
      close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  function bindLogout() {
    document.querySelectorAll("[data-logout]").forEach((link) => {
      if (link.dataset.h523Logout === "1") return;
      link.dataset.h523Logout = "1";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        try {
          sessionStorage.removeItem("painel-logistico-auth");
          localStorage.removeItem("painel-logistico-auth");
        } catch (_) {}
        if (window.clearAuthSession) window.clearAuthSession();
        location.href = window.appUrl ? window.appUrl("/") : "/";
      });
    });
  }

  function forcePanelClasses() {
    const shell = document.querySelector(".dashboard-shell");
    if (!shell) return;
    if (/gestao/.test(location.pathname)) shell.classList.add("manager-app");
    if (/operador/.test(location.pathname)) shell.classList.add("operator-app");
    document.documentElement.dataset.theme = document.documentElement.dataset.theme || "dark";
    document.body.dataset.theme = document.body.dataset.theme || "dark";
  }

  function init() {
    forcePanelClasses();
    rebuildMenu();
    bindDrawer();
    bindLogout();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("load", init, { once: true });
})();
