
(function(){
  'use strict';
  const VERSION = 'h536';
  const CSS_FILE = 'h536-contraste-tema-unificado.css';
  const TRANSITION_CSS_FILE = 'h537-transicao-tema-suave.css';
  const INTERFACE_CSS_FILE = 'h540-interface-agatho-icons.css';

  function asset(path){
    if (window.assetUrl) return window.assetUrl(path + '?v=' + VERSION);
    return path + '?v=' + VERSION;
  }

  function ensureCss(){
    let link = document.querySelector('link[data-h536-visual="1"], link[href*="' + CSS_FILE + '"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.h536Visual = '1';
    }
    link.href = asset('assets/css/' + CSS_FILE);
    document.head.appendChild(link);

    let transitionLink = document.querySelector('link[data-h537-transition="1"], link[href*="' + TRANSITION_CSS_FILE + '"]');
    if (!transitionLink) {
      transitionLink = document.createElement('link');
      transitionLink.rel = 'stylesheet';
      transitionLink.dataset.h537Transition = '1';
    }
    transitionLink.href = asset('assets/css/' + TRANSITION_CSS_FILE);
    document.head.appendChild(transitionLink);

    if (/\/gestao(?:-|\.html|\/|$)/.test(location.pathname) || document.querySelector('.manager-app, #managerScreenTitle, #gestaoResumoOperacional')) {
      let gestorLink = document.querySelector('link[data-h538-gestao="1"], link[href*="h538-gestao-kpi-fix.css"]');
      if (!gestorLink) {
        gestorLink = document.createElement('link');
        gestorLink.rel = 'stylesheet';
        gestorLink.dataset.h538Gestao = '1';
      }
      gestorLink.href = asset('assets/css/h538-gestao-kpi-fix.css?v=h538');
      document.head.appendChild(gestorLink);

      if (![...document.scripts].some((s) => (s.getAttribute('src') || '').includes('h538-gestao-kpi-fix.js'))) {
        const gestorScript = document.createElement('script');
        gestorScript.src = asset('assets/js/h538-gestao-kpi-fix.js?v=h538');
        gestorScript.defer = true;
        document.body.appendChild(gestorScript);
      }
    }
  }

  function parseColor(value){
    const text = String(value || '');
    const m = text.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
    if (!m) return null;
    const a = m[4] === undefined ? 1 : Number(m[4]);
    if (!Number.isFinite(a) || a === 0) return null;
    return {r:Number(m[1]), g:Number(m[2]), b:Number(m[3]), a};
  }

  function brightness(color){
    return ((color.r * 299) + (color.g * 587) + (color.b * 114)) / 1000;
  }

  function skip(el){
    return !el || el.closest('button.primary-button, .primary-button, .primary-action, .panic-button, .nav-logout, .menu-button');
  }

  function candidates(){
    return document.querySelectorAll([
      '.main-dashboard','.main-content','.manager-content','.operator-content','.dashboard-shell','.panel','.card','.metric-card','.kpi-card',
      '.overview-card','.summary-card','.filter-card','.search-box','.clock-panel','.table-wrap','.data-table','.white-card','.light-card','.card-light',
      '.panel-light','.h534-card-light','.h534-table-wrap','.profile-pill','.system-online','.theme-button','.theme-toggle','.icon-button','.filter-button',
      '.security-panel','.lgpd-panel','.dropdown-menu','.toast','.toast-card','.floating-ai-messages','.floating-ai-form','.leaflet-popup-content-wrapper',
      '.leaflet-popup-tip','.side-nav','.sidebar','.nav-section','.side-brand','.sync-box','.institution-strip','.app-shell','.app-header','.app-footer',
      '.driver-hero','.mini-card','.messages-card','[class*="card"]','[class*="panel"]','[class*="table"]','[class*="nav"]','[style*="background"]'
    ].join(','));
  }

  let classifyQueued = false;

  function classify(){
    candidates().forEach((el) => {
      if (skip(el)) return;
      const style = getComputedStyle(el);
      const bg = parseColor(style.backgroundColor);
      let target = '';
      if (bg) {
        const b = brightness(bg);
        if (b >= 220) target = 'light';
        else if (b <= 105) target = 'dark';
      }
      const isLight = el.classList.contains('h536-light-surface');
      const isDark = el.classList.contains('h536-dark-surface');
      if (target === 'light') {
        if (!isLight) el.classList.add('h536-light-surface');
        if (isDark) el.classList.remove('h536-dark-surface');
      } else if (target === 'dark') {
        if (!isDark) el.classList.add('h536-dark-surface');
        if (isLight) el.classList.remove('h536-light-surface');
      } else {
        if (isLight) el.classList.remove('h536-light-surface');
        if (isDark) el.classList.remove('h536-dark-surface');
      }
    });
  }

  function queueClassify(){
    if (classifyQueued) return;
    classifyQueued = true;
    window.requestAnimationFrame(function(){
      classifyQueued = false;
      classify();
    });
  }

  function boot(){
    ensureCss();
    classify();
    setTimeout(classify, 250);
    setTimeout(classify, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  } else {
    boot();
  }

  window.addEventListener('painel-theme-change', function(){
    ensureCss();
    queueClassify();
    setTimeout(classify, 120);
  });

  window.addEventListener('load', function(){
    ensureCss();
    classify();
  }, {once:true});

  if ('MutationObserver' in window) {
    const obs = new MutationObserver(queueClassify);
    obs.observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['style','data-theme']});
  }
})();
