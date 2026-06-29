// SAFER frontend: escapeHtml, safeFetch and small UX fixes

const modulos = [
  ['dashboard', 'Dashboard', '/api/comando/dashboard'],
  ['pes', 'PEs', '/api/comando/pes', '/api/comando/pes'],
  ['visitas', 'Visitas', '/api/comando/visitas', '/api/comando/visitas'],
  ['bti', 'BTI', '/api/comando/bti'],
  ['ovitrampas', 'Ovitrampas', '/api/comando/ovitrampas'],
  ['tubitos', 'Tubitos', '/api/comando/tubitos', '/api/comando/tubitos'],
  ['conflitos', 'Conflitos tubitos', '/api/comando/tubitos/conflitos'],
  ['quarteiroes', 'Quarteiroes', '/api/comando/quarteiroes', '/api/comando/quarteiroes'],
  ['setores', 'Setores', '/api/comando/setores', '/api/comando/setores'],
  ['imoveis', 'Imoveis', '/api/comando/imoveis', '/api/comando/imoveis'],
  ['usuarios', 'Usuarios', '/api/comando/usuarios'],
  ['dispositivos', 'Dispositivos', '/api/comando/dispositivos'],
  ['auditoria', 'Auditoria', '/api/comando/auditoria'],
  ['sync', 'Sync', '/api/comando/sync'],
  ['dados', 'Todos os dados', '/api/comando/dados'],
];

let moduloAtual = location.pathname.split('/').filter(Boolean)[1] || 'dashboard';
let ultimoDataset = [];
// Use sessionStorage instead of localStorage for credentials (temporary mitigation)
let senha = sessionStorage.getItem('comando_senha') || '';
let usuario = JSON.parse(sessionStorage.getItem('comando_usuario') || 'null');

function moduloConfig() {
  return modulos.find(([id]) => id === moduloAtual) || modulos[0];
}

function mostrarLogin() {
  if (!senha || !usuario) document.getElementById('loginModal')?.classList.add('open');
}

// small escape helper to avoid XSS
function escapeHtml(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/[&<>">']/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

async function safeFetch(url, opts) {
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    if (!res.ok) {
      let msg = text || res.statusText || `HTTP ${res.status}`;
      try { const j = JSON.parse(text); if (j && j.erro) msg = j.erro; } catch (_) {}
      throw new Error(msg);
    }
    try { return JSON.parse(text || '{}'); } catch (e) { return {} }
  } catch (err) {
    console.error('Fetch error', err);
    throw err;
  }
}

async function login() {
  try {
    const tentativa = document.getElementById('senha').value;
    const res = await fetch('/api/comando/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha: tentativa }),
    });
    if (!res.ok) {
      alert('Senha inválida.');
      return;
    }
    const data = await res.json();
    senha = tentativa;
    usuario = data.usuario;
    sessionStorage.setItem('comando_senha', senha);
    sessionStorage.setItem('comando_usuario', JSON.stringify(usuario));
    document.getElementById('loginModal')?.classList.remove('open');
    carregar();
  } catch (err) {
    alert('Erro ao efetuar login: ' + (err.message || 'desconhecido'));
  }
}

function navegar(modulo) {
  moduloAtual = modulo;
  history.pushState(null, '', modulo === 'dashboard' ? '/comando' : `/comando/${modulo}`);
  carregar();
}

function montarNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  nav.innerHTML = modulos.map(([id, nome]) => `
    <button class="${id === moduloAtual ? 'active' : ''}" data-nav="${id}">${escapeHtml(nome)}</button>
  `).join('');
}

function filtrosQuery() {
  const params = new URLSearchParams();
  for (const id of ['municipio', 'ace', 'data', 'status', 'busca']) {
    const el = document.getElementById(id);
    if (el && el.value && el.value.trim()) params.set(id, el.value.trim());
  }
  return params.toString();
}

function renderFiltros() {
  const container = document.getElementById('filters');
  if (!container) return;
  container.innerHTML = moduloAtual === 'dashboard' || moduloAtual === 'dados' ? '' : `
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
  if (lower.includes('dia') || lower.includes('synced') || lower.includes('concluido') || lower.includes('ativo')) cls += ' green';
  else if (lower.includes('venc') || lower.includes('pending') || lower.includes('andamento')) cls += ' yellow';
  else if (lower.includes('atras') || lower.includes('failed') || lower.includes('critico') || lower.includes('foco') || lower.includes('excluido')) cls += ' red';
  else if (lower.includes('conflict')) cls += ' purple';
  else cls += ' gray';
  return `<span class="${cls}">${escapeHtml(s)}</span>`;
}

function valor(item, ...campos) {
  for (const campo of campos) if (item && item[campo] !== undefined && item[campo] !== null && item[campo] !== '') return item[campo];
  return '-';
}

function renderDashboard(data) {
  document.getElementById('cards').innerHTML = [
    ['PEs', data.totalPEs],
    ['Visitas', (data.visitasPE || 0) + (data.visitasDomiciliares || 0)],
    ['Tubitos', data.tubitos],
    ['Conflitos', data.conflitos],
    ['Auditoria', data.auditoria],
    ['Dispositivos', data.dispositivos],
    ['Quarteiroes', data.quarteiroes],
    ['Imoveis', data.imoveis],
  ].map(([label, value]) => `<div class="card"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value || 0)}</div></div>`).join('');
  document.getElementById('content').innerHTML = `
    <div class="card">
      <h2>Ambiente administrativo</h2>
      <p>Edicoes geram auditoria com usuario, perfil, campo alterado, valor anterior, valor novo e justificativa.</p>
    </div>`;
}

function renderTabela(payload) {
  const rows = Array.isArray(payload) ? payload : (payload.data || []);
  ultimoDataset = rows;
  const editable = Boolean(moduloConfig()[3]);
  document.getElementById('cards').innerHTML = `
    <div class="card"><div class="label">Registros filtrados</div><div class="value">${escapeHtml(String(payload.total ?? rows.length))}</div></div>
  `;
  document.getElementById('content').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Tipo/Nome</th><th>Municipio</th><th>ACE</th><th>Data</th><th>Status</th><th>Acoes</th></tr></thead>
        <tbody>${rows.map((item, idx) => `
          <tr>
            <td>${escapeHtml(valor(item, 'id'))}</td>
            <td><strong>${escapeHtml(valor(item, 'nome', 'codigo', 'tipo', 'endereco', 'entity_type'))}</strong></td>
            <td>${escapeHtml(valor(item, 'municipio', 'municipio_id'))}</td>
            <td>${escapeHtml(valor(item, 'ace_responsavel', 'agente', 'ace_id'))}</td>
            <td>${escapeHtml(valor(item, 'data', 'data_visita', 'created_at', 'data_hora'))}</td>
            <td>${badge(valor(item, 'status', 'sync_status', 'situacao', 'resultado'))}</td>
            <td>
              <button class="button ghost" data-detail="${idx}">Detalhes</button>
              ${editable ? `<button class="button primary" data-edit="${idx}">Editar</button>` : ''}
            </td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>`;
}

function renderDados(data) {
  ultimoDataset = [data];
  document.getElementById('cards').innerHTML = `<div class="card"><div class="label">Colecoes</div><div class="value">${escapeHtml(String(Object.keys(data || {}).length))}</div></div>`;
  document.getElementById('content').innerHTML = `<pre class="json">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
}

function detalhes(idx) {
  document.getElementById('modalTitulo').textContent = 'Detalhes';
  document.getElementById('modalJson').textContent = JSON.stringify(ultimoDataset[idx], null, 2);
  document.getElementById('editor').innerHTML = '';
  document.getElementById('modal')?.classList.add('open');
}

function editar(idx) {
  const item = ultimoDataset[idx];
  if (!item) return alert('Item não encontrado');
  document.getElementById('modalTitulo').textContent = 'Editar com auditoria';
  document.getElementById('modalJson').textContent = JSON.stringify(item, null, 2);
  document.getElementById('editor').innerHTML = `
    <h3>Alteracao</h3>
    <select id="campoEditar">
      ${Object.keys(item).filter(k => !['id'].includes(k)).map(k => `<option>${escapeHtml(k)}</option>`).join('')}
    </select>
    <div style="height:10px"></div>
    <textarea id="valorEditar" placeholder="Novo valor"></textarea>
    <div style="height:10px"></div>
    <textarea id="justificativaEditar" placeholder="Justificativa obrigatoria"></textarea>
    <div style="height:10px"></div>
    <button class="button primary" data-save-edit="${item.id}">Salvar alteracao</button>
  `;
  document.getElementById('modal')?.classList.add('open');
}

async function salvarEdicao(id) {
  try {
    const campo = document.getElementById('campoEditar').value;
    const raw = document.getElementById('valorEditar').value;
    const justificativa = document.getElementById('justificativaEditar').value;
    let valorNovo = raw;
    try { valorNovo = JSON.parse(raw); } catch (_) {}
    const endpoint = moduloConfig()[3];
    if (!endpoint) { alert('Este módulo não permite edição'); return; }
    const res = await fetch(`${endpoint}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-comando-senha': senha,
        'x-usuario-id': usuario?.id || 'admin-local',
        'x-perfil-usuario': usuario?.perfil || 'administrador',
      },
      body: JSON.stringify({
        usuario_id: usuario?.id || 'admin-local',
        perfil_usuario: usuario?.perfil || 'administrador',
        justificativa,
        dados: { [campo]: valorNovo },
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = text || res.statusText || 'Falha ao editar.';
      try { const j = JSON.parse(text); if (j && j.erro) msg = j.erro; } catch (_) {}
      alert(msg);
      return;
    }
    fecharModal();
    carregar();
  } catch (err) {
    alert('Erro ao salvar: ' + (err.message || 'desconhecido'));
  }
}

function fecharModal() {
  document.getElementById('modal')?.classList.remove('open');
}

async function carregar() {
  try {
    mostrarLogin();
    montarNav();
    renderFiltros();
    const modulo = moduloConfig();
    document.getElementById('titulo').textContent = modulo[1];
    const query = filtrosQuery();
    const url = `${modulo[2]}${query ? `?${query}` : ''}`;
    const data = await safeFetch(url);
    if (moduloAtual === 'dashboard') renderDashboard(data);
    else if (moduloAtual === 'dados') renderDados(data);
    else renderTabela(data);
  } catch (err) {
    console.error(err);
    // Could display a nicer UI message instead
  }
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
  const edit = event.target.closest('[data-edit]');
  if (edit) { editar(Number(edit.dataset.edit)); return; }
  const save = event.target.closest('[data-save-edit]');
  if (save) { salvarEdicao(save.dataset.saveEdit); return; }
  const action = event.target.closest('[data-action]');
  if (!action) return;
  if (action.dataset.action === 'refresh') carregar();
  if (action.dataset.action === 'login') login();
  if (action.dataset.action === 'close-modal') fecharModal();
});

document.addEventListener('input', (event) => {
  if (event.target.matches('[data-filter="debounced"]')) debouncedCarregar();
});

document.addEventListener('change', (event) => {
  if (event.target.matches('[data-filter="immediate"]')) carregar();
});
