(function () {
  const summary = document.getElementById('summary');
  const rows = document.getElementById('rows');
  const retry = document.getElementById('retry');

  function esc(value) {
    if (window.App?.Sanitize?.escapeHtml) return window.App.Sanitize.escapeHtml(value);
    return String(value ?? '').replace(/[&<>"'`]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;', '`': '&#096;' }[char]));
  }

  function card(label, value) {
    return `<article class="card"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></article>`;
  }

  async function readJson(response) {
    const text = await response.text();
    let body = {};
    if (text) {
      try { body = JSON.parse(text); } catch (_) { throw new Error('Resposta invalida do servidor.'); }
    }
    if (!response.ok || body.ok === false) throw new Error(body.error || body.message || `HTTP ${response.status}`);
    return body.data || body;
  }

  async function loadSync() {
    const fetcher = window.authFetch || window.fetch;
    const response = await fetcher(window.apiUrl ? window.apiUrl('/sync/painel') : '/api/sync/painel', { headers: { Accept: 'application/json' } });
    const data = await readJson(response);
    summary.innerHTML = [
      card('Pendentes', data.pendentes || 0),
      card('Erros', data.erros || 0),
      card('Enviando', data.enviando || 0),
      card('Confirmados', data.confirmados || 0)
    ].join('');
    const events = [...(data.eventosErro || []), ...(data.eventosPendentes || [])];
    rows.innerHTML = events.length ? events.map((item) => `
      <tr>
        <td>${esc(item.tipo || '-')}</td>
        <td>${esc(item.status || '-')}</td>
        <td>${esc(item.viagem_id || '-')}</td>
        <td>${esc(item.created_at || '-')}</td>
      </tr>
    `).join('') : '<tr><td colspan="4">Nenhum evento pendente ou com erro.</td></tr>';
  }

  retry?.addEventListener('click', async () => {
    const fetcher = window.authFetch || window.fetch;
    const response = await fetcher(window.apiUrl ? window.apiUrl('/sync/reenvio') : '/api/sync/reenvio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({})
    });
    await readJson(response);
    await loadSync();
  });

  loadSync().catch((error) => {
    rows.innerHTML = `<tr><td colspan="4">${esc(error.message)}</td></tr>`;
  });
})();
