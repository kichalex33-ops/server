const modulos = [
  { id: 'dashboard', label: 'Dashboard', listUrl: '/api/comando/dashboard' },
  { id: 'pes', label: 'PEs', listUrl: '/api/comando/pes', editUrl: '/api/comando/pes' },
  { id: 'visitas', label: 'Visitas', listUrl: '/api/comando/visitas', editUrl: '/api/comando/visitas' },
  { id: 'bti', label: 'BTI', listUrl: '/api/comando/bti' },
  { id: 'ovitrampas', label: 'Ovitrampas', listUrl: '/api/comando/ovitrampas' },
  { id: 'tubitos', label: 'Tubitos', listUrl: '/api/comando/tubitos', editUrl: '/api/comando/tubitos' },
  { id: 'conflitos', label: 'Conflitos tubitos', listUrl: '/api/comando/tubitos/conflitos' },
  { id: 'quarteiroes', label: 'Quarteiroes', listUrl: '/api/comando/quarteiroes', editUrl: '/api/comando/quarteiroes' },
  { id: 'setores', label: 'Setores', listUrl: '/api/comando/setores', editUrl: '/api/comando/setores' },
  { id: 'imoveis', label: 'Imoveis', listUrl: '/api/comando/imoveis', editUrl: '/api/comando/imoveis' },
  { id: 'usuarios', label: 'Usuarios', listUrl: '/api/comando/usuarios' },
  { id: 'dispositivos', label: 'Dispositivos', listUrl: '/api/comando/dispositivos' },
  { id: 'auditoria', label: 'Auditoria', listUrl: '/api/comando/auditoria' },
  { id: 'sync', label: 'Sync', listUrl: '/api/comando/sync' },
  { id: 'dados', label: 'Todos os dados', listUrl: '/api/comando/dados' },
];

let moduloAtual = obterModuloAtual();
let ultimoDataset = [];
let senha = '';
let token = '';
let usuario = null;
let ultimoFoco = null;
let timer;

function el(id) { return document.getElementById(id); }
function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function moduloConfig() { return modulos.find((m) => m.id === moduloAtual) || modulos[0]; }
function temSessao() { return Boolean(usuario && (senha || token)); }
function authHeaders(extra = {}) {
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (senha) headers['x-comando-senha'] = senha;
  if (usuario?.id) headers['x-usuario-id'] = String(usuario.id);
  if (usuario?.perfil) headers['x-perfil-usuario'] = String(usuario.perfil);
  return headers;
}
function obterModuloAtual() {
  const url = new URL(window.location.href);
  const query = url.searchParams.get('modulo');
  if (query) return query;
  const partes = location.pathname.split('/').filter(Boolean);
  const idx = partes.lastIndexOf('comando');
  return idx >= 0 ? (partes[idx + 1] || 'dashboard') : 'dashboard';
}
function urlModulo(modulo) {
  const partes = location.pathname.split('/').filter(Boolean);
  const idx = partes.lastIndexOf('comando');
  if (idx >= 0) {
    const base = `/${partes.slice(0, idx + 1).join('/')}`;
    return modulo === 'dashboard' ? base : `${base}/${encodeURIComponent(modulo)}`;
  }
  const url = new URL(window.location.href);
  if (modulo === 'dashboard') url.searchParams.delete('modulo');
  else url.searchParams.set('modulo', modulo);
  return `${url.pathname}${url.search}${url.hash}`;
}
function mensagem(texto, tipo = 'info') {
  let box = el('appMessage');
  if (!box) {
    box = document.createElement('div');
    box.id = 'appMessage';
    box.className = 'app-message';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.prepend(box);
  }
  box.textContent = texto;
  box.dataset.type = tipo;
  box.hidden = false;
  clearTimeout(mensagem.timer);
  mensagem.timer = setTimeout(() => { box.hidden = true; }, tipo === 'error' ? 8000 : 4000);
}
async function safeFetch(url, options = {}) {
  const res = await fetch(url, { credentials: 'include', ...options, headers: { ...(options.headers || {}) } });
  const text = await res.text();
  const type = res.headers.get('content-type') || '';
  let data = {};
  if (text) {
    if (type.includes('application/json')) {
      try { data = JSON.parse(text); } catch (_) { throw new Error('Resposta JSON invalida do servidor.'); }
    } else data = { mensagem: text };
  }
  if (!res.ok) throw new Error(data.erro || data.error || data.mensagem || data.message || res.statusText || 'Falha na requisicao.');
  return data;
}
function primeiroFocavel(modal) { return modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'); }
function abrirModal(id, foco) {
  const modal = el(id);
  if (!modal) return;
  ultimoFoco = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => (modal.querySelector(foco) || primeiroFocavel(modal))?.focus(), 0);
}
function fecharModal(id = 'modal') {
  const modal = el(id);
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  ultimoFoco?.focus();
}
function trapFocus(event) {
  const modal = document.querySelector('.modal.open');
  if (!modal || event.key !== 'Tab') return;
  const itens = Array.from(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((i) => !i.disabled && i.offsetParent !== null);
  if (!itens.length) return;
  const first = itens[0];
  const last = itens[itens.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
function mostrarLogin() { if (!temSessao()) abrirModal('loginModal', '#senha'); }
async function login() {
  const tentativa = el('senha')?.value || '';
  if (!tentativa.trim()) return mensagem('Informe a senha de acesso.', 'error');
  try {
    const data = await safeFetch('/api/comando/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: tentativa }) });
    senha = tentativa;
    token = data.token || data.access_token || '';
    usuario = data.usuario || data.user || { id: 'admin-local', perfil: 'administrador' };
    fecharModal('loginModal');
    mensagem('Acesso autorizado.', 'success');
    carregar();
  } catch (error) {
    senha = '';
    token = '';
    usuario = null;
    mensagem(error.message || 'Senha invalida.', 'error');
  }
}
function navegar(modulo) { moduloAtual = modulo; history.pushState(null, '', urlModulo(modulo)); carregar(); }
function montarNav() {
  el('nav').innerHTML = modulos.map((m) => `<button class="${m.id === moduloAtual ? 'active' : ''}" data-nav="${escapeHtml(m.id)}" type="button">${escapeHtml(m.label)}</button>`).join('');
}
function filtrosQuery() {
  const params = new URLSearchParams();
  for (const id of ['municipio', 'ace', 'data', 'status', 'busca']) {
    const input = el(id);
    if (input?.value.trim()) params.set(id, input.value.trim());
  }
  return params.toString();
}
function renderFiltros() {
  el('filters').innerHTML = moduloAtual === 'dashboard' || moduloAtual === 'dados' ? '' : `
    <label class="sr-only" for="municipio">Municipio</label><input id="municipio" placeholder="Municipio" data-filter="debounced">
    <label class="sr-only" for="ace">ACE</label><input id="ace" placeholder="ACE" data-filter="debounced">
    <label class="sr-only" for="data">Data</label><input id="data" type="date" data-filter="immediate">
    <label class="sr-only" for="status">Status</label><input id="status" placeholder="Status" data-filter="debounced">
    <label class="sr-only" for="busca">Busca geral</label><input id="busca" placeholder="Busca geral" data-filter="debounced">`;
}
function debouncedCarregar() { clearTimeout(timer); timer = setTimeout(carregar, 350); }
function badge(status) {
  const s = String(status || 'sem status');
  const lower = s.toLowerCase();
  let cls = 'badge';
  if (lower.includes('dia') || lower.includes('synced') || lower.includes('concluido') || lower.includes('ativo')) cls += ' green';
  else if (lower.includes('venc') || lower.includes('pending') || lower.includes('andamento')) cls += ' yellow';
  else if (lower.includes('atras') || lower.includes('failed') || lower.includes('critico') || lower.includes('foco') || lower.includes('excluido')) cls += ' red';
  else if (lower.includes('conflict')) cls += ' purple';
  else cls += ' gray';
  return `<span class="${cls}">${escapeHtml(s)}</span>`;
}
function valor(item, ...campos) {
  for (const campo of campos) if (item[campo] !== undefined && item[campo] !== null && item[campo] !== '') return item[campo];
  return '-';
}
function renderDashboard(data) {
  el('cards').innerHTML = [
    ['PEs', data.totalPEs], ['Visitas', (data.visitasPE || 0) + (data.visitasDomiciliares || 0)], ['Tubitos', data.tubitos], ['Conflitos', data.conflitos],
    ['Auditoria', data.auditoria], ['Dispositivos', data.dispositivos], ['Quarteiroes', data.quarteiroes], ['Imoveis', data.imoveis],
  ].map(([label, value]) => `<div class="card"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value || 0)}</div></div>`).join('');
  el('content').innerHTML = '<div class="card"><h2>Ambiente administrativo</h2><p>Edicoes geram auditoria com usuario, perfil, campo alterado, valor anterior, valor novo e justificativa.</p></div>';
}
function renderTabela(payload) {
  const rows = Array.isArray(payload) ? payload : (payload.data || []);
  ultimoDataset = rows;
  const editable = Boolean(moduloConfig().editUrl);
  el('cards').innerHTML = `<div class="card"><div class="label">Registros filtrados</div><div class="value">${escapeHtml(payload.total ?? rows.length)}</div></div>`;
  el('content').innerHTML = `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Tipo/Nome</th><th>Municipio</th><th>ACE</th><th>Data</th><th>Status</th><th>Acoes</th></tr></thead><tbody>${rows.map((item, idx) => `
    <tr><td>${escapeHtml(valor(item, 'id'))}</td><td><strong>${escapeHtml(valor(item, 'nome', 'codigo', 'tipo', 'endereco', 'entity_type'))}</strong></td><td>${escapeHtml(valor(item, 'municipio', 'municipio_id'))}</td><td>${escapeHtml(valor(item, 'ace_responsavel', 'agente', 'ace_id'))}</td><td>${escapeHtml(valor(item, 'data', 'data_visita', 'created_at', 'data_hora'))}</td><td>${badge(valor(item, 'status', 'sync_status', 'situacao', 'resultado'))}</td><td><button class="button ghost" type="button" data-detail="${idx}">Detalhes</button>${editable ? `<button class="button primary" type="button" data-edit="${idx}">Editar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderDados(data) {
  ultimoDataset = [data];
  el('cards').innerHTML = `<div class="card"><div class="label">Colecoes</div><div class="value">${escapeHtml(Object.keys(data).length)}</div></div>`;
  el('content').innerHTML = '<pre class="json" id="dadosJson"></pre>';
  el('dadosJson').textContent = JSON.stringify(data, null, 2);
}
function detalhes(idx) {
  el('modalTitulo').textContent = 'Detalhes';
  el('modalJson').textContent = JSON.stringify(ultimoDataset[idx], null, 2);
  el('editor').innerHTML = '';
  abrirModal('modal', '[data-action="close-modal"]');
}
function editar(idx) {
  const item = ultimoDataset[idx];
  const options = Object.keys(item).filter((k) => k !== 'id').map((k) => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
  el('modalTitulo').textContent = 'Editar com auditoria';
  el('modalJson').textContent = JSON.stringify(item, null, 2);
  el('editor').innerHTML = `<h3>Alteracao</h3><label for="campoEditar">Campo</label><select id="campoEditar">${options}</select><div style="height:10px"></div><label for="valorEditar">Novo valor</label><textarea id="valorEditar" placeholder="Novo valor"></textarea><div style="height:10px"></div><label for="justificativaEditar">Justificativa obrigatoria</label><textarea id="justificativaEditar" placeholder="Justificativa obrigatoria"></textarea><div style="height:10px"></div><button class="button primary" type="button" data-save-edit="${escapeHtml(item.id)}">Salvar alteracao</button>`;
  abrirModal('modal', '#campoEditar');
}
async function salvarEdicao(id) {
  const endpoint = moduloConfig().editUrl;
  if (!endpoint) return mensagem('Operacao nao permitida: este modulo nao e editavel.', 'error');
  if (!temSessao()) return mostrarLogin();
  const campo = el('campoEditar')?.value;
  const raw = el('valorEditar')?.value || '';
  const justificativa = el('justificativaEditar')?.value || '';
  if (!campo) return mensagem('Selecione um campo para editar.', 'error');
  if (!justificativa.trim()) return mensagem('Informe uma justificativa para auditoria.', 'error');
  let valorNovo = raw;
  try { valorNovo = JSON.parse(raw); } catch (_) { valorNovo = raw; }
  try {
    await safeFetch(`${endpoint}/${encodeURIComponent(id)}`, { method: 'PATCH', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ usuario_id: usuario?.id || 'admin-local', perfil_usuario: usuario?.perfil || 'administrador', justificativa, dados: { [campo]: valorNovo } }) });
    fecharModal('modal');
    mensagem('Alteracao salva com auditoria.', 'success');
    carregar();
  } catch (error) { mensagem(error.message || 'Falha ao editar.', 'error'); }
}
async function carregar() {
  montarNav();
  renderFiltros();
  if (!temSessao()) {
    mostrarLogin();
    el('titulo').textContent = 'Comando Central';
    el('cards').innerHTML = '';
    el('content').innerHTML = '<div class="card"><p>Informe a senha para carregar os dados administrativos.</p></div>';
    return;
  }
  const modulo = moduloConfig();
  el('titulo').textContent = modulo.label;
  const query = filtrosQuery();
  const url = `${modulo.listUrl}${query ? `?${query}` : ''}`;
  try {
    const data = await safeFetch(url, { headers: authHeaders() });
    if (moduloAtual === 'dashboard') renderDashboard(data);
    else if (moduloAtual === 'dados') renderDados(data);
    else renderTabela(data);
  } catch (error) {
    el('cards').innerHTML = '';
    el('content').innerHTML = `<div class="card"><h2>Falha ao carregar</h2><p>${escapeHtml(error.message || 'Erro inesperado.')}</p></div>`;
    mensagem(error.message || 'Falha ao carregar dados.', 'error');
  }
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const nav = target.closest('[data-nav]');
  if (nav) return navegar(nav.getAttribute('data-nav'));
  const detail = target.closest('[data-detail]');
  if (detail) return detalhes(Number(detail.getAttribute('data-detail')));
  const edit = target.closest('[data-edit]');
  if (edit) return editar(Number(edit.getAttribute('data-edit')));
  const save = target.closest('[data-save-edit]');
  if (save) return salvarEdicao(save.getAttribute('data-save-edit'));
  const action = target.closest('[data-action]')?.getAttribute('data-action');
  if (action === 'login') return login();
  if (action === 'refresh') return carregar();
  if (action === 'close-modal') return fecharModal('modal');
});
document.addEventListener('input', (event) => { if (event.target instanceof HTMLInputElement && event.target.dataset.filter === 'debounced') debouncedCarregar(); });
document.addEventListener('change', (event) => { if (event.target instanceof HTMLInputElement && event.target.dataset.filter === 'immediate') carregar(); });
document.addEventListener('keydown', (event) => {
  trapFocus(event);
  if (event.key === 'Enter' && document.activeElement?.id === 'senha') login();
  if (event.key === 'Escape' && el('modal')?.classList.contains('open')) fecharModal('modal');
});
window.addEventListener('popstate', () => { moduloAtual = obterModuloAtual(); carregar(); });
carregar();
