(function(){
  'use strict';
  var App = window.App = window.App || {};
  var deferredPrompt = null;
  function publicPath(file){
    var loader = App.loader;
    if (loader && loader.publicUrl) return loader.publicUrl(file).replace(/\?v=.*/, '');
    return file;
  }
  function setOnline(){ document.body.classList.toggle('is-offline', !navigator.onLine); }
  function ensureBadge(){ if(document.querySelector('.pwa-offline-badge')) return; var b=document.createElement('div'); b.className='pwa-offline-badge'; b.textContent='Offline: ações serão sincronizadas depois'; document.body.appendChild(b); }
  function installButton(){
    if(document.querySelector('.pwa-install-button')) return;
    var btn=document.createElement('button'); btn.type='button'; btn.className='pwa-install-button'; btn.hidden=true; btn.textContent='Instalar app'; btn.dataset.noPrint='1';
    btn.addEventListener('click', async function(){ if(!deferredPrompt) return; deferredPrompt.prompt(); try{await deferredPrompt.userChoice;}catch(_){} deferredPrompt=null; btn.hidden=true; });
    document.body.appendChild(btn);
  }
  function registerSW(){
    if(!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    var sw = publicPath('sw.js');
    navigator.serviceWorker.register(sw).catch(function(error){ console.warn('Service worker não registrado:', error.message); });
  }
  async function pushSubscribe(){
    if(!('Notification' in window) || !navigator.serviceWorker || !App.Http) return null;
    var config = {};
    try { config = await App.Http.request('/pwa/config', { method:'GET', skipAuth:true }); } catch(_) {}
    if(!config || !config.webPushPublicKey) return null;
    if(Notification.permission === 'default') await Notification.requestPermission();
    if(Notification.permission !== 'granted') return null;
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:urlB64ToUint8(config.webPushPublicKey) });
    await App.Http.request('/notifications/subscribe', { method:'POST', body: sub.toJSON ? sub.toJSON() : sub });
    return sub;
  }
  function urlB64ToUint8(base64){ var pad='='.repeat((4-base64.length%4)%4); var b64=(base64+pad).replace(/-/g,'+').replace(/_/g,'/'); var raw=atob(b64); var arr=new Uint8Array(raw.length); for(var i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i); return arr; }
  function boot(){ ensureBadge(); installButton(); setOnline(); registerSW(); }
  window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); deferredPrompt=e; var btn=document.querySelector('.pwa-install-button'); if(btn) btn.hidden=false; });
  window.addEventListener('online', setOnline); window.addEventListener('offline', setOnline);
  window.addEventListener('app:ready', boot);
  App.PWA = { subscribe:pushSubscribe, register:registerSW };
})();
