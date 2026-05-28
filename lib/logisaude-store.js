const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'logisaude-data.json');
const SEED_FILE = path.join(DATA_DIR, 'logisaude-data.json');

let cache = null;

function idNovo(prefixo = 'ls') {
  return `${prefixo}_${crypto.randomUUID().slice(0, 8)}`;
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function carregar() {
  if (cache) return cache;
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(DATA_FILE)) {
    let seed = estadoInicial();
    if (fs.existsSync(SEED_FILE)) {
      try {
        seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
      } catch {
        /* usa estadoInicial */
      }
    }
    salvar(seed);
    cache = seed;
    return cache;
  }

  try {
    cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return cache;
  } catch {
    const seed = estadoInicial();
    salvar(seed);
    cache = seed;
    return cache;
  }
}

function estadoInicial() {
  return {
    municipio: 'Poço das Antas',
    motoristas: [],
    veiculos: [],
    pacientes: [],
    passageiros: [],
    viagens: [],
    driver_events: [],
    driver_locations: [],
    driver_trips: [],
    trip_status: [],
    sync_falhas: [],
    meta: { versao: 1 },
  };
}

function salvar(dados = cache) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  dados.meta = { ...(dados.meta || {}), atualizado_em: new Date().toISOString() };
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(dados, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
  cache = dados;
  return cache;
}

function recarregar() {
  cache = null;
  return carregar();
}

function encontrar(lista, id) {
  return lista.find((item) => String(item.id) === String(id));
}

function nomeMotorista(dados, id) {
  const m = encontrar(dados.motoristas, id);
  return m ? m.nome : '—';
}

function nomeVeiculo(dados, id) {
  const v = encontrar(dados.veiculos, id);
  return v ? v.nome : '—';
}

function nomesPassageiros(dados, ids = []) {
  return ids
    .map((pid) => {
      const p = encontrar(dados.passageiros, pid) || encontrar(dados.pacientes, pid);
      return p ? p.nome : null;
    })
    .filter(Boolean)
    .join(', ') || '—';
}

function viagensHoje(dados) {
  const hoje = hojeISO();
  return dados.viagens.filter((v) => String(v.data || '').startsWith(hoje));
}

function dashboard() {
  const dados = carregar();
  const hoje = viagensHoje(dados);
  const emAndamento = dados.viagens.filter((v) => v.status === 'em_andamento');
  const motoristasAtivos = dados.motoristas.filter((m) => m.status === 'ativo');
  const veiculosDisponiveis = dados.veiculos.filter((v) => v.status === 'disponivel' || v.status === 'em_uso');
  const pendenciasSync =
    dados.sync_falhas.filter((f) => f.status !== 'resolvido').length +
    dados.trip_status.filter((t) => t.sync_status === 'pendente').length;

  return {
    municipio: dados.municipio,
    viagens_do_dia: hoje.length,
    viagens_em_andamento: emAndamento.length,
    pacientes_passageiros: dados.pacientes.length + dados.passageiros.length,
    motoristas_ativos: motoristasAtivos.length,
    veiculos_disponiveis: veiculosDisponiveis.length,
    eventos_recebidos: dados.driver_events.length,
    localizacoes_recebidas: dados.driver_locations.length,
    pendencias_sync: pendenciasSync,
    resumo: {
      viagens: dados.viagens.length,
      motoristas: dados.motoristas.length,
      veiculos: dados.veiculos.length,
      pacientes: dados.pacientes.length,
      passageiros: dados.passageiros.length,
    },
    data_hora: new Date().toISOString(),
  };
}

function statusApi() {
  const dados = carregar();
  return {
    online: true,
    plataforma: 'LogiSaúde',
    municipio: dados.municipio,
    modo: 'mock_json_local',
    data_hora: new Date().toISOString(),
  };
}

function criarMotorista(body) {
  const dados = carregar();
  const registro = {
    id: idNovo('mot'),
    nome: body.nome || 'Motorista sem nome',
    telefone: body.telefone || null,
    cnh: body.cnh || null,
    status: body.status || 'ativo',
    criado_em: new Date().toISOString(),
  };
  dados.motoristas.push(registro);
  salvar(dados);
  return registro;
}

function criarVeiculo(body) {
  const dados = carregar();
  const registro = {
    id: idNovo('vei'),
    nome: body.nome || 'Veículo sem nome',
    placa: body.placa || null,
    tipo: body.tipo || 'outro',
    status: body.status || 'disponivel',
    criado_em: new Date().toISOString(),
  };
  dados.veiculos.push(registro);
  salvar(dados);
  return registro;
}

function criarPaciente(body) {
  const dados = carregar();
  const registro = {
    id: idNovo('pac'),
    nome: body.nome || 'Paciente sem nome',
    destino: body.destino || body.motivo || null,
    tipo: body.tipo || 'paciente',
    observacoes: body.observacoes || null,
    criado_em: new Date().toISOString(),
  };
  dados.pacientes.push(registro);
  salvar(dados);
  return registro;
}

function criarPassageiro(body) {
  const dados = carregar();
  const registro = {
    id: idNovo('pas'),
    nome: body.nome || 'Passageiro sem nome',
    destino: body.destino || body.motivo || null,
    tipo: body.tipo || 'paciente',
    paciente_id: body.paciente_id || null,
    criado_em: new Date().toISOString(),
  };
  dados.passageiros.push(registro);
  salvar(dados);
  return registro;
}

function criarViagem(body) {
  const dados = carregar();
  const passageiroIds = body.passageiro_ids
    ? (Array.isArray(body.passageiro_ids) ? body.passageiro_ids : [body.passageiro_ids])
    : body.passageiro_id
      ? [body.passageiro_id]
      : [];

  const registro = {
    id: idNovo('via'),
    origem: body.origem || '',
    destino: body.destino || '',
    data: body.data || hojeISO(),
    hora: body.hora || new Date().toTimeString().slice(0, 5),
    status: body.status || 'agendada',
    motorista_id: body.motorista_id || null,
    veiculo_id: body.veiculo_id || null,
    passageiro_ids: passageiroIds.filter(Boolean),
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
  dados.viagens.push(registro);
  salvar(dados);
  return registro;
}

function atualizarStatusViagem(viagemId, status) {
  const dados = carregar();
  const viagem = encontrar(dados.viagens, viagemId);
  if (!viagem) return null;
  viagem.status = status;
  viagem.atualizado_em = new Date().toISOString();
  if (status === 'em_andamento' && viagem.veiculo_id) {
    const veiculo = encontrar(dados.veiculos, viagem.veiculo_id);
    if (veiculo) veiculo.status = 'em_uso';
  }
  if (status === 'concluida' && viagem.veiculo_id) {
    const veiculo = encontrar(dados.veiculos, viagem.veiculo_id);
    if (veiculo) veiculo.status = 'disponivel';
  }
  salvar(dados);
  return viagem;
}

function registrarEvento(body) {
  const dados = carregar();
  const evento = {
    id: idNovo('evt'),
    tipo: body.tipo || body.event_type || 'generico',
    motorista_id: body.motorista_id || body.driver_id || null,
    viagem_id: body.viagem_id || body.trip_id || null,
    payload: body.payload || body,
    recebido_em: new Date().toISOString(),
    origem: body.origem || 'app_motorista',
  };
  dados.driver_events.unshift(evento);
  if (dados.driver_events.length > 500) dados.driver_events.length = 500;
  salvar(dados);
  return evento;
}

function registrarLocalizacao(body) {
  const dados = carregar();
  const loc = {
    id: idNovo('loc'),
    motorista_id: body.motorista_id || body.driver_id || null,
    viagem_id: body.viagem_id || body.trip_id || null,
    latitude: Number(body.latitude ?? body.lat ?? 0),
    longitude: Number(body.longitude ?? body.lng ?? body.lon ?? 0),
    precisao: body.precisao ?? body.accuracy ?? null,
    recebido_em: body.recebido_em || new Date().toISOString(),
    origem: body.origem || 'app_motorista',
  };
  dados.driver_locations.unshift(loc);
  if (dados.driver_locations.length > 500) dados.driver_locations.length = 500;
  salvar(dados);
  return loc;
}

function registrarTripStatus(body) {
  const dados = carregar();
  const registro = {
    id: idNovo('tst'),
    viagem_id: body.viagem_id || body.trip_id || null,
    motorista_id: body.motorista_id || body.driver_id || null,
    status: body.status || 'desconhecido',
    sync_status: body.sync_status || 'recebido',
    payload: body,
    recebido_em: new Date().toISOString(),
  };
  dados.trip_status.unshift(registro);
  if (body.viagem_id || body.trip_id) {
    const viagem = encontrar(dados.viagens, body.viagem_id || body.trip_id);
    if (viagem && body.status) {
      viagem.status = body.status;
      viagem.atualizado_em = new Date().toISOString();
    }
  }
  salvar(dados);
  return registro;
}

function enriquecerViagens(dados) {
  return dados.viagens.map((v) => ({
    ...v,
    motorista_nome: nomeMotorista(dados, v.motorista_id),
    veiculo_nome: nomeVeiculo(dados, v.veiculo_id),
    passageiros_nomes: nomesPassageiros(dados, v.passageiro_ids),
  }));
}

function dadosCompletos() {
  const dados = carregar();
  return {
    ...dados,
    viagens_enriquecidas: enriquecerViagens(dados),
  };
}

module.exports = {
  carregar,
  salvar,
  recarregar,
  dashboard,
  statusApi,
  dadosCompletos,
  criarMotorista,
  criarVeiculo,
  criarPaciente,
  criarPassageiro,
  criarViagem,
  atualizarStatusViagem,
  registrarEvento,
  registrarLocalizacao,
  registrarTripStatus,
  nomeMotorista,
  nomeVeiculo,
  nomesPassageiros,
  encontrar,
  enriquecerViagens,
  idNovo,
};
