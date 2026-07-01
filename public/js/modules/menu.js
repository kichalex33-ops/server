(function () {
  "use strict";
  window.App = window.App || {};
  window.App.Menu = window.App.Menu || { migratedFrom: "h525-menu-completo.js" };
})();


(function(){
  'use strict';
  const HOME=(window.appUrl?window.appUrl('/public/'):((window.PAINEL_BASE_PATH||'')+'/public/'));
  function queryParams(){ return new URLSearchParams(window.location.search || ''); }
  function queryValue(name){ const value=queryParams().get(name); return value ? decodeURIComponent(value) : ''; }
  const ASSET=(path)=>window.assetUrl?window.assetUrl(path+'?v=h539'):(path+'?v=h539');
  const icons={
    home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M12 5v14M5 12h14"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
    target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>',
    bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    route:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M6 13V8a3 3 0 0 1 3-3h6"/><path d="M18 11v5a3 3 0 0 1-3 3H9"/></svg>',
    chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l3-3 3 2 5-7"/></svg>',
    users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/></svg>',
    user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><circle cx="12" cy="8" r="4"/><path d="M4 22c1.8-4 4.5-6 8-6s6.2 2 8 6"/></svg>',
    car:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M3 13h13l3 4v3H3v-7Z"/><path d="M5 13V7h8v6"/><circle cx="7" cy="20" r="2"/><circle cx="17" cy="20" r="2"/></svg>',
    phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    sync:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M21 12a9 9 0 0 1-15.5 6.3"/><path d="M3 12A9 9 0 0 1 18.5 5.7"/><path d="M3 18h6v-6"/><path d="M21 6h-6v6"/></svg>',
    spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/></svg>',
    gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6V20a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6V4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.36.4.68.6 1H20a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-.51 1Z"/></svg>',
    money:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/></svg>',
    fuel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M4 20V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15"/><path d="M3 20h14"/><path d="M16 8h2l2 2v7a2 2 0 0 1-2 2h-2"/></svg>',
    shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9 12l2 2 4-4"/></svg>',
    file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M4 19.5V4a2 2 0 0 1 2-2h9l5 5v12.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
    down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
    alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
    logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>'
  };
  const op=[
    {section:'Agenda'},
    {label:'Visão Geral',href:'operador.html',screen:'agenda',icon:'home'},
    {label:'Criar Viagem',href:'operador-criar-viagem.html',screen:'trips',focus:'#nova-viagem',icon:'plus'},
    {label:'Viagens do Dia',href:'operador-viagens.html',screen:'trips',focus:'#viagens',icon:'calendar'},
    {label:'Mapa / Rastreamento',href:'operador-mapa.html',screen:'monitoring',focus:'#mapa-operacional',icon:'target'},
    {label:'Resumo da Operação',href:'operador-resumo.html',screen:'monitoring',focus:'#checklistCount',icon:'chart'},
    {label:'Alertas em Tempo Real',href:'operador-alertas.html',screen:'monitoring',focus:'#operatorAlerts',icon:'bell'},
    {label:'Eventos Recentes',href:'operador-eventos.html',screen:'monitoring',focus:'#operatorFeed',icon:'clock'},
    {label:'Rotas e Atenção',href:'operador-rotas.html',screen:'monitoring',focus:'#operatorRouteDigest',icon:'route'},
    {label:'Gráficos Operacionais',href:'operador-graficos.html',screen:'monitoring',focus:'#operatorStatusChart',icon:'chart'},
    {section:'Cadastros'},
    {label:'Pacientes e Acompanhantes',href:'operador-pacientes.html',screen:'registrations',focus:'#pacientes-cadastrados',icon:'users'},
    {label:'Destinos',href:'operador-destinos.html',screen:'registrations',focus:'#destinos-cadastrados',icon:'map'},
    {label:'Passageiros em Viagens',href:'operador-passageiros.html',screen:'registrations',focus:'#passageiros-cadastrados',icon:'route'},
    {label:'Cadastros Gerais',href:'operador-cadastros.html',screen:'registrations',focus:'#cadastros',icon:'plus'},
    {section:'Equipe e Frota'},
    {label:'Cadastro de Motorista',href:'operador-motoristas.html',screen:'drivers',driverTab:'people',focus:'#motoristas',icon:'user'},
    {label:'Frota de Veículos',href:'operador-frota.html',screen:'drivers',driverTab:'fleet',focus:'#frota',icon:'car'},
    {label:'Conectar App / Senha',href:'operador-conectar-app.html',screen:'drivers',driverTab:'qr',focus:'#conectar-app',icon:'phone'},
    {label:'Sincronização',href:'operador-sincronizacao.html',icon:'sync'},
    {section:'Apoio Operacional'},
    {label:'IA Operacional',href:'operador-ia.html',screen:'ai',focus:'#ia-operacional',icon:'spark'},
    {label:'Sala de Situação',href:(window.appUrl?window.appUrl('/painel-logistico/sala-situacao'):'/painel-logistico/sala-situacao'),icon:'gear'},
    {label:'Ocorrências',href:(window.appUrl?window.appUrl('/painel-logistico/emergencias'):'/painel-logistico/emergencias'),icon:'alert'},
    {label:'App Motorista',href:(window.appUrl?window.appUrl('/public/motorista/'):'/public/motorista/'),icon:'phone'},
    {label:'Sair',href:'#',icon:'logout',logout:true}
  ];
  const manager=[
    {section:'Gestão'},
    {label:'Dashboard Gerencial',href:'gestao.html',screen:'dashboard',icon:'home'},
    {label:'Indicadores',href:'gestao-indicadores.html',screen:'indicadores',icon:'chart'},
    {label:'IA Gerencial',href:'gestao-ia.html',screen:'ia',icon:'spark'},
    {label:'Mapa Gerencial',href:'gestao-mapa.html',screen:'mapa',icon:'map'},
    {label:'Custos Operacionais',href:'gestao-custos.html',screen:'custos',icon:'money'},
    {label:'Combustível',href:'gestao-combustivel.html',screen:'combustivel',icon:'fuel'},
    {label:'Frota',href:'gestao-frota.html',screen:'frota',icon:'car'},
    {label:'Motoristas',href:'gestao-motoristas.html',screen:'motoristas',icon:'user'},
    {label:'Passageiros',href:'gestao-passageiros.html',screen:'passageiros',icon:'users'},
    {label:'Auditoria',href:'gestao-auditoria.html',screen:'auditoria',icon:'shield'},
    {label:'Relatórios',href:'gestao-relatorios.html',screen:'relatorios',icon:'file'},
    {label:'Exportações',href:'gestao-exportacoes.html',screen:'exportacoes',icon:'down'},
    {label:'Segurança Operacional',href:'gestao-seguranca.html',screen:'seguranca',icon:'shield'},
    {label:'Privacidade / LGPD',href:'gestao-lgpd.html',screen:'lgpd',icon:'shield'},
    {section:'Configurações'},
    {label:'Operadores Logísticos',href:'gestao-operadores.html',screen:'operadores',icon:'shield'},
    {label:'Perfis de Acesso',href:'gestao-perfis.html',screen:'perfis',icon:'user'},
    {label:'Parâmetros do Sistema',href:'gestao-parametros.html',screen:'parametros',icon:'gear'},
    {label:'Sair',href:'#',icon:'logout',logout:true}
  ];
  const managerViews={dashboard:['#dashboard','#gestaoResumoOperacional'],indicadores:['#dashboard','#gestaoResumoOperacional'],ia:['#ia-gerencial'],mapa:['#mapa-gerencial'],custos:['#custos'],combustivel:['#combustivel'],frota:['#frota'],motoristas:['#motoristas'],passageiros:['#passageiros'],auditoria:['#auditoria'],relatorios:['#relatorios'],exportacoes:['#exportacoes'],seguranca:['#seguranca','#auditoria'],lgpd:['#lgpd'],operadores:['#operadores-logisticos'],perfis:['#perfis'],parametros:['#parametros']};
  const managerTitles={dashboard:['Painel do Gestor','Visão estratégica'],indicadores:['Indicadores','KPIs e resumo operacional'],ia:['IA Gerencial','Relatórios e recomendações'],mapa:['Mapa Gerencial','Frota e alertas em tempo real'],custos:['Custos Operacionais','Custos por quilômetro e por paciente'],combustivel:['Combustível','Consumo e abastecimento'],frota:['Frota','Veículos e utilização'],motoristas:['Motoristas','Equipe e desempenho'],passageiros:['Passageiros','Transporte e categorias'],auditoria:['Auditoria','Eventos e rastreabilidade'],relatorios:['Relatórios','Documentos gerenciais'],exportacoes:['Exportações','Arquivos e bases de dados'],seguranca:['Segurança Operacional','Controle e auditoria'],lgpd:['Privacidade / LGPD','Consentimentos e solicitações'],operadores:['Operadores Logísticos','Cadastro de operadores'],perfis:['Perfis de Acesso','Papéis e permissões'],parametros:['Parâmetros do Sistema','Configurações da homologação']};

  function ensureH530Assets(){ return; }
  function abs(h){return h==='#'||h.startsWith('/')?h:HOME+h;}
  function file(){return location.pathname.split('/').pop()||'';}
  function pathOf(h){try{return new URL(abs(h),location.origin).pathname.replace(/\/+$/,'');}catch(_){return String(h)}}
  function navHtml(items){const cur=location.pathname.replace(/\/+$/,'');return items.map(it=>{if(it.section)return '<p>'+it.section+'</p>'; const href=abs(it.href); const active=href!=='#'&&(cur===pathOf(it.href)||cur.endsWith('/'+it.href)); const cls=(active?'active ':'')+(it.logout?'nav-logout':''); const data=it.logout?' data-logout="true"':''; return `<a href="${href}" class="${cls.trim()}"${data}><span class="nav-icon" aria-hidden="true">${icons[it.icon]||icons.home}</span><span class="nav-label">${it.label}</span></a>`;}).join('');}
  function buildMenu(){const shell=document.querySelector('.dashboard-shell'); const nav=document.querySelector('.side-nav .nav-section'); if(!shell||!nav)return; const isManager=/gestao/.test(location.pathname)||shell.classList.contains('manager-app'); const isOperator=/operador/.test(location.pathname)||shell.classList.contains('operator-app'); if(isManager){shell.classList.add('manager-app'); nav.innerHTML=navHtml(manager); nav.setAttribute('aria-label','Menu gestor');} else if(isOperator){shell.classList.add('operator-app'); nav.innerHTML=navHtml(op); nav.setAttribute('aria-label','Menu operador');}}
  function showOperator(){
    if(!/operador/.test(location.pathname))return;
    const meta=op.find(x=>x.href===file())||op.find(x=>x.href==='operador.html')||{};
    const screen=queryValue('screen')||document.body?.dataset.initialScreen||meta.screen||'agenda';
    const driverTab=queryValue('driverTab')||document.body?.dataset.initialDriverTab||meta.driverTab||'';
    const focus=queryValue('focus')||document.body?.dataset.focusSelector||meta.focus||'';
    const label=queryValue('label')||meta.label||'Painel Operador';
    if(screen){document.querySelectorAll('[data-screen-panel]').forEach(p=>{const on=p.dataset.screenPanel===screen; p.hidden=!on; p.classList.toggle('active',on);}); document.body.dataset.initialScreen=screen;}
    if(driverTab){document.querySelectorAll('[data-driver-panel]').forEach(b=>b.classList.toggle('active',b.dataset.driverPanel===driverTab)); document.querySelectorAll('[data-driver-content]').forEach(p=>{const on=p.dataset.driverContent===driverTab; p.hidden=!on; p.classList.toggle('active',on);}); document.body.dataset.initialDriverTab=driverTab;}
    if(label){const h=document.querySelector('#screenTitle'); const s=document.querySelector('#screenEyebrow'); if(h)h.textContent=label; if(s)s.textContent='Painel Operador'; document.title=label+' | Painel Operador';}
    if(focus){setTimeout(()=>{const el=document.querySelector(focus); if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},350);}
  }
  function screenFromGestor(){const m=manager.find(x=>x.href===file()); return queryValue('screen')||document.body?.dataset.managerScreen||m?.screen||'dashboard';}
  function showManager(){if(!/gestao/.test(location.pathname))return; const screen=screenFromGestor(); document.body.dataset.managerScreen=screen; const selectors=managerViews[screen]||managerViews.dashboard; const sections=[...document.querySelectorAll('main.main-dashboard > section')]; const articles=[...document.querySelectorAll('main.main-dashboard > section.manager-content > article')]; sections.forEach(s=>{s.hidden=true; s.classList.remove('active','manager-visible');}); articles.forEach(a=>{a.hidden=true; a.classList.remove('active');}); selectors.forEach(sel=>{const el=document.querySelector(sel); if(!el)return; const parent=el.closest('main.main-dashboard > section'); if(parent){parent.hidden=false; parent.classList.add('active','manager-visible');} el.hidden=false; el.classList.add('active');}); const t=managerTitles[screen]||managerTitles.dashboard; const h=document.querySelector('#managerScreenTitle')||document.querySelector('.top-title h1'); const e=document.querySelector('#managerScreenEyebrow')||document.querySelector('.top-title span'); if(h)h.textContent=t[0]; if(e)e.textContent=t[1]; document.title=t[0]+' | Painel Gestor';}
  function closeMenu(){document.body.classList.remove('operator-menu-open','manager-menu-open');}
  function bind(){const btn=document.querySelector('.menu-button'); const side=document.querySelector('.side-nav'); if(btn&&!btn.dataset.h525){btn.dataset.h525='1'; btn.addEventListener('click',ev=>{ev.preventDefault(); ev.stopImmediatePropagation(); const shell=document.querySelector('.dashboard-shell'); const isManager=shell?.classList.contains('manager-app')||/gestao/.test(location.pathname); const open=document.body.classList.contains('operator-menu-open')||document.body.classList.contains('manager-menu-open'); closeMenu(); if(!open)document.body.classList.add(isManager?'manager-menu-open':'operator-menu-open');},true);} document.addEventListener('click',ev=>{if(!document.body.classList.contains('operator-menu-open')&&!document.body.classList.contains('manager-menu-open'))return; if(side?.contains(ev.target)||btn?.contains(ev.target))return; closeMenu();},true); document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeMenu();},true); document.querySelectorAll('[data-logout]').forEach(a=>{if(a.dataset.h525)return; a.dataset.h525='1'; a.addEventListener('click',ev=>{ev.preventDefault(); try{sessionStorage.removeItem('painel-logistico-auth');localStorage.removeItem('painel-logistico-auth');}catch(_){} if(window.clearAuthSession)window.clearAuthSession(); location.href=window.appUrl?window.appUrl('/'):'/';},true);});}
  function theme(){
    const saved=localStorage.getItem('painel-logistico-theme')||document.body?.dataset.theme||document.documentElement.dataset.theme||'light';
    const normalized=saved==='dark'?'dark':'light';
    if(window.setPainelTheme){
      const current=document.body?.dataset.theme||document.documentElement.dataset.theme;
      if(current!==normalized) window.setPainelTheme(normalized,{instant:true});
      return;
    }
    document.documentElement.dataset.theme=normalized;
    if(document.body)document.body.dataset.theme=normalized;
    document.documentElement.classList.toggle('theme-dark',normalized==='dark');
    document.documentElement.classList.toggle('theme-light',normalized!=='dark');
    document.body?.classList.toggle('theme-dark',normalized==='dark');
    document.body?.classList.toggle('theme-light',normalized!=='dark');
  }
  function init(){ensureH530Assets();theme();buildMenu();showManager();showOperator();bind();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true}); else init(); window.addEventListener('load',init,{once:true});
})();


(function () {
  window.App = window.App || {};
  window.App.Menu = Object.assign(window.App.Menu || {}, { ready: true });
})();
