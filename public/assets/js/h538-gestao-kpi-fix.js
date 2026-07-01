(function(){
  'use strict';
  const VERSION = 'h539';
  const CSS_FILE = 'h539-gestao-final.css';
  function asset(path){
    if (window.assetUrl) return window.assetUrl(path + '?v=' + VERSION);
    return path + '?v=' + VERSION;
  }
  function ensureCss(){
    let link = document.querySelector('link[data-h539-gestao="1"], link[href*="' + CSS_FILE + '"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.h539Gestao = '1';
    }
    link.href = asset('assets/css/' + CSS_FILE);
    document.head.appendChild(link);
  }
  function hardenCards(){
    document.querySelectorAll('.dashboard-shell.manager-app #dashboard.manager-grid > article.kpi-card').forEach((card) => {
      card.classList.add('manager-kpi-card-h539');
      const content = card.querySelector(':scope > div:first-child');
      const icon = card.querySelector(':scope > .kpi-icon');
      if (content) {
        content.classList.add('manager-kpi-content-h539');
        const title = content.querySelector(':scope > span');
        const value = content.querySelector(':scope > strong');
        const note = content.querySelector(':scope > small');
        if (title) title.classList.add('manager-kpi-title-h539');
        if (value) value.classList.add('manager-kpi-value-h539');
        if (note) note.classList.add('manager-kpi-note-h539');
      }
      if (icon) icon.classList.add('manager-kpi-icon-h539');
    });
  }
  function boot(){
    ensureCss();
    hardenCards();
    setTimeout(hardenCards, 250);
    setTimeout(hardenCards, 900);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
  window.addEventListener('load', boot, {once:true});
})();
