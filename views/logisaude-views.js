const store = require('../lib/logisaude-store');

const NAV = [
  { href: '/logisaude', label: 'Dashboard', key: 'dashboard' },
  { href: '/logisaude/operacao', label: 'Operação', key: 'operacao' },
  { href: '/logisaude/viagens', label: 'Viagens', key: 'viagens' },
  { href: '/logisaude/motoristas', label: 'Motoristas', key: 'motoristas' },
  { href: '/logisaude/veiculos', label: 'Veículos', key: 'veiculos' },
  { href: '/logisaude/pacientes', label: 'Pacientes', key: 'pacientes' },
  { href: '/logisaude/rastreamento', label: 'Rastreamento', key: 'rastreamento' },
  { href: '/logisaude/sync', label: 'Sync', key: 'sync' },
  { href: '/logisaude/debug', label: 'Debug', key: 'debug' },
];

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function badge(status) {
  const s = esc(status || '—');
  const cls = esc((status || '').replace(/\s/g, '_').toLowerCase());
  return `<span class="ls-badge ${cls}">${s}</span>`;
}

function layout({ title, active, municipio, flash, content }) {
  const nav = NAV.map(
    (item) =>
      `<a href="${item.href}" class="${item.key === active ? 'active' : ''}">${esc(item.label)}</a>`,
  ).join('');

  const flashHtml = flash ? `<div class="ls-flash">${esc(flash)}</div>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — LogiSaúde</title>
  <link rel="stylesheet" href="/logisaude.css">
</head>
<body class="ls-body">
  <div class="ls-shell">
    <aside class="ls-sidebar">
      <div class="ls-brand">LogiSaúde</div>
      <div class="ls-brand-sub">${esc(municipio || 'Município')}</div>
      <nav class="ls-nav">${nav}
        <a href="/" class="ls-back">← Portal inicial</a>
        <a href="/painel-ace" class="ls-back">ACE Territorial</a>
      </nav>
    </aside>
    <main class="ls-main">
      <header class="ls-header">
        <h1>${esc(title)}</h1>
      </header>
      ${flashHtml}
      ${content}
    </main>
  </div>
</body>
</html>`;
}

function pageDashboard(flash) {
  const dash = store.dashboard();
  const dados = store.carregar();

  const cards = [
    ['Viagens do dia', dash.viagens_do_dia],
    ['Em andamento', dash.viagens_em_andamento],
    ['Pacientes / passageiros', dash.pacientes_passageiros],
    ['Motoristas ativos', dash.motoristas_ativos],
    ['Veículos disponíveis', dash.veiculos_disponiveis],
    ['Eventos do app', dash.eventos_recebidos],
    ['Localizações', dash.localizacoes_recebidas],
    ['Pendências sync', dash.pendencias_sync],
  ]
    .map(
      ([label, value]) =>
        `<div class="ls-card"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></div>`,
    )
    .join('');

  const viagens = store.enriquecerViagens(dados).slice(0, 5);
  const rows = viagens
    .map(
      (v) => `<tr>
        <td>${esc(v.origem)} → ${esc(v.destino)}</td>
        <td>${badge(v.status)}</td>
        <td>${esc(v.motorista_nome)}</td>
        <td>${esc(v.data)} ${esc(v.hora)}</td>
      </tr>`,
    )
    .join('');

  return layout({
    title: 'Dashboard',
    active: 'dashboard',
    municipio: dados.municipio,
    flash,
    content: `
      <p>Visão geral da operação de transporte sanitário em <strong>${esc(dados.municipio)}</strong>.</p>
      <div class="ls-cards">${cards}</div>
      <section class="ls-panel">
        <h2>Últimas viagens</h2>
        <div class="ls-table-wrap">
          <table class="ls-table">
            <thead><tr><th>Rota</th><th>Status</th><th>Motorista</th><th>Data</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4">Nenhuma viagem</td></tr>'}</tbody>
          </table>
        </div>
        <p style="margin-top:16px"><a class="ls-btn ls-btn-primary" href="/logisaude/operacao">Ir para operação</a></p>
      </section>`,
  });
}

function pageOperacao(flash) {
  const dados = store.carregar();
  const viagens = store.enriquecerViagens(dados);

  const rows = viagens
    .map((v) => {
      const acoes =
        v.status === 'concluida' || v.status === 'cancelada'
          ? '—'
          : `<div class="ls-actions">
          <form method="post" action="/logisaude/operacao/acoes"><input type="hidden" name="viagem_id" value="${esc(v.id)}"><input type="hidden" name="acao" value="despachar"><button type="submit" class="ls-btn ls-btn-primary">Despachar</button></form>
          <form method="post" action="/logisaude/operacao/acoes"><input type="hidden" name="viagem_id" value="${esc(v.id)}"><input type="hidden" name="acao" value="concluir"><button type="submit" class="ls-btn ls-btn-ok">Concluir</button></form>
          <form method="post" action="/logisaude/operacao/acoes"><input type="hidden" name="viagem_id" value="${esc(v.id)}"><input type="hidden" name="acao" value="cancelar"><button type="submit" class="ls-btn ls-btn-danger">Cancelar</button></form>
        </div>`;
      return `<tr>
        <td><strong>${esc(v.origem)}</strong> → ${esc(v.destino)}</td>
        <td>${badge(v.status)}</td>
        <td>${esc(v.motorista_nome)}</td>
        <td>${esc(v.veiculo_nome)}</td>
        <td>${esc(v.passageiros_nomes)}</td>
        <td>${acoes}</td>
      </tr>`;
    })
    .join('');

  return layout({
    title: 'Operação',
    active: 'operacao',
    municipio: dados.municipio,
    flash,
    content: `
      <p>Despacho e acompanhamento das viagens do dia.</p>
      <section class="ls-panel">
        <div class="ls-table-wrap">
          <table class="ls-table">
            <thead><tr><th>Rota</th><th>Status</th><th>Motorista</th><th>Veículo</th><th>Passageiros</th><th>Ações</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`,
  });
}

function selectMotoristas(dados, selected) {
  return dados.motoristas
    .map((m) => `<option value="${esc(m.id)}" ${m.id === selected ? 'selected' : ''}>${esc(m.nome)}</option>`)
    .join('');
}

function selectVeiculos(dados, selected) {
  return dados.veiculos
    .map((v) => `<option value="${esc(v.id)}" ${v.id === selected ? 'selected' : ''}>${esc(v.nome)}</option>`)
    .join('');
}

function selectPassageiros(dados) {
  return dados.passageiros
    .map((p) => `<option value="${esc(p.id)}">${esc(p.nome)} — ${esc(p.destino)}</option>`)
    .join('');
}

function pageViagens(flash) {
  const dados = store.carregar();
  const viagens = store.enriquecerViagens(dados);
  const rows = viagens
    .map(
      (v) => `<tr>
        <td>${esc(v.origem)} → ${esc(v.destino)}</td>
        <td>${badge(v.status)}</td>
        <td>${esc(v.motorista_nome)} / ${esc(v.veiculo_nome)}</td>
        <td>${esc(v.passageiros_nomes)}</td>
        <td>${esc(v.data)} ${esc(v.hora)}</td>
      </tr>`,
    )
    .join('');

  return layout({
    title: 'Viagens',
    active: 'viagens',
    municipio: dados.municipio,
    flash,
    content: `
      <section class="ls-panel">
        <h2>Nova viagem</h2>
        <form class="ls-form" method="post" action="/logisaude/viagens">
          <label>Origem <input name="origem" required placeholder="UBS Centro"></label>
          <label>Destino <input name="destino" required placeholder="Hospital"></label>
          <label>Data <input type="date" name="data" value="${esc(new Date().toISOString().slice(0, 10))}"></label>
          <label>Hora <input type="time" name="hora" value="08:00"></label>
          <label>Motorista
            <select name="motorista_id"><option value="">— Selecionar —</option>${selectMotoristas(dados)}</select>
          </label>
          <label>Veículo
            <select name="veiculo_id"><option value="">— Selecionar —</option>${selectVeiculos(dados)}</select>
          </label>
          <label>Passageiro
            <select name="passageiro_id"><option value="">— Opcional —</option>${selectPassageiros(dados)}</select>
          </label>
          <button type="submit" class="ls-btn ls-btn-primary">Criar viagem</button>
        </form>
      </section>
      <section class="ls-panel">
        <h2>Lista de viagens</h2>
        <div class="ls-table-wrap">
          <table class="ls-table">
            <thead><tr><th>Rota</th><th>Status</th><th>Recursos</th><th>Passageiros</th><th>Quando</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`,
  });
}

function pageMotoristas(flash) {
  const dados = store.carregar();
  const rows = dados.motoristas
    .map(
      (m) => `<tr><td>${esc(m.nome)}</td><td>${esc(m.telefone || '—')}</td><td>${badge(m.status)}</td></tr>`,
    )
    .join('');

  return layout({
    title: 'Motoristas',
    active: 'motoristas',
    municipio: dados.municipio,
    flash,
    content: `
      <section class="ls-panel">
        <h2>Novo motorista</h2>
        <form class="ls-form" method="post" action="/logisaude/motoristas">
          <label>Nome <input name="nome" required></label>
          <label>Telefone <input name="telefone"></label>
          <label>CNH <input name="cnh"></label>
          <button type="submit" class="ls-btn ls-btn-primary">Cadastrar</button>
        </form>
      </section>
      <section class="ls-panel">
        <h2>Motoristas cadastrados</h2>
        <div class="ls-table-wrap">
          <table class="ls-table"><thead><tr><th>Nome</th><th>Telefone</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
      </section>`,
  });
}

function pageVeiculos(flash) {
  const dados = store.carregar();
  const rows = dados.veiculos
    .map(
      (v) =>
        `<tr><td>${esc(v.nome)}</td><td>${esc(v.placa || '—')}</td><td>${esc(v.tipo)}</td><td>${badge(v.status)}</td></tr>`,
    )
    .join('');

  return layout({
    title: 'Veículos',
    active: 'veiculos',
    municipio: dados.municipio,
    flash,
    content: `
      <section class="ls-panel">
        <h2>Novo veículo</h2>
        <form class="ls-form" method="post" action="/logisaude/veiculos">
          <label>Nome <input name="nome" required placeholder="Van Saúde 04"></label>
          <label>Placa <input name="placa"></label>
          <label>Tipo
            <select name="tipo">
              <option value="ambulancia">Ambulância</option>
              <option value="van">Van</option>
              <option value="administrativo">Administrativo</option>
            </select>
          </label>
          <button type="submit" class="ls-btn ls-btn-primary">Cadastrar</button>
        </form>
      </section>
      <section class="ls-panel">
        <h2>Frota</h2>
        <div class="ls-table-wrap">
          <table class="ls-table"><thead><tr><th>Nome</th><th>Placa</th><th>Tipo</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
      </section>`,
  });
}

function pagePacientes(flash) {
  const dados = store.carregar();
  const rows = dados.pacientes
    .map(
      (p) =>
        `<tr><td>${esc(p.nome)}</td><td>${esc(p.destino)}</td><td>${esc(p.tipo)}</td><td>${esc(p.observacoes || '—')}</td></tr>`,
    )
    .join('');

  return layout({
    title: 'Pacientes e passageiros',
    active: 'pacientes',
    municipio: dados.municipio,
    flash,
    content: `
      <section class="ls-panel">
        <h2>Novo paciente / passageiro</h2>
        <form class="ls-form" method="post" action="/logisaude/pacientes">
          <label>Nome <input name="nome" required></label>
          <label>Destino / motivo <input name="destino" placeholder="cardiologia"></label>
          <label>Tipo
            <select name="tipo">
              <option value="paciente">Paciente</option>
              <option value="acompanhante">Acompanhante</option>
            </select>
          </label>
          <label>Observações <textarea name="observacoes" rows="2"></textarea></label>
          <button type="submit" class="ls-btn ls-btn-primary">Cadastrar</button>
        </form>
      </section>
      <section class="ls-panel">
        <h2>Lista</h2>
        <div class="ls-table-wrap">
          <table class="ls-table"><thead><tr><th>Nome</th><th>Destino</th><th>Tipo</th><th>Obs.</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
      </section>`,
  });
}

function pageRastreamento(flash) {
  const dados = store.carregar();
  const rows = dados.driver_locations
    .map((loc) => {
      const mot = store.nomeMotorista(dados, loc.motorista_id);
      const via = loc.viagem_id || '—';
      return `<tr>
        <td>${esc(mot)}</td>
        <td>${esc(via)}</td>
        <td>${esc(loc.latitude)}</td>
        <td>${esc(loc.longitude)}</td>
        <td>${esc(loc.recebido_em)}</td>
      </tr>`;
    })
    .join('');

  return layout({
    title: 'Rastreamento',
    active: 'rastreamento',
    municipio: dados.municipio,
    flash,
    content: `
      <p>Localizações enviadas pelo app motorista via <code>POST /api/driver/locations</code>.</p>
      <div class="ls-map-placeholder">Mapa visual — placeholder (integração futura)</div>
      <section class="ls-panel">
        <div class="ls-table-wrap">
          <table class="ls-table">
            <thead><tr><th>Motorista</th><th>Viagem</th><th>Latitude</th><th>Longitude</th><th>Horário</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5">Nenhuma localização recebida ainda</td></tr>'}</tbody>
          </table>
        </div>
      </section>`,
  });
}

function pageSync(flash) {
  const dados = store.carregar();
  const eventos = dados.driver_events
    .slice(0, 50)
    .map(
      (e) =>
        `<tr><td>${esc(e.tipo)}</td><td>${esc(e.motorista_id || '—')}</td><td>${esc(e.viagem_id || '—')}</td><td>${esc(e.recebido_em)}</td></tr>`,
    )
    .join('');

  const statusRows = dados.trip_status
    .slice(0, 50)
    .map(
      (s) =>
        `<tr><td>${esc(s.viagem_id || '—')}</td><td>${badge(s.status)}</td><td>${esc(s.sync_status)}</td><td>${esc(s.recebido_em)}</td></tr>`,
    )
    .join('');

  const falhas = dados.sync_falhas
    .map((f) => `<tr><td>${esc(f.mensagem || f.erro)}</td><td>${esc(f.recebido_em || f.criado_em)}</td></tr>`)
    .join('');

  return layout({
    title: 'Sincronização',
    active: 'sync',
    municipio: dados.municipio,
    flash,
    content: `
      <section class="ls-panel">
        <h2>Eventos recebidos (/api/driver/events)</h2>
        <div class="ls-table-wrap">
          <table class="ls-table"><thead><tr><th>Tipo</th><th>Motorista</th><th>Viagem</th><th>Quando</th></tr></thead>
          <tbody>${eventos || '<tr><td colspan="4">Nenhum evento</td></tr>'}</tbody></table>
        </div>
      </section>
      <section class="ls-panel">
        <h2>Status de viagens recebidos</h2>
        <div class="ls-table-wrap">
          <table class="ls-table"><thead><tr><th>Viagem</th><th>Status</th><th>Sync</th><th>Quando</th></tr></thead>
          <tbody>${statusRows || '<tr><td colspan="4">Nenhum status</td></tr>'}</tbody></table>
        </div>
      </section>
      <section class="ls-panel">
        <h2>Falhas de sync</h2>
        <div class="ls-table-wrap">
          <table class="ls-table"><thead><tr><th>Mensagem</th><th>Quando</th></tr></thead>
          <tbody>${falhas || '<tr><td colspan="2">Nenhuma falha registrada</td></tr>'}</tbody></table>
        </div>
      </section>`,
  });
}

function pageDebug() {
  const dados = store.dadosCompletos();
  const blocos = [
    ['Viagens', dados.viagens],
    ['Motoristas', dados.motoristas],
    ['Veículos', dados.veiculos],
    ['Pacientes', dados.pacientes],
    ['Passageiros', dados.passageiros],
    ['Eventos', dados.driver_events],
    ['Localizações', dados.driver_locations],
    ['Status de viagens', dados.trip_status],
  ]
    .map(
      ([titulo, json]) =>
        `<section class="ls-panel ls-debug"><h2>${esc(titulo)}</h2><pre>${esc(JSON.stringify(json, null, 2))}</pre></section>`,
    )
    .join('');

  return layout({
    title: 'Debug JSON',
    active: 'debug',
    municipio: dados.municipio,
    content: `<p>Estado bruto em memória/arquivo para testes.</p>${blocos}`,
  });
}

module.exports = {
  pageDashboard,
  pageOperacao,
  pageViagens,
  pageMotoristas,
  pageVeiculos,
  pagePacientes,
  pageRastreamento,
  pageSync,
  pageDebug,
};
