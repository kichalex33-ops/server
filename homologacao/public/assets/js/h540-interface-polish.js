(function(){
  'use strict';
  const VERSION = 'h540';
  const CSS_FILE = 'h540-interface-agatho-icons.css';

  function asset(path){
    if (window.assetUrl) return window.assetUrl(path + '?v=' + VERSION);
    return path + '?v=' + VERSION;
  }

  function ensureCss(){
    let link = document.querySelector('link[data-h540-interface="1"], link[href*="' + CSS_FILE + '"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.h540Interface = '1';
    }
    link.href = asset('assets/css/' + CSS_FILE);
    document.head.appendChild(link);
  }

  function normalizeSvgs(){
    document.querySelectorAll('.nav-icon svg, .kpi-icon svg, .kpi-symbol svg, .icon-button svg, .theme-button svg, .filter-button svg, .topbar svg, .menu-button svg').forEach((svg) => {
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('stroke-width', '1.55');
      svg.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
    });
  }

  function boot(){
    ensureCss();
    normalizeSvgs();
    setTimeout(normalizeSvgs, 250);
    setTimeout(normalizeSvgs, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  if ('MutationObserver' in window) {
    const obs = new MutationObserver(() => window.requestAnimationFrame(normalizeSvgs));
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.addEventListener('load', boot, { once: true });
})();
