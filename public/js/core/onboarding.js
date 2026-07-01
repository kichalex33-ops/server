(function(){
  'use strict';
  var App=window.App=window.App||{}; var KEY='logisaude_tour_h547_done';
  function show(steps){var i=0; function render(){var s=steps[i]; var ov=document.querySelector('.h547-tour-overlay')||document.createElement('div'); ov.className='h547-tour-overlay'; ov.innerHTML='<div class="h547-tour-card" role="dialog" aria-modal="true"><h3></h3><p></p><div class="actions"><button type="button" data-skip>Pular</button><button type="button" class="primary" data-next>Próximo</button></div></div>'; document.body.appendChild(ov); ov.querySelector('h3').textContent=s.title; ov.querySelector('p').textContent=s.text; ov.querySelector('[data-skip]').onclick=finish; ov.querySelector('[data-next]').onclick=function(){i++; if(i>=steps.length) finish(); else render();};} function finish(){try{localStorage.setItem(KEY,'1');}catch(_){} var el=document.querySelector('.h547-tour-overlay'); if(el) el.remove();} render();}
  function boot(){ if(localStorage.getItem(KEY)==='1') return; var ctx=window.__APP_CONTEXT__||{}; if(!ctx.isOperador) return; show([{title:'Painel por abas',text:'Use as abas para ficar só na tarefa atual, sem rolar a página inteira.'},{title:'Viagens agendadas',text:'Filtre por hoje, semana, pendentes ou canceladas. A lista é a fonte principal.'},{title:'Detalhe lateral',text:'Clique em uma viagem para editar, comentar, imprimir ou assinar sem perder a lista.'}]); }
  window.addEventListener('app:ready',function(){setTimeout(boot,1200);});
  App.Onboarding={start:function(){show([{title:'LogiSaúde',text:'Tour rápido iniciado.'}]);}};
})();
