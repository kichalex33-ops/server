const modulos = [
  ['dashboard', 'Dashboard', '/api/painel/dashboard'],
  ['pes', 'PEs', '/api/painel/pes'],
  ['visitas', 'Visitas', '/api/painel/visitas'],
  ['bti', 'BTI', '/api/painel/bti'],
  ['ovitrampas', 'Ovitrampas', '/api/painel/ovitrampas'],
  ['tubitos', 'Tubitos', '/api/painel/tubitos'],
  ['quarteiroes', 'Quarteiroes', '/api/painel/quarteiroes'],
  ['imoveis', 'Imoveis', '/api/painel/imoveis'],
  ['fotos', 'Fotos', '/api/painel/fotos'],
  ['sync-logs', 'Sync logs', '/api/painel/sync-logs'],
  ['mapa', 'Mapa', '/api/painel/mapa'],
];

let moduloAtual = location.pathname.split('/').filter(Boolean)[1] || 'dashboard';
let ultimoDataset = [];

function navegar(modulo) {
  moduloAtual = modulo;
  history.pushState(null, '', modulo === 'dashboard' ? '/painel' : `/painel/${modulo}`);
  carregar();
}

function montarNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = modulos.map(([id, nome]) => `
    <button class="${id === moduloAtual ? 'active' : ''}" data-nav="${id}">${nome}</button>
  `).join('');
}

function filtrosQuery() {
  const params = new URLSearchParams();
  for (const id of ['municipio', 'ace', 'data', 'status', 'busca']) {
    const el = document.getElementById(id);
    if (el && el.value.trim()) params.set(id, el.value.trim());
  }
  return params.toString();
}

function renderFiltros() {
  document.getElementById('filters').innerHTML = moduloAtual === 'dashboard' ? '' : `
    <input id="municipio" placeholder="Municipio" data-filter="debounced">
    <input id="ace" placeholder="ACE" data-filter="debounced">
    <input id="data" type="date" data-filter="immediate">
    <input id="status" placeholder="Status" data-filter="debounced">
    <input id="busca" placeholder="Busca geral" data-filter="debounced">
  `;
}

let timer;
function debouncedCarregar() {
  clearTimeout(timer);
  timer = setTimeout(carregar, 350);
}

function badge(status) {
  const s = String(status || 'sem status');
  let cls = 'badge';
  const lower = s.toLowerCase();
  if (lower.includes('dia') || lower.includes('synced') || lower.includes('concluido')) cls += ' green';
  else if (lower.includes('venc') || lower.includes('pending') || lower.includes('andamento')) cls += ' yellow';
  else if (lower.includes('atras') || lower.includes('failed') || lower.includes('critico') || lower.includes('foco')) cls += ' red';
  else if (lower.includes('conflict')) cls += ' purple';
  else cls += ' gray';
  return `<span class="${cls}">${s}</span>`;
}

function valor(item, ...campos) {
  for (const campo of campos) if (item[campo] !== undefined && item[campo] !== null && item[campo] !== '') return item[campo];
  return '-';
}

function renderDashboard(data) {
  document.getElementById('cards').innerHTML = [
    ['PEs', data.totalPEs],
    ['Visitas PE', data.visitasPE],
    ['Domiciliares', data.visitasDomiciliares],
    ['BTI', data.aplicacoesBTI],
    ['Ovitrampas', data.ovitrampasCadastradas],
    ['Focos', data.focosPositivos],
    ['Quarteiroes', data.quarteiroes],
    ['Imoveis', data.imoveis],
  ].map(([label, value]) => `<div class="card"><div class="label">${label}</div><div class="value">${value || 0}</div></div>`).join('');
  document.getElementById('content').innerHTML = `
    <div class="card">
      <h2>Resumo territorial</h2>
      <p>Use o menu lateral para consultar listas, filtros, fotos, logs e mapa operacional. Este painel nao edita dados.</p>
    </div>
  `;
}

function renderTabela(payload) {
  const rows = Array.isArray(payload) ? payload : (payload.data || []);
  ultimoDataset = rows;
  document.getElementById('cards').innerHTML = `
    <div class="card"><div class="label">Registros filtrados</div><div class="value">${payload.total ?? rows.length}</div></div>
  `;
  document.getElementById('content').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Tipo/Nome</th><th>Municipio</th><th>ACE</th><th>Data</th><th>Status</th><th>Foto</th><th></th></tr></thead>
        <tbody>${rows.map((item, idx) => `
          <tr>
            <td>${valor(item, 'id')}</td>
            <td><strong>${valor(item, 'nome', 'codigo', 'tipo', 'endereco')}</strong></td>
            <td>${valor(item, 'municipio', 'municipio_id')}</td>
            <td>${valor(item, 'ace_responsavel', 'agente', 'ace_id')}</td>
            <td>${valor(item, 'data', 'data_visita', 'created_at', 'sincronizado_em')}</td>
            <td>${badge(valor(item, 'status', 'sync_status', 'situacao', 'resultado'))}</td>
            <td>${item.foto_path ? 'Sim' : '-'}</td>
            <td><button class="button ghost" data-detail="${idx}">Ver detalhes</button></td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>`;
}

function renderMapa(payload) {
  const all = Object.values(payload).flat();
  ultimoDataset = all;
  document.getElementById('cards').innerHTML = `<div class="card"><div class="label">Itens no mapa</div><div class="value">${all.length}</div></div>`;
  const pins = all.filter((item) => item.latitude && item.longitude).slice(0, 120).map((item, idx) => {
    const x = 8 + (Math.abs(Number(item.longitude)) * 37 % 84);
    const y = 8 + (Math.abs(Number(item.latitude)) * 41 % 84);
    return `<button class="pin" title="${valor(item, 'nome', 'codigo', 'tipo')}" style="left:${x}%;top:${y}%" data-detail="${idx}"></button>`;
  }).join('');
  document.getElementById('content').innerHTML = `<div class="mapbox">${pins}</div>`;
}

function detalhes(idx) {
  document.getElementById('modalJson').textContent = JSON.stringify(ultimoDataset[idx], null, 2);
  document.getElementById('modal').classList.add('open');
}

function fecharModal() {
  document.getElementById('modal').classList.remove('open');
}

async function carregar() {
  montarNav();
  renderFiltros();
  const modulo = modulos.find(([id]) => id === moduloAtual) || modulos[0];
  document.getElementById('titulo').textContent = modulo[1];
  const query = filtrosQuery();
  const url = `${modulo[2]}${query ? `?${query}` : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (moduloAtual === 'dashboard') renderDashboard(data);
  else if (moduloAtual === 'mapa') renderMapa(data);
  else renderTabela(data);
}

window.addEventListener('popstate', () => {
  moduloAtual = location.pathname.split('/').filter(Boolean)[1] || 'dashboard';
  carregar();
});

carregar();


document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) { navegar(nav.dataset.nav); return; }
  const detail = event.target.closest('[data-detail]');
  if (detail) { detalhes(Number(detail.dataset.detail)); return; }
  const action = event.target.closest('[data-action]');
  if (!action) return;
  if (action.dataset.action === 'refresh') carregar();
  if (action.dataset.action === 'close-modal') fecharModal();
});

document.addEventListener('input', (event) => {
  if (event.target.matches('[data-filter="debounced"]')) debouncedCarregar();
});

document.addEventListener('change', (event) => {
  if (event.target.matches('[data-filter="immediate"]')) carregar();
});
