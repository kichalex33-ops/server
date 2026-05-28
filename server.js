const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'server-data.json');

carregarEnvLocal();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('public'));

const estado = carregarEstado();

const colecoes = {
  perfis_ace: estado.perfis_ace,
  pontos_estrategicos: estado.pontos_estrategicos,
  visitas_pe: estado.visitas_pe,
  visitas_domiciliares: estado.visitas_domiciliares,
  bti: estado.bti,
  bti_pontos: estado.bti_pontos,
  ovitrampas: estado.ovitrampas,
  ovitrampa_checagens: estado.ovitrampa_checagens,
  coletas_larvarias: estado.coletas_larvarias,
  casos_dengue: estado.casos_dengue,
  esporotricose: estado.esporotricose,
  quarteiroes: estado.quarteiroes,
  atividades_quarteirao: estado.atividades_quarteirao,
  localidades: estado.localidades,
  setores_operacionais: estado.setores_operacionais,
  quarteiroes_operacionais: estado.quarteiroes_operacionais,
  atribuicoes_setor: estado.atribuicoes_setor,
  progresso_quarteirao: estado.progresso_quarteirao,
  imoveis: estado.imoveis,
  moradores: estado.moradores,
  tubitos: estado.tubitos,
  focos: estado.focos,
  fotos: estado.fotos,
  dispositivos: estado.dispositivos,
  usuarios: estado.usuarios,
  sync_logs: estado.sync_logs,
  conflitos: estado.conflitos,
  auditoria: estado.auditoria,
};

const rotasBase = {
  'perfis-ace': colecoes.perfis_ace,
  pes: colecoes.pontos_estrategicos,
  'visitas-pe': colecoes.visitas_pe,
  'visitas-domiciliares': colecoes.visitas_domiciliares,
  bti: colecoes.bti,
  'bti-pontos': colecoes.bti_pontos,
  ovitrampas: colecoes.ovitrampas,
  'ovitrampas/checagens': colecoes.ovitrampa_checagens,
  'coletas-larvarias': colecoes.coletas_larvarias,
  'casos-dengue': colecoes.casos_dengue,
  esporotricose: colecoes.esporotricose,
  quarteiroes: colecoes.quarteiroes,
  'atividades-quarteirao': colecoes.atividades_quarteirao,
  'areas-prioritarias': estado.areas_prioritarias,
  'lira-lia': estado.lira_lia_visitas,
  'exclusoes-log': estado.exclusoes_log,
  'alertas-emergencia': estado.alertas_emergencia,
  localidades: colecoes.localidades,
  'setores-operacionais': colecoes.setores_operacionais,
  'quarteiroes-operacionais': colecoes.quarteiroes_operacionais,
  'atribuicoes-setor': colecoes.atribuicoes_setor,
  'progresso-quarteirao': colecoes.progresso_quarteirao,
  'auditoria-eventos': colecoes.auditoria,
};

function estadoInicial() {
  return {
    perfis_ace: [],
    pontos_estrategicos: [],
    visitas_pe: [],
    visitas_domiciliares: [],
    bti: [],
    bti_pontos: [],
    ovitrampas: [],
    ovitrampa_checagens: [],
    coletas_larvarias: [],
    casos_dengue: [],
    esporotricose: [],
    quarteiroes: [],
    atividades_quarteirao: [],
    areas_prioritarias: [],
    lira_lia_visitas: [],
    exclusoes_log: [],
    alertas_emergencia: [],
    localidades: [],
    setores_operacionais: [],
    quarteiroes_operacionais: [],
    atribuicoes_setor: [],
    progresso_quarteirao: [],
    imoveis: [],
    moradores: [],
    tubitos: [],
    focos: [],
    fotos: [],
    dispositivos: [],
    usuarios: [
      {
        id: 'admin-local',
        nome: 'Administrador local',
        perfil: 'administrador',
        status: 'ativo',
        origem: 'modo_local',
      },
    ],
    sync_logs: [],
    conflitos: [],
    auditoria: [],
    meta: {
      criado_em: new Date().toISOString(),
      versao_schema: 1,
    },
  };
}

function carregarEnvLocal() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const linhas = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const linha of linhas) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#') || !limpa.includes('=')) continue;
    const [chave, ...resto] = limpa.split('=');
    if (!process.env[chave]) {
      process.env[chave] = resto.join('=').trim();
    }
  }
}

function carregarEstado() {
  const inicial = estadoInicial();
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(DATA_FILE)) {
    escreverEstado(inicial);
    return inicial;
  }

  try {
    const salvo = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return mesclarEstado(inicial, salvo);
  } catch (error) {
    const backup = `${DATA_FILE}.corrompido-${Date.now()}`;
    fs.copyFileSync(DATA_FILE, backup);
    escreverEstado(inicial);
    return inicial;
  }
}

function mesclarEstado(base, salvo) {
  const merged = { ...base, ...salvo };
  for (const chave of Object.keys(base)) {
    if (Array.isArray(base[chave])) {
      merged[chave] = Array.isArray(salvo[chave]) ? salvo[chave] : base[chave];
    }
  }
  merged.meta = { ...base.meta, ...(salvo.meta || {}) };
  return merged;
}

function escreverEstado(dados = estado) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(dados, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

function idNovo(prefixo = 'srv') {
  return `${prefixo}_${crypto.randomUUID()}`;
}

function proximoId(lista) {
  if (!lista.length) return 1;
  return Math.max(...lista.map((item) => Number(item.id) || 0)) + 1;
}

function registrarSyncLog({ entidade, entityId, operacao, status, origem, erro }) {
  const log = {
    id: idNovo('sync'),
    entidade,
    entity_id: entityId ?? null,
    operacao,
    status,
    origem: origem || 'api',
    erro: erro || null,
    criado_em: new Date().toISOString(),
  };
  colecoes.sync_logs.unshift(log);
  if (colecoes.sync_logs.length > 500) colecoes.sync_logs.length = 500;
  return log;
}

function montarRegistro(lista, dados, entidade) {
  const agora = new Date();
  const registro = {
    id: dados.id || proximoId(lista),
    municipio: dados.municipio || dados.municipio_id || null,
    ace_responsavel: dados.ace_responsavel || dados.agente || dados.ace_id || null,
    latitude: dados.latitude ?? dados.centro_latitude ?? null,
    longitude: dados.longitude ?? dados.centro_longitude ?? null,
    data: dados.data || dados.data_visita || dados.data_registro || agora.toISOString().slice(0, 10),
    hora: dados.hora || agora.toTimeString().slice(0, 5),
    observacoes: dados.observacoes || null,
    status: dados.status || dados.situacao || dados.sync_status || null,
    foto_path: dados.foto_path || dados.foto || null,
    tipo: dados.tipo || entidade,
    origem: dados.origem || 'app_flutter',
    sincronizado_em: dados.sincronizado_em || agora.toISOString(),
    created_at: dados.created_at || agora.toISOString(),
    updated_at: dados.updated_at || agora.toISOString(),
    excluido: dados.excluido || false,
    ...dados,
  };

  if (dados.device_id) upsertPorId(colecoes.dispositivos, {
    id: dados.device_id,
    device_id: dados.device_id,
    municipio: registro.municipio,
    ace_responsavel: registro.ace_responsavel,
    ultimo_sync_em: agora.toISOString(),
    status: 'ativo',
  });

  registrarSyncLog({
    entidade,
    entityId: registro.id,
    operacao: 'receber',
    status: 'synced',
    origem: registro.origem,
  });

  return registro;
}

function upsertPorId(lista, registro) {
  const idx = lista.findIndex((item) => String(item.id) === String(registro.id));
  if (idx >= 0) {
    lista[idx] = { ...lista[idx], ...registro, updated_at: new Date().toISOString() };
    return lista[idx];
  }
  lista.push(registro);
  return registro;
}

function criarRotasBase(nome, lista) {
  app.get(`/api/${nome}`, (req, res) => {
    res.json(aplicarFiltros(lista, req.query));
  });

  app.post(`/api/${nome}`, (req, res) => {
    const registro = montarRegistro(lista, req.body || {}, nome);
    upsertPorId(lista, registro);
    escreverEstado();

    res.status(201).json({ sucesso: true, dados: registro });
  });
}

function contarPorStatus(lista, status) {
  return lista.filter((item) => item.status === status && !estaExcluido(item)).length;
}

function estaExcluido(item) {
  return item.excluido === true || item.status === 'excluido';
}

function ativos(lista) {
  return lista.filter((item) => !estaExcluido(item));
}

function ehFocoPositivo(item) {
  return (
    item.foco_positivo === true ||
    item.foco_positivo === 1 ||
    item.focoPositivo === true ||
    Number(item.total_focos || item.focos || 0) > 0 ||
    item.resultado === 'Positiva' ||
    item.resultado === 'Positivo' ||
    item.status === 'Positiva' ||
    item.status === 'Positivo' ||
    item.status === 'Com foco'
  );
}

function dashboard() {
  const pes = ativos(colecoes.pontos_estrategicos);
  const pesEmDia = contarPorStatus(pes, 'Em dia');
  const pesVencendo = contarPorStatus(pes, 'Vencendo');
  const pesAtrasados = contarPorStatus(pes, 'Atrasado');
  const focosPositivos =
    colecoes.visitas_pe.filter(ehFocoPositivo).length +
    colecoes.visitas_domiciliares.filter(ehFocoPositivo).length +
    colecoes.coletas_larvarias.filter(ehFocoPositivo).length +
    colecoes.ovitrampa_checagens.filter(ehFocoPositivo).length +
    colecoes.focos.filter((item) => !estaExcluido(item)).length;
  const ovitrampasPositivas =
    colecoes.ovitrampas.filter(ehFocoPositivo).length +
    colecoes.ovitrampa_checagens.filter(ehFocoPositivo).length;

  return {
    totalPEs: pes.length,
    ativos: pesEmDia,
    vencendo: pesVencendo,
    atrasados: pesAtrasados,
    visitasPE: ativos(colecoes.visitas_pe).length,
    visitasDomiciliares: ativos(colecoes.visitas_domiciliares).length,
    aplicacoesBTI: ativos(colecoes.bti).length,
    ovitrampasCadastradas: ativos(colecoes.ovitrampas).length,
    ovitrampasPositivas,
    coletasLarvarias: ativos(colecoes.coletas_larvarias).length,
    casosDengue: ativos(colecoes.casos_dengue).length,
    casosEsporotricose: ativos(colecoes.esporotricose).length,
    focosPositivos,
    tubitos: ativos(colecoes.tubitos).length,
    quarteiroes: ativos(colecoes.quarteiroes_operacionais).length + ativos(colecoes.quarteiroes).length,
    imoveis: ativos(colecoes.imoveis).length,
    dispositivos: ativos(colecoes.dispositivos).length,
    syncPendentes: colecoes.sync_logs.filter((item) => item.status === 'pending').length,
    syncFalhas: colecoes.sync_logs.filter((item) => item.status === 'failed').length,
    pes_em_dia: pesEmDia,
    pes_vencendo: pesVencendo,
    pes_atrasados: pesAtrasados,
    total_visitas_pe: ativos(colecoes.visitas_pe).length,
    visitas_domiciliares: ativos(colecoes.visitas_domiciliares).length,
    focos_positivos: focosPositivos,
    aplicacoes_bti: ativos(colecoes.bti).length,
    ovitrampas_cadastradas: ativos(colecoes.ovitrampas).length,
    ovitrampas_positivas: ovitrampasPositivas,
    coletas_larvarias: ativos(colecoes.coletas_larvarias).length,
    casos_dengue: ativos(colecoes.casos_dengue).length,
    casos_esporotricose: ativos(colecoes.esporotricose).length,
  };
}

function aplicarFiltros(lista, query = {}) {
  let resultado = ativos(lista);
  const { municipio, ace, status, data, busca, page = 1, limit = 50 } = query;

  if (municipio) resultado = resultado.filter((item) => String(item.municipio || item.municipio_id || '').toLowerCase().includes(String(municipio).toLowerCase()));
  if (ace) resultado = resultado.filter((item) => String(item.ace_responsavel || item.agente || item.ace_id || '').toLowerCase().includes(String(ace).toLowerCase()));
  if (status) resultado = resultado.filter((item) => String(item.status || item.sync_status || '').toLowerCase().includes(String(status).toLowerCase()));
  if (data) resultado = resultado.filter((item) => String(item.data || item.data_visita || item.created_at || '').startsWith(String(data)));
  if (busca) {
    const termo = String(busca).toLowerCase();
    resultado = resultado.filter((item) => JSON.stringify(item).toLowerCase().includes(termo));
  }

  const pagina = Math.max(Number(page) || 1, 1);
  const tamanho = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const total = resultado.length;
  const inicio = (pagina - 1) * tamanho;
  return {
    total,
    page: pagina,
    limit: tamanho,
    data: resultado.slice(inicio, inicio + tamanho),
  };
}

function mapaDados(query = {}) {
  return {
    pes: aplicarFiltros(colecoes.pontos_estrategicos, query).data,
    visitas: [
      ...aplicarFiltros(colecoes.visitas_pe, query).data,
      ...aplicarFiltros(colecoes.visitas_domiciliares, query).data,
    ],
    bti: aplicarFiltros(colecoes.bti, query).data,
    ovitrampas: aplicarFiltros(colecoes.ovitrampas, query).data,
    tubitos: aplicarFiltros(colecoes.tubitos, query).data,
    focos: [
      ...aplicarFiltros(colecoes.focos, query).data,
      ...ativos(colecoes.visitas_pe).filter(ehFocoPositivo),
      ...ativos(colecoes.visitas_domiciliares).filter(ehFocoPositivo),
    ],
    setores: aplicarFiltros(colecoes.setores_operacionais, query).data,
    quarteiroes: [
      ...aplicarFiltros(colecoes.quarteiroes, query).data,
      ...aplicarFiltros(colecoes.quarteiroes_operacionais, query).data,
    ],
    imoveis: aplicarFiltros(colecoes.imoveis, query).data,
  };
}

function registrarAuditoria({
  entidade,
  entidadeId,
  usuarioId,
  perfil,
  campo,
  valorAnterior,
  valorNovo,
  justificativa,
  acao = 'editar',
}) {
  const log = {
    id: idNovo('audit'),
    entidade,
    entidade_id: entidadeId,
    usuario_id: usuarioId,
    perfil_usuario: perfil || 'leitura',
    data_hora: new Date().toISOString(),
    campo_alterado: campo,
    valor_anterior: valorAnterior,
    valor_novo: valorNovo,
    justificativa,
    origem: 'comando_central',
    acao,
  };
  colecoes.auditoria.unshift(log);
  return log;
}

function perfilPodeEditar(perfil) {
  return ['administrador', 'coordenador', 'supervisor'].includes(perfil);
}

function resolverUsuario(req) {
  return {
    id: req.body.usuario_id || req.headers['x-usuario-id'] || 'admin-local',
    perfil: req.body.perfil_usuario || req.headers['x-perfil-usuario'] || 'administrador',
  };
}

function exigirSenhaLocal(req, res, next) {
  const senhaEsperada = process.env.COMANDO_SENHA || 'admin123';
  const senha = req.headers['x-comando-senha'] || req.body?.senha;
  if (senha === senhaEsperada) return next();
  return res.status(401).json({ erro: 'Senha do Comando Central invalida.' });
}

function patchComAuditoria(entidade, lista) {
  return (req, res) => {
    const { usuario_id, justificativa, dados = {}, perfil_usuario } = req.body || {};
    const usuario = resolverUsuario(req);
    const perfil = perfil_usuario || usuario.perfil;

    if (!perfilPodeEditar(perfil)) {
      return res.status(403).json({ erro: 'Perfil sem permissao de edicao.' });
    }
    if (!usuario_id && !usuario.id) {
      return res.status(400).json({ erro: 'usuario_id e obrigatorio.' });
    }
    if (!justificativa || String(justificativa).trim().length < 5) {
      return res.status(400).json({ erro: 'Justificativa obrigatoria.' });
    }

    const item = lista.find((registro) => String(registro.id) === String(req.params.id));
    if (!item || estaExcluido(item)) {
      return res.status(404).json({ erro: 'Registro nao encontrado.' });
    }

    const alteracoes = Object.keys(dados).filter((campo) => !['id'].includes(campo));
    if (!alteracoes.length) {
      return res.status(400).json({ erro: 'Informe dados alterados.' });
    }

    for (const campo of alteracoes) {
      registrarAuditoria({
        entidade,
        entidadeId: item.id,
        usuarioId: usuario_id || usuario.id,
        perfil,
        campo,
        valorAnterior: item[campo] ?? null,
        valorNovo: dados[campo],
        justificativa,
      });
      item[campo] = dados[campo];
    }

    item.updated_at = new Date().toISOString();
    item.alterado_por_comando = true;
    escreverEstado();

    res.json({ sucesso: true, dados: item });
  };
}

function softDeleteComAuditoria(entidade, lista) {
  return (req, res) => {
    const { usuario_id, justificativa, perfil_usuario } = req.body || {};
    if (!justificativa || String(justificativa).trim().length < 5) {
      return res.status(400).json({ erro: 'Justificativa de exclusao obrigatoria.' });
    }
    const item = lista.find((registro) => String(registro.id) === String(req.params.id));
    if (!item) return res.status(404).json({ erro: 'Registro nao encontrado.' });

    item.status = 'excluido';
    item.excluido = true;
    item.excluido_em = new Date().toISOString();
    item.excluido_por = usuario_id || 'admin-local';
    item.justificativa_exclusao = justificativa;

    registrarAuditoria({
      entidade,
      entidadeId: item.id,
      usuarioId: usuario_id || 'admin-local',
      perfil: perfil_usuario || 'administrador',
      campo: 'status',
      valorAnterior: null,
      valorNovo: 'excluido',
      justificativa,
      acao: 'excluir_logico',
    });
    escreverEstado();
    res.json({ sucesso: true, dados: item });
  };
}

app.get('/api/status', (req, res) => {
  res.json({
    online: true,
    servidor: 'Plataforma Territorial Epidemiologica',
    modo: 'Servidor local',
    armazenamento: 'JSON local com escrita atomica',
    futuro_banco: 'PostgreSQL/Supabase',
    data_hora: new Date().toISOString(),
  });
});

app.get('/api/dashboard', (req, res) => res.json(dashboard()));
app.get('/api/mapa/dados', (req, res) => res.json(mapaDados(req.query)));

for (const [nome, lista] of Object.entries(rotasBase)) {
  criarRotasBase(nome, lista);
}

app.post('/api/tubitos/reservar', (req, res) => {
  const quantidade = Math.max(Number(req.body.quantidade) || 0, 0);
  if (quantidade <= 0) return res.status(400).json({ erro: 'Quantidade invalida.' });

  const ultimo = Math.max(0, ...colecoes.tubitos.map((item) => Number(item.numero) || 0));
  const primeiro = ultimo + 1;
  const agora = new Date().toISOString();

  for (let i = 0; i < quantidade; i++) {
    colecoes.tubitos.push({
      id: idNovo('tubito'),
      numero: primeiro + i,
      status: 'reservado',
      municipio: req.body.municipio || null,
      ace_responsavel: req.body.ace_responsavel || null,
      reservado_em: agora,
      origem: 'servidor_local',
    });
  }
  escreverEstado();
  res.json({ primeiro_numero: primeiro, quantidade });
});

app.get('/api/painel/dashboard', (req, res) => res.json(dashboard()));
app.get('/api/painel/mapa', (req, res) => res.json(mapaDados(req.query)));
app.get('/api/painel/sync-logs', (req, res) => res.json(aplicarFiltros(colecoes.sync_logs, req.query)));
app.get('/api/painel/pes', (req, res) => res.json(aplicarFiltros(colecoes.pontos_estrategicos, req.query)));
app.get('/api/painel/visitas', (req, res) => res.json(aplicarFiltros([...colecoes.visitas_pe, ...colecoes.visitas_domiciliares], req.query)));
app.get('/api/painel/bti', (req, res) => res.json(aplicarFiltros(colecoes.bti, req.query)));
app.get('/api/painel/ovitrampas', (req, res) => res.json(aplicarFiltros(colecoes.ovitrampas, req.query)));
app.get('/api/painel/tubitos', (req, res) => res.json(aplicarFiltros(colecoes.tubitos, req.query)));
app.get('/api/painel/quarteiroes', (req, res) => res.json(aplicarFiltros([...colecoes.quarteiroes, ...colecoes.quarteiroes_operacionais], req.query)));
app.get('/api/painel/imoveis', (req, res) => res.json(aplicarFiltros(colecoes.imoveis, req.query)));
app.get('/api/painel/fotos', (req, res) => res.json(aplicarFiltros([
  ...colecoes.fotos,
  ...colecoes.visitas_pe.filter((item) => item.foto_path),
  ...colecoes.visitas_domiciliares.filter((item) => item.foto_path),
], req.query)));

app.post('/api/comando/login', (req, res) => {
  const senhaEsperada = process.env.COMANDO_SENHA || 'admin123';
  if ((req.body || {}).senha !== senhaEsperada) {
    return res.status(401).json({ erro: 'Senha invalida.' });
  }
  res.json({
    token: 'local-temporario',
    usuario: { id: 'admin-local', nome: 'Administrador local', perfil: 'administrador' },
  });
});

app.get('/api/comando/dashboard', (req, res) => res.json({ ...dashboard(), auditoria: colecoes.auditoria.length, conflitos: colecoes.conflitos.length }));
app.get('/api/comando/dados', (req, res) => res.json(colecoes));
app.get('/api/comando/auditoria', (req, res) => res.json(aplicarFiltros(colecoes.auditoria, req.query)));
app.get('/api/comando/sync', (req, res) => res.json(aplicarFiltros(colecoes.sync_logs, req.query)));
app.get('/api/comando/pes', (req, res) => res.json(aplicarFiltros(colecoes.pontos_estrategicos, req.query)));
app.get('/api/comando/visitas', (req, res) => res.json(aplicarFiltros([...colecoes.visitas_pe, ...colecoes.visitas_domiciliares], req.query)));
app.get('/api/comando/bti', (req, res) => res.json(aplicarFiltros(colecoes.bti, req.query)));
app.get('/api/comando/ovitrampas', (req, res) => res.json(aplicarFiltros(colecoes.ovitrampas, req.query)));
app.get('/api/comando/tubitos', (req, res) => res.json(aplicarFiltros(colecoes.tubitos, req.query)));
app.get('/api/comando/tubitos/conflitos', (req, res) => res.json(aplicarFiltros(colecoes.conflitos.filter((item) => item.tipo === 'tubito'), req.query)));
app.get('/api/comando/quarteiroes', (req, res) => res.json(aplicarFiltros([...colecoes.quarteiroes, ...colecoes.quarteiroes_operacionais], req.query)));
app.get('/api/comando/setores', (req, res) => res.json(aplicarFiltros(colecoes.setores_operacionais, req.query)));
app.get('/api/comando/imoveis', (req, res) => res.json(aplicarFiltros(colecoes.imoveis, req.query)));
app.get('/api/comando/usuarios', (req, res) => res.json(aplicarFiltros(colecoes.usuarios, req.query)));
app.get('/api/comando/dispositivos', (req, res) => res.json(aplicarFiltros(colecoes.dispositivos, req.query)));

app.patch('/api/comando/pes/:id', exigirSenhaLocal, patchComAuditoria('pontos_estrategicos', colecoes.pontos_estrategicos));
app.patch('/api/comando/visitas/:id', exigirSenhaLocal, (req, res, next) => {
  const lista = [...colecoes.visitas_pe, ...colecoes.visitas_domiciliares];
  return patchComAuditoria('visitas', lista)(req, res, next);
});
app.patch('/api/comando/tubitos/:id', exigirSenhaLocal, patchComAuditoria('tubitos', colecoes.tubitos));
app.patch('/api/comando/quarteiroes/:id', exigirSenhaLocal, (req, res, next) => {
  const lista = [...colecoes.quarteiroes, ...colecoes.quarteiroes_operacionais];
  return patchComAuditoria('quarteiroes', lista)(req, res, next);
});
app.patch('/api/comando/setores/:id', exigirSenhaLocal, patchComAuditoria('setores_operacionais', colecoes.setores_operacionais));
app.patch('/api/comando/imoveis/:id', exigirSenhaLocal, patchComAuditoria('imoveis', colecoes.imoveis));

app.delete('/api/comando/pes/:id', exigirSenhaLocal, softDeleteComAuditoria('pontos_estrategicos', colecoes.pontos_estrategicos));
app.delete('/api/comando/tubitos/:id', exigirSenhaLocal, softDeleteComAuditoria('tubitos', colecoes.tubitos));
app.delete('/api/comando/quarteiroes/:id', exigirSenhaLocal, (req, res, next) => {
  const lista = [...colecoes.quarteiroes, ...colecoes.quarteiroes_operacionais];
  return softDeleteComAuditoria('quarteiroes', lista)(req, res, next);
});

app.post('/api/comando/tubitos/conflitos/:id/resolver', exigirSenhaLocal, (req, res) => {
  const { usuario_id, justificativa, resolucao } = req.body || {};
  if (!justificativa || String(justificativa).trim().length < 5) {
    return res.status(400).json({ erro: 'Justificativa obrigatoria.' });
  }
  const conflito = colecoes.conflitos.find((item) => String(item.id) === String(req.params.id));
  if (!conflito) return res.status(404).json({ erro: 'Conflito nao encontrado.' });

  conflito.status = 'resolvido';
  conflito.resolucao = resolucao || 'resolvido_manual';
  conflito.resolvido_em = new Date().toISOString();
  conflito.resolvido_por = usuario_id || 'admin-local';
  registrarAuditoria({
    entidade: 'conflitos',
    entidadeId: conflito.id,
    usuarioId: usuario_id || 'admin-local',
    perfil: req.body.perfil_usuario || 'administrador',
    campo: 'status',
    valorAnterior: 'pendente',
    valorNovo: 'resolvido',
    justificativa,
    acao: 'resolver_conflito',
  });
  escreverEstado();
  res.json({ sucesso: true, dados: conflito });
});

app.get(/^\/painel(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'painel.html'));
});

app.get(/^\/comando(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'comando.html'));
});

// ─── ACE Territorial: atalho painel ─────────────────────────────────
app.get('/painel-ace', (req, res) => {
  res.redirect(302, '/painel');
});

// ─── LogiSaúde Web + API + Driver App API ───────────────────────────
require('./routes/logisaude.routes')(app);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor unificado rodando na porta ${PORT}`);
  console.log(`Portal: http://localhost:${PORT}/`);
  console.log(`ACE Painel: http://localhost:${PORT}/painel-ace`);
  console.log(`ACE Comando: http://localhost:${PORT}/comando`);
  console.log(`LogiSaúde: http://localhost:${PORT}/logisaude`);
});
