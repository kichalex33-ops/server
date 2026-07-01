(function(){
  'use strict';
  var App = window.App = window.App || {};
  var KEY='logisaude_preferences_v1';
  var defaults={theme:'auto',font:'normal',contrast:false,operatorTabs:['trips','monitoring','registrations','ai','drivers'],defaultFilter:'hoje'};
  function read(){try{return Object.assign({},defaults,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){return Object.assign({},defaults);}}
  function save(prefs){var next=Object.assign({},read(),prefs||{});try{localStorage.setItem(KEY,JSON.stringify(next));}catch(_){} apply(next); if(App.Http) App.Http.request('/users/preferences',{method:'PUT',body:{preferences:next}}).catch(function(){}); return next;}
  function apply(p){p=p||read(); document.body.classList.toggle('font-large',p.font==='large'); document.body.classList.toggle('font-xlarge',p.font==='xlarge'); document.documentElement.dataset.theme=p.contrast?'alto-contraste':(p.theme==='dark'?'dark':(p.theme==='light'?'light':(document.documentElement.dataset.theme||''))); if(p.contrast) document.body.classList.add('theme-high-contrast'); else document.body.classList.remove('theme-high-contrast');}
  function panel(){ if(document.querySelector('.h547-preferences-panel')) return document.querySelector('.h547-preferences-panel'); var el=document.createElement('section'); el.className='h547-preferences-panel'; el.dataset.noPrint='1'; el.innerHTML='<h3>Preferências</h3><label>Tema<select data-pref="theme"><option value="auto">Automático</option><option value="light">Claro</option><option value="dark">Escuro</option></select></label><label>Fonte<select data-pref="font"><option value="normal">Normal</option><option value="large">Maior</option><option value="xlarge">Extra grande</option></select></label><label><input type="checkbox" data-pref="contrast"> Alto contraste</label>'; document.body.appendChild(el); el.addEventListener('change',function(){var p=read(); p.theme=el.querySelector('[data-pref="theme"]').value; p.font=el.querySelector('[data-pref="font"]').value; p.contrast=el.querySelector('[data-pref="contrast"]').checked; save(p);}); return el;}
  function toggle(){var el=panel(); var prefs=read(); el.querySelector('[data-pref="theme"]').value=prefs.theme; el.querySelector('[data-pref="font"]').value=prefs.font; el.querySelector('[data-pref="contrast"]').checked=!!prefs.contrast; el.classList.toggle('is-open');}
  function boot(){ apply(read()); document.addEventListener('keydown',function(e){ if((e.altKey||e.ctrlKey)&&String(e.key).toLowerCase()==='p'){ e.preventDefault(); toggle(); }}); }
  window.addEventListener('app:ready', boot);
  App.Preferences={read:read,save:save,apply:apply,toggle:toggle};
})();
