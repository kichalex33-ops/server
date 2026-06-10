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
let senha = localStorage.getItem('comando_senha') || '';
let usuario = JSON.parse(localStorage.getItem('comando_usuario') || 'null');

function moduloConfig() {
  return modulos.find(([id]) => id === moduloAtual) || modulos[0];
}

function mostrarLogin() {
  if (!senha || !usuario) document.getElementById('loginModal').classList.add('open');
}

async function login() {
  const tentativa = document.getElementById('senha').value;
  const res = await fetch('/api/comando/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha: tentativa }),
  });
  if (!res.ok) {
    alert('Senha invalida.');
    return;
  }
  const data = await res.json();
  senha = tentativa;
  usuario = data.usuario;
  localStorage.setItem('comando_senha', senha);
  localStorage.setItem('comando_usuario', JSON.stringify(usuario));
  document.getElementById('loginModal').classList.remove('open');
  carregar();
}

function navegar(modulo) {
  moduloAtual = modulo;
  history.pushState(null, '', modulo === 'dashboard' ? '/comando' : `/comando/${modulo}`);
  carregar();
}

function montarNav() {
  document.getElementById('nav').innerHTML = modulos.map(([id, nome]) => `
    <button class="${id === moduloAtual ? 'active' : ''}" onclick="navegar('${id}')">${nome}</button>
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
  document.getElementById('filters').innerHTML = moduloAtual === 'dashboard' || moduloAtual === 'dados' ? '' : `
    <input id="municipio" placeholder="Municipio" oninput="debouncedCarregar()">
    <input id="ace" placeholder="ACE" oninput="debouncedCarregar()">
    <input id="data" type="date" onchange="carregar()">
    <input id="status" placeholder="Status" oninput="debouncedCarregar()">
    <input id="busca" placeholder="Busca geral" oninput="debouncedCarregar()">
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
  return `<span class="${cls}">${s}</span>`;
}

function valor(item, ...campos) {
  for (const campo of campos) if (item[campo] !== undefined && item[campo] !== null && item[campo] !== '') return item[campo];
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
  ].map(([label, value]) => `<div class="card"><div class="label">${label}</div><div class="value">${value || 0}</div></div>`).join('');
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
    <div class="card"><div class="label">Registros filtrados</div><div class="value">${payload.total ?? rows.length}</div></div>
  `;
  document.getElementById('content').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Tipo/Nome</th><th>Municipio</th><th>ACE</th><th>Data</th><th>Status</th><th>Acoes</th></tr></thead>
        <tbody>${rows.map((item, idx) => `
          <tr>
            <td>${valor(item, 'id')}</td>
            <td><strong>${valor(item, 'nome', 'codigo', 'tipo', 'endereco', 'entity_type')}</strong></td>
            <td>${valor(item, 'municipio', 'municipio_id')}</td>
            <td>${valor(item, 'ace_responsavel', 'agente', 'ace_id')}</td>
            <td>${valor(item, 'data', 'data_visita', 'created_at', 'data_hora')}</td>
            <td>${badge(valor(item, 'status', 'sync_status', 'situacao', 'resultado'))}</td>
            <td>
              <button class="button ghost" onclick="detalhes(${idx})">Detalhes</button>
              ${editable ? `<button class="button primary" onclick="editar(${idx})">Editar</button>` : ''}
            </td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>`;
}

function renderDados(data) {
  ultimoDataset = [data];
  document.getElementById('cards').innerHTML = `<div class="card"><div class="label">Colecoes</div><div class="value">${Object.keys(data).length}</div></div>`;
  document.getElementById('content').innerHTML = `<pre class="json">${JSON.stringify(data, null, 2)}</pre>`;
}

function detalhes(idx) {
  document.getElementById('modalTitulo').textContent = 'Detalhes';
  document.getElementById('modalJson').textContent = JSON.stringify(ultimoDataset[idx], null, 2);
  document.getElementById('editor').innerHTML = '';
  document.getElementById('modal').classList.add('open');
}

function editar(idx) {
  const item = ultimoDataset[idx];
  document.getElementById('modalTitulo').textContent = 'Editar com auditoria';
  document.getElementById('modalJson').textContent = JSON.stringify(item, null, 2);
  document.getElementById('editor').innerHTML = `
    <h3>Alteracao</h3>
    <select id="campoEditar">
      ${Object.keys(item).filter(k => !['id'].includes(k)).map(k => `<option>${k}</option>`).join('')}
    </select>
    <div style="height:10px"></div>
    <textarea id="valorEditar" placeholder="Novo valor"></textarea>
    <div style="height:10px"></div>
    <textarea id="justificativaEditar" placeholder="Justificativa obrigatoria"></textarea>
    <div style="height:10px"></div>
    <button class="button primary" onclick="salvarEdicao('${item.id}')">Salvar alteracao</button>
  `;
  document.getElementById('modal').classList.add('open');
}

async function salvarEdicao(id) {
  const campo = document.getElementById('campoEditar').value;
  const raw = document.getElementById('valorEditar').value;
  const justificativa = document.getElementById('justificativaEditar').value;
  let valorNovo = raw;
  try { valorNovo = JSON.parse(raw); } catch (_) {}
  const endpoint = moduloConfig()[3];
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
  const data = await res.json();
  if (!res.ok) {
    alert(data.erro || 'Falha ao editar.');
    return;
  }
  fecharModal();
  carregar();
}

function fecharModal() {
  document.getElementById('modal').classList.remove('open');
}

async function carregar() {
  mostrarLogin();
  montarNav();
  renderFiltros();
  const modulo = moduloConfig();
  document.getElementById('titulo').textContent = modulo[1];
  const query = filtrosQuery();
  const url = `${modulo[2]}${query ? `?${query}` : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (moduloAtual === 'dashboard') renderDashboard(data);
  else if (moduloAtual === 'dados') renderDados(data);
  else renderTabela(data);
}

window.addEventListener('popstate', () => {
  moduloAtual = location.pathname.split('/').filter(Boolean)[1] || 'dashboard';
  carregar();
});

carregar();
