
(function(){
  const api = (path) => window.apiUrl ? window.apiUrl(path) : `${(window.PAINEL_API_ROOT || '/api').replace(/\/$/, '')}${path}`;
  const get = async (path) => {
    if (!window.authFetch) return {};
    const response = await window.authFetch(api(path), { headers: { Accept: 'application/json' }});
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok !== true) throw new Error(body.error || `Falha em ${path}`);
    return body.data || {};
  };
  const post = async (path, payload) => {
    const response = await window.authFetch(api(path), { method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json'}, body: JSON.stringify(payload || {}) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok !== true) throw new Error(body.error || `Falha em ${path}`);
    return body.data || {};
  };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const dt = (v) => { if(!v) return '--'; const d = new Date(v); return Number.isNaN(d.getTime()) ? esc(v) : d.toLocaleString('pt-BR'); };
  const statusCnh = (s) => {
    const v = String(s || '').toUpperCase();
    if (v.includes('VENCIDA')) return 'h534-status-danger';
    if (v.includes('30') || v.includes('SEM')) return 'h534-status-warn';
    return 'h534-status-ok';
  };

  async function loadSecurity(){
    const root = document.querySelector('#h534SecurityPanel');
    if (!root) return;
    try {
      const data = await get('/seguranca/login-attempts');
      const resumo = data.resumo || {};
      const tentativas = data.tentativas || [];
      const bloqueios = data.bloqueios || [];
      document.querySelector('#h534Failed15') && (document.querySelector('#h534Failed15').textContent = resumo.falhas_15min ?? 0);
      document.querySelector('#h534BlockedNow') && (document.querySelector('#h534BlockedNow').textContent = resumo.bloqueios_ativos ?? 0);
      document.querySelector('#h534LoginPolicy') && (document.querySelector('#h534LoginPolicy').textContent = resumo.politica || '5 falhas por login/IP em 15 minutos');
      const tbody = document.querySelector('#h534LoginAttemptsTable');
      if (tbody) tbody.innerHTML = tentativas.slice(0,50).map(item => `<tr><td>${esc(item.ip)}</td><td>${item.succeeded ? '<span class="h534-status-ok">sucesso</span>' : '<span class="h534-status-danger">falha</span>'}</td><td>${esc(String(item.login_key || '').slice(0,12))}...</td><td>${dt(item.criado_em)}</td></tr>`).join('') || '<tr><td colspan="4">Sem tentativas recentes.</td></tr>';
      const block = document.querySelector('#h534BlockedList');
      if (block) block.innerHTML = bloqueios.map(item => `<tr><td>${esc(item.ip)}</td><td>${esc(item.falhas)}</td><td>${dt(item.ultima_tentativa)}</td></tr>`).join('') || '<tr><td colspan="3">Nenhum bloqueio ativo.</td></tr>';
    } catch (e) {
      root.insertAdjacentHTML('beforeend', `<p class="h534-status-danger">${esc(e.message)}</p>`);
    }
  }

  async function loadLgpd(){
    const root = document.querySelector('#h534LgpdPanel');
    if (!root) return;
    try {
      const data = await get('/lgpd');
      const consents = data.consentimentos || [];
      const requests = data.solicitacoes || [];
      const accesses = data.acessosDadosPessoais || [];
      const c = document.querySelector('#h534LgpdConsents');
      if (c) c.innerHTML = consents.slice(0,50).map(item => `<tr><td>${esc(item.titular_tipo)}</td><td>${esc(item.titular_id)}</td><td>${esc(item.finalidade)}</td><td>${item.consentido ? '<span class="h534-status-ok">sim</span>' : '<span class="h534-status-danger">não</span>'}</td><td>${dt(item.registrado_em)}</td></tr>`).join('') || '<tr><td colspan="5">Sem consentimentos registrados.</td></tr>';
      const r = document.querySelector('#h534LgpdRequests');
      if (r) r.innerHTML = requests.slice(0,50).map(item => `<tr><td>${esc(item.titular_tipo)}</td><td>${esc(item.titular_id)}</td><td>${esc(item.tipo)}</td><td>${esc(item.status)}</td><td>${dt(item.criado_em)}</td></tr>`).join('') || '<tr><td colspan="5">Sem solicitações LGPD.</td></tr>';
      const a = document.querySelector('#h534DataAccess');
      if (a) a.innerHTML = accesses.slice(0,30).map(item => `<tr><td>${esc(item.usuario_id || item.usuario || '--')}</td><td>${esc(item.entidade || item.recurso || '--')}</td><td>${esc(item.entidade_id || '--')}</td><td>${dt(item.criado_em || item.acessado_em)}</td></tr>`).join('') || '<tr><td colspan="4">Sem logs de acesso a dados.</td></tr>';
    } catch (e) {
      root.insertAdjacentHTML('beforeend', `<p class="h534-status-danger">${esc(e.message)}</p>`);
    }
  }

  function bindLgpdForms(){
    const consent = document.querySelector('#h534ConsentForm');
    if (consent && !consent.dataset.bound) {
      consent.dataset.bound = '1';
      consent.addEventListener('submit', async ev => {
        ev.preventDefault();
        const payload = Object.fromEntries(new FormData(consent).entries());
        payload.consentido = !!payload.consentido;
        await post('/lgpd/consents', payload);
        consent.reset();
        await loadLgpd();
      });
    }
    const request = document.querySelector('#h534PrivacyRequestForm');
    if (request && !request.dataset.bound) {
      request.dataset.bound = '1';
      request.addEventListener('submit', async ev => {
        ev.preventDefault();
        const payload = Object.fromEntries(new FormData(request).entries());
        await post('/lgpd/anonymization-requests', payload);
        request.reset();
        await loadLgpd();
      });
    }
    const backup = document.querySelector('#h534RunBackup');
    if (backup && !backup.dataset.bound) {
      backup.dataset.bound = '1';
      backup.addEventListener('click', async () => {
        if (!confirm('Executar backup agora? Em bases grandes isso pode demorar.')) return;
        backup.textContent = 'Executando...';
        try {
          const result = await post('/infra/backup', {});
          alert(`Backup criado: ${result.arquivo || 'arquivo gerado'}`);
        } catch(e) { alert(e.message); }
        finally { backup.textContent = 'Executar backup agora'; }
      });
    }
  }

  function enhanceOperatorButtons(){
    document.addEventListener('click', async (event) => {
      const cancel = event.target.closest('[data-trip-cancel-id]');
      if (cancel) {
        const id = cancel.dataset.tripCancelId;
        const motivo = prompt('Motivo do cancelamento da viagem:');
        if (!motivo) return;
        await post(`/viagens/${encodeURIComponent(id)}/cancelar`, { motivo });
        if (window.refreshOperatorData) window.refreshOperatorData(); else location.reload();
      }
    });
  }

  function init(){
    bindLgpdForms();
    loadSecurity();
    loadLgpd();
    enhanceOperatorButtons();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
