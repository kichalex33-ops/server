
(function () {
  "use strict";

  const titles = {
    dashboard: ["Painel do Gestor", "Visão estratégica e gerencial da operação"],
    indicadores: ["Indicadores", "KPIs e resumo operacional"],
    ia: ["IA Gerencial", "Relatórios e recomendações"],
    mapa: ["Mapa Gerencial", "Frota e alertas em tempo real"],
    custos: ["Custos Operacionais", "Custos por quilômetro, paciente e categoria"],
    combustivel: ["Combustível", "Consumo, abastecimento e custo por veículo"],
    frota: ["Frota", "Veículos e utilização"],
    motoristas: ["Motoristas", "Ranking e desempenho da equipe"],
    passageiros: ["Passageiros", "Transporte e custos por categoria"],
    auditoria: ["Auditoria", "Eventos e rastreabilidade"],
    relatorios: ["Relatórios", "Exportações e documentos gerenciais"],
    exportacoes: ["Exportações", "Arquivos CSV e bases de dados"],
    seguranca: ["Segurança Operacional", "Perfis, auditoria e controle"],lgpd: ["Privacidade / LGPD", "Consentimentos e solicitações"],
    operadores: ["Operadores Logísticos", "Cadastro e controle de operadores"],
    perfis: ["Perfis de Acesso", "Papéis e permissões"],
    parametros: ["Parâmetros do Sistema", "Configuração do ambiente"]
  };

  const viewSelectors = {
    dashboard: ["#dashboard", "#gestaoResumoOperacional"],
    indicadores: ["#dashboard", "#gestaoResumoOperacional"],
    ia: ["#ia-gerencial"],
    mapa: ["#mapa-gerencial"],
    custos: ["#custos"],
    combustivel: ["#combustivel"],
    frota: ["#frota"],
    motoristas: ["#motoristas"],
    passageiros: ["#passageiros"],
    auditoria: ["#auditoria"],
    relatorios: ["#relatorios"],
    exportacoes: ["#exportacoes"],
    seguranca: ["#seguranca", "#auditoria"],
    operadores: ["#operadores-logisticos"],
    perfis: ["#perfis"],
    parametros: ["#parametros"]
  };

  function normalize(path) {
    return String(path || "").replace(/\?.*$/, "").replace(/#.*$/, "").replace(/\/$/, "");
  }

  function showManagerScreen() {
    const screen = document.body?.dataset.managerScreen || "dashboard";
    const selectors = viewSelectors[screen] || viewSelectors.dashboard;
    const directSections = Array.from(document.querySelectorAll("main.main-dashboard > section"));
    const managerArticles = Array.from(document.querySelectorAll("main.main-dashboard > section.manager-content > article"));
    directSections.forEach((section) => { section.hidden = true; section.classList.remove("active"); });
    managerArticles.forEach((article) => { article.hidden = true; article.classList.remove("active"); });
    selectors.forEach((selector) => {
      const element = document.querySelector(selector);
      if (!element) return;
      const parentSection = element.closest("main.main-dashboard > section");
      if (parentSection) {
        parentSection.hidden = false;
        parentSection.classList.add("active");
      }
      element.hidden = false;
      element.classList.add("active");
    });
    const [title, eyebrow] = titles[screen] || titles.dashboard;
    const titleEl = document.querySelector("#managerScreenTitle") || document.querySelector(".top-title h1");
    const eyebrowEl = document.querySelector("#managerScreenEyebrow") || document.querySelector(".top-title span");
    if (titleEl) titleEl.textContent = title;
    if (eyebrowEl) eyebrowEl.textContent = eyebrow;
    document.querySelectorAll("[data-manager-screen-link]").forEach((link) => {
      link.classList.toggle("active", link.dataset.managerScreenLink === screen);
    });
  }

  function bindDrawer() {
    const button = document.querySelector(".menu-button");
    const sideNav = document.querySelector(".side-nav");
    if (!button || !sideNav || button.dataset.h522Bound === "1") return;
    button.dataset.h522Bound = "1";
    const close = () => document.body.classList.remove("operator-menu-open");
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      document.body.classList.toggle("operator-menu-open");
    });
    document.addEventListener("click", (event) => {
      if (!document.body.classList.contains("operator-menu-open")) return;
      if (sideNav.contains(event.target) || button.contains(event.target)) return;
      close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
    sideNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      if (link.getAttribute("href") === "#") close();
    }));
  }

  function forceDarkTheme() {
    document.documentElement.dataset.theme = "dark";
    document.body.dataset.theme = "dark";
    document.documentElement.classList.add("theme-dark");
    document.body.classList.add("theme-dark");
  }

  document.addEventListener("DOMContentLoaded", () => {
    forceDarkTheme();
    showManagerScreen();
    bindDrawer();
  });
})();
