
(function () {
  'use strict';

  const HOME = '/homologacao/public/';
  const icon = {
    home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
    chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l3-3 3 2 5-7"/></svg>',
    spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/></svg>',
    map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/></svg>',
    target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>',
    money:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/></svg>',
    fuel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15"/><path d="M3 20h14"/><path d="M16 8h2l2 2v7a2 2 0 0 1-2 2h-2"/></svg>',
    car:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 13h13l3 4v3H3v-7Z"/><path d="M5 13V7h8v6"/><circle cx="7" cy="20" r="2"/><circle cx="17" cy="20" r="2"/></svg>',
    user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 22c1.8-4 4.5-6 8-6s6.2 2 8 6"/></svg>',
    users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9 12l2 2 4-4"/></svg>',
    file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5V4a2 2 0 0 1 2-2h9l5 5v12.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
    down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
    gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6V20a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6V4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.36.4.68.6 1H20a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-.51 1Z"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    sync:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 1-15.5 6.3"/><path d="M3 12A9 9 0 0 1 18.5 5.7"/><path d="M3 18h6v-6"/><path d="M21 6h-6v6"/></svg>',
    alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
    route:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M6 13V8a3 3 0 0 1 3-3h6"/><path d="M18 11v5a3 3 0 0 1-3 3H9"/></svg>',
    logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>'
  };

  const managerMenu = [
    { section:'Gestão' },
    { label:'Dashboard Gerencial', href:'gestao.html', screen:'dashboard', icon:'home' },
    { label:'Indicadores', href:'gestao-indicadores.html', screen:'indicadores', icon:'chart' },
    { label:'IA Gerencial', href:'gestao-ia.html', screen:'ia', icon:'spark' },
    { label:'Mapa Gerencial', href:'gestao-mapa.html', screen:'mapa', icon:'map' },
    { label:'Custos Operacionais', href:'gestao-custos.html', screen:'custos', icon:'money' },
    { label:'Combustível', href:'gestao-combustivel.html', screen:'combustivel', icon:'fuel' },
    { label:'Frota', href:'gestao-frota.html', screen:'frota', icon:'car' },
    { label:'Motoristas', href:'gestao-motoristas.html', screen:'motoristas', icon:'user' },
    { label:'Passageiros', href:'gestao-passageiros.html', screen:'passageiros', icon:'users' },
    { label:'Auditoria', href:'gestao-auditoria.html', screen:'auditoria', icon:'shield' },
    { label:'Relatórios', href:'gestao-relatorios.html', screen:'relatorios', icon:'file' },
    { label:'Exportações', href:'gestao-exportacoes.html', screen:'exportacoes', icon:'down' },
    { label:'Segurança Operacional', href:'gestao-seguranca.html', screen:'seguranca', icon:'shield' },
    { section:'Configurações' },
    { label:'Operadores Logísticos', href:'gestao-operadores.html', screen:'operadores', icon:'shield' },
    { label:'Perfis de Acesso', href:'gestao-perfis.html', screen:'perfis', icon:'user' },
    { label:'Parâmetros do Sistema', href:'gestao-parametros.html', screen:'parametros', icon:'gear' },
    { label:'Sair', href:'#', icon:'logout', logout:true }
  ];

  const operatorMenu = [
    { section:'Agenda' },
    { label:'Visão Geral', href:'operador.html', screen:'agenda', icon:'home' },
    { label:'Criar Viagem', href:'operador-criar-viagem.html', screen:'trips', focus:'#nova-viagem', icon:'plus' },
    { label:'Viagens do Dia', href:'operador-viagens.html', screen:'trips', focus:'#viagens', icon:'calendar' },
    { label:'Mapa / Rastreamento', href:'operador-mapa.html', screen:'monitoring', icon:'target' },
    { section:'Cadastros' },
    { label:'Pacientes e Acompanhantes', href:'operador-pacientes.html', screen:'registrations', focus:'#pacientes-cadastrados', icon:'users' },
    { label:'Destinos', href:'operador-destinos.html', screen:'registrations', focus:'#destinos-cadastrados', icon:'map' },
    { label:'Passageiros em Viagens', href:'operador-passageiros.html', screen:'registrations', focus:'#passageiros-cadastrados', icon:'route' },
    { label:'Cadastros Gerais', href:'operador-cadastros.html', screen:'registrations', icon:'plus' },
    { section:'Equipe e Frota' },
    { label:'Cadastro de Motorista', href:'operador-motoristas.html', screen:'drivers', driverTab:'people', icon:'user' },
    { label:'Frota de Veículos', href:'operador-frota.html', screen:'drivers', driverTab:'fleet', icon:'car' },
    { label:'Conectar App / Senha', href:'operador-conectar-app.html', screen:'drivers', driverTab:'qr', icon:'phone' },
    { label:'Sincronização', href:'operador-sincronizacao.html', icon:'sync' },
    { section:'Apoio Operacional' },
    { label:'IA Operacional', href:'operador-ia.html', screen:'ai', icon:'spark' },
    { label:'Sala de Situação', href:'/homologacao/painel-logistico/sala-situacao', icon:'gear' },
    { label:'Ocorrências', href:'/homologacao/painel-logistico/emergencias', icon:'alert' },
    { label:'App Motorista', href:'/homologacao/public/motorista/', icon:'phone' },
    { label:'Sair', href:'#', icon:'logout', logout:true }
  ];

  const managerViews = {
    dashboard:['#dashboard','#gestaoResumoOperacional'],
    indicadores:['#dashboard','#gestaoResumoOperacional'],
    ia:['#ia-gerencial'],
    mapa:['#mapa-gerencial'],
    custos:['#custos'],
    combustivel:['#combustivel'],
    frota:['#frota'],
    motoristas:['#motoristas'],
    passageiros:['#passageiros'],
    auditoria:['#auditoria'],
    relatorios:['#relatorios'],
    exportacoes:['#exportacoes'],
    seguranca:['#seguranca','#auditoria'],
    operadores:['#operadores-logisticos'],
    perfis:['#perfis'],
    parametros:['#parametros']
  };
  const managerTitles = {
    dashboard:['Painel do Gestor','Visão estratégica e gerencial da operação'],
    indicadores:['Indicadores','KPIs e resumo operacional'],
    ia:['IA Gerencial','Relatórios e recomendações'],
    mapa:['Mapa Gerencial','Frota e alertas em tempo real'],
    custos:['Custos Operacionais','Custos por quilômetro, paciente e categoria'],
    combustivel:['Combustível','Consumo, abastecimento e custo por veículo'],
    frota:['Frota','Veículos e utilização'],
    motoristas:['Motoristas','Ranking e desempenho da equipe'],
    passageiros:['Passageiros','Transporte e custos por categoria'],
    auditoria:['Auditoria','Eventos e rastreabilidade'],
    relatorios:['Relatórios','Exportações e documentos gerenciais'],
    exportacoes:['Exportações','Arquivos CSV e bases de dados'],
    seguranca:['Segurança Operacional','Perfis, auditoria e controle'],
    operadores:['Operadores Logísticos','Cadastro e controle de operadores'],
    perfis:['Perfis de Acesso','Papéis e permissões'],
    parametros:['Parâmetros do Sistema','Configuração do ambiente']
  };

  function abs(href) { return href === '#' || href.startsWith('/') ? href : HOME + href; }
  function normalized(path) { return String(path || '').replace(location.origin, '').replace(/\?.*$/, '').replace(/#.*$/, '').replace(/\/+$/, ''); }
  function currentFile() { return (location.pathname.split('/').pop() || ''); }
  function screenFromManagerPath() {
    const f = currentFile();
    const found = managerMenu.find((item) => item.href === f);
    return document.body?.dataset.managerScreen || found?.screen || 'dashboard';
  }
  function operatorMetaFromPath() {
    const f = currentFile();
    const found = operatorMenu.find((item) => item.href === f);
    return found || {};
  }

  function menuLink(item, currentPath) {
    if (item.section) return '<p>' + item.section + '</p>';
    const href = abs(item.href);
    const hrefPath = normalized(href);
    const active = href !== '#' && (currentPath === hrefPath || currentPath.endsWith('/' + item.href));
    const cls = (active ? 'active ' : '') + (item.logout ? 'nav-logout' : '');
    const attrs = item.logout ? ' data-logout="true"' : '';
    const htmlIcon = icon[item.icon] || icon.home;
    return `<a href="${href}" class="${cls.trim()}"${attrs}><span class="nav-icon" aria-hidden="true">${htmlIcon}</span><span class="nav-label">${item.label}</span></a>`;
  }

  function rebuildMenu() {
    const shell = document.querySelector('.dashboard-shell');
    const sideNav = document.querySelector('.side-nav');
    if (!shell || !sideNav) return;
    const isManager = shell.classList.contains('manager-app') || /gestao/.test(location.pathname);
    const isOperator = shell.classList.contains('operator-app') || /operador/.test(location.pathname);
    const menu = isManager ? managerMenu : isOperator ? operatorMenu : null;
    if (!menu) return;
    let nav = sideNav.querySelector('.nav-section');
    if (!nav) { nav = document.createElement('nav'); nav.className = 'nav-section'; sideNav.appendChild(nav); }
    nav.setAttribute('aria-label', isManager ? 'Menu gestor' : 'Menu operador');
    const currentPath = normalized(location.pathname);
    nav.innerHTML = menu.map((item) => menuLink(item, currentPath)).join('');
  }

  function showManagerPage() {
    if (!/gestao/.test(location.pathname)) return;
    const shell = document.querySelector('.dashboard-shell');
    if (shell) shell.classList.add('manager-app');
    const screen = screenFromManagerPath();
    if (document.body) document.body.dataset.managerScreen = screen;
    const selectors = managerViews[screen] || managerViews.dashboard;
    const directSections = Array.from(document.querySelectorAll('main.main-dashboard > section'));
    const innerArticles = Array.from(document.querySelectorAll('main.main-dashboard > section.manager-content > article'));
    directSections.forEach((section) => { section.hidden = true; section.classList.remove('active', 'manager-visible'); });
    innerArticles.forEach((article) => { article.hidden = true; article.classList.remove('active'); });
    selectors.forEach((selector) => {
      const element = document.querySelector(selector);
      if (!element) return;
      const parent = element.closest('main.main-dashboard > section');
      if (parent) { parent.hidden = false; parent.classList.add('active', 'manager-visible'); }
      element.hidden = false; element.classList.add('active');
    });
    const [title, sub] = managerTitles[screen] || managerTitles.dashboard;
    const titleEl = document.querySelector('#managerScreenTitle') || document.querySelector('.top-title h1');
    const subEl = document.querySelector('#managerScreenEyebrow') || document.querySelector('.top-title span');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;
    document.title = title + ' | Painel Gestor';
  }

  function setOperatorInitialState() {
    if (!/operador/.test(location.pathname)) return;
    const shell = document.querySelector('.dashboard-shell');
    if (shell) shell.classList.add('operator-app');
    const meta = operatorMetaFromPath();
    if (meta.screen && document.body && !document.body.dataset.initialScreen) document.body.dataset.initialScreen = meta.screen;
    if (meta.driverTab && document.body && !document.body.dataset.initialDriverTab) document.body.dataset.initialDriverTab = meta.driverTab;
    if (meta.focus && document.body) document.body.dataset.focusSelector = meta.focus;
    if (meta.label) document.title = meta.label + ' | Painel Operador';
  }

  function scrollToFocus() {
    const selector = document.body?.dataset.focusSelector;
    if (!selector) return;
    window.setTimeout(() => {
      const el = document.querySelector(selector);
      if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
    }, 420);
  }

  function bindDrawerAndLogout() {
    const button = document.querySelector('.menu-button');
    const sideNav = document.querySelector('.side-nav');
    const close = () => document.body?.classList.remove('operator-menu-open','manager-menu-open');
    if (button && sideNav && button.dataset.h524Bound !== '1') {
      button.dataset.h524Bound = '1';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const open = document.body.classList.contains('operator-menu-open') || document.body.classList.contains('manager-menu-open');
        close();
        if (!open) {
          if (document.querySelector('.dashboard-shell')?.classList.contains('manager-app')) document.body.classList.add('manager-menu-open');
          else document.body.classList.add('operator-menu-open');
        }
      }, true);
      document.addEventListener('click', (event) => {
        if (!document.body.classList.contains('operator-menu-open') && !document.body.classList.contains('manager-menu-open')) return;
        if (sideNav.contains(event.target) || button.contains(event.target)) return;
        close();
      }, true);
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); }, true);
      sideNav.addEventListener('click', (event) => {
        const a = event.target.closest('a');
        if (a && !a.matches('[data-logout]')) close();
      }, true);
    }
    document.querySelectorAll('[data-logout]').forEach((link) => {
      if (link.dataset.h524Logout === '1') return;
      link.dataset.h524Logout = '1';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        try { sessionStorage.removeItem('painel-logistico-auth'); localStorage.removeItem('painel-logistico-auth'); } catch (_) {}
        if (window.clearAuthSession) window.clearAuthSession();
        location.href = window.appUrl ? window.appUrl('/') : '/homologacao/';
      }, true);
    });
  }

  function applyThemeClass() {
    const theme = document.body?.dataset.theme || document.documentElement.dataset.theme || 'dark';
    document.documentElement.dataset.theme = theme;
    if (document.body) document.body.dataset.theme = theme;
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    document.body?.classList.toggle('theme-dark', theme === 'dark');
  }

  function init() {
    applyThemeClass();
    setOperatorInitialState();
    showManagerPage();
    rebuildMenu();
    bindDrawerAndLogout();
    scrollToFocus();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
  window.addEventListener('load', init, { once:true });
})();
