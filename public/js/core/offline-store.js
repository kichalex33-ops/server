(function(){
  'use strict';
  var App = window.App = window.App || {};
  var KEY = 'logisaude_offline_queue_v1';
  var processing = false;
  function read(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')||[];}catch(_){return [];} }
  function writeQueue(q){ try{localStorage.setItem(KEY, JSON.stringify(q.slice(-200)));}catch(_){} }
  function shouldQueue(path, options){
    var method = String((options && options.method) || 'GET').toUpperCase();
    if (['POST','PUT','PATCH','DELETE'].indexOf(method) === -1) return false;
    if (/auth\//i.test(path) || /analytics\/events/i.test(path)) return false;
    return !navigator.onLine;
  }
  function enqueue(path, options){
    var body = options && options.body;
    var item = { id:'q-'+Date.now()+'-'+Math.random().toString(36).slice(2), path:path, method:(options.method||'POST'), body:body, queuedAt:new Date().toISOString() };
    var q = read(); q.push(item); writeQueue(q);
    try{ if(navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function(reg){ if(reg.sync) reg.sync.register('logisaude-sync').catch(function(){}); }); }catch(_){}
    window.dispatchEvent(new CustomEvent('app:offline-queued',{detail:item}));
    if (App.UI && App.UI.toast) App.UI.toast('Sem internet. Ação guardada para sincronizar depois.', 'warning', 5200);
    return Promise.resolve({ queued:true, offline:true, item:item });
  }
  async function flush(){
    if (processing || !navigator.onLine || !App.Http || !App.Http.__rawRequest) return {sent:0};
    processing = true;
    var q = read(), sent = 0, remaining = [];
    for (var i=0;i<q.length;i++){
      var item = q[i];
      try { await App.Http.__rawRequest(item.path,{method:item.method,body:item.body}); sent++; }
      catch(error){ remaining.push(item); }
    }
    writeQueue(remaining); processing=false;
    if(sent && App.UI && App.UI.toast) App.UI.toast(sent+' ação(ões) sincronizada(s).','success');
    window.dispatchEvent(new CustomEvent('app:offline-flush',{detail:{sent:sent,remaining:remaining.length}}));
    return {sent:sent, remaining:remaining.length};
  }
  function wrapHttp(){
    if (!App.Http || App.Http.__offlineWrapped || !App.Http.request) return;
    App.Http.__rawRequest = App.Http.request;
    App.Http.request = function(path, options){ if(shouldQueue(String(path||''), options||{})) return enqueue(path, options||{}); return App.Http.__rawRequest(path, options||{}); };
    App.Http.safeFetch = App.Http.request;
    App.Http.__offlineWrapped = true;
  }
  window.addEventListener('online', flush);
  window.addEventListener('app:ready', function(){wrapHttp(); flush();});
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', function(event){ if(event.data && event.data.type === 'LOGISAUDE_SYNC_REQUEST') flush(); });
  App.Offline = { enqueue:enqueue, flush:flush, pending:function(){return read();}, clear:function(){writeQueue([]);} };
})();
