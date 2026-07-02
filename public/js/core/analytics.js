(function(){
  'use strict';
  var App=window.App=window.App||{}; var queue=[]; var start=Date.now();
  function hasSession(){try{return !!((JSON.parse(sessionStorage.getItem('painel-logistico-auth')||'null')||{}).accessToken);}catch(_){return false;}}
  function track(name,props){queue.push({event:name,props:props||{},path:location.pathname,at:new Date().toISOString()}); if(queue.length>=8) flush();}
  function flush(){ if(!queue.length||!App.Http||!navigator.onLine||!hasSession()) return; var batch=queue.splice(0,20); App.Http.request('/analytics/events',{method:'POST',body:{events:batch},skipToast:true}).catch(function(){queue=batch.concat(queue).slice(-100);}); }
  document.addEventListener('click',function(e){var b=e.target.closest('button,a,[data-screen],[data-h546-action]'); if(!b) return; track('click',{text:(b.textContent||b.getAttribute('aria-label')||'').trim().slice(0,80),screen:b.dataset.screen||'',action:b.dataset.h546Action||'',href:b.getAttribute('href')||''});},true);
  window.addEventListener('beforeunload',function(){track('tempo_tela',{seconds:Math.round((Date.now()-start)/1000)});});
  window.addEventListener('app:ready',function(){track('page_view',{page:location.pathname}); setInterval(flush,30000);});
  App.Analytics={track:track,flush:flush};
})();
