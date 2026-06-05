const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.join(__dirname, "..", "..");
const defaultDataFile = path.join(rootDir, "data", "painel-logistico.json");
const defaultBackupDir = path.join(rootDir, "data", "backups");

const collectionPrefixes = {
  usuarios: "usr",
  motoristas: "mot",
  veiculos: "vei",
  pacientes: "pac",
  passageiros: "pas",
  viagens: "via",
  localizacoes: "loc",
  eventos: "evt",
  alertas: "alt",
  mensagens: "msg",
  checklists: "chk",
  avisos: "avs",
  comprovantes: "cmp",
  emergencias: "emg",
  auditLogs: "aud",
  insurance_events: "ins",
  assistance_events: "ast",
  giroflexEventos: "gir",
  motoristaHistorico: "mh",
  lgpdConsents: "lgp",
  ocorrencias: "oco",
  despesas: "des",
  syncLogs: "syn"
};

const tripDefaultStatus = "AGUARDANDO";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function createEmptyData() {
  return {
    usuarios: [],
    motoristas: [],
    veiculos: [],
    pacientes: [],
    passageiros: [],
    viagens: [],
    localizacoes: [],
    eventos: [],
    alertas: [],
    mensagens: [],
    checklists: [],
    avisos: [],
    comprovantes: [],
    emergencias: [],
    auditLogs: [],
    insurance_events: [],
    assistance_events: [],
    giroflexEventos: [],
    motoristaHistorico: [],
    lgpdConsents: [],
    ocorrencias: [],
    despesas: [],
    syncLogs: [],
    config: {
      app: "Painel Logistico",
      empresa: "Andrade Gestao em Saude",
      ambiente: "local"
    }
  };
}

function createSeedData() {
  const data = createEmptyData();
  const createdAt = nowIso();

  data.motoristas.push({
    id: "mot-001",
    nome: "Joao Santos",
    telefone: "(00) 90000-0000",
    status: "ativo",
    criadoEm: createdAt,
    atualizadoEm: createdAt
  });
  data.veiculos.push({
    id: "vei-001",
    tipo: "Van Saude",
    nome: "Van Saude 01",
    prefixo: "SMS-01",
    placa: "LOG-2045",
    capacidade: 7,
    status: "operacional",
    criadoEm: createdAt,
    atualizadoEm: createdAt
  });
  data.pacientes.push(
    { id: "pac-001", nome: "Maria da Silva", tipo: "paciente", criadoEm: createdAt, atualizadoEm: createdAt },
    { id: "pac-002", nome: "Ana Souza", tipo: "paciente", criadoEm: createdAt, atualizadoEm: createdAt },
    { id: "pac-003", nome: "Jose da Silva", tipo: "acompanhante", acompanhanteDe: "pac-001", criadoEm: createdAt, atualizadoEm: createdAt },
    { id: "pac-004", nome: "Pedro Souza", tipo: "acompanhante", acompanhanteDe: "pac-002", criadoEm: createdAt, atualizadoEm: createdAt }
  );
  data.viagens.push({
    id: "VIA-SJS-0001",
    codigo: "VIA-SJS-0001",
    origem: "UBS Sao Jose do Sul",
    destino: "Hospital Montenegro",
    motorista_id: "mot-001",
    motoristaId: "mot-001",
    veiculo_id: "vei-001",
    veiculoId: "vei-001",
    status: tripDefaultStatus,
    prioridade: "NORMAL",
    data_viagem: today(),
    dataViagem: today(),
    km_saida: null,
    km_retorno: null,
    hora_saida: null,
    hora_retorno: null,
    hora_finalizacao: null,
    observacoes: "",
    km_estimado: 42,
    tempo_estimado: "58 min",
    created_at: createdAt,
    updated_at: createdAt,
    criadoEm: createdAt,
    atualizadoEm: createdAt
  });
  data.passageiros.push(
    createSeedPassenger("pas-001", "pac-001", "Maria da Silva", "PACIENTE", null, createdAt),
    createSeedPassenger("pas-002", "pac-003", "Jose da Silva", "ACOMPANHANTE", "pac-001", createdAt),
    createSeedPassenger("pas-003", "pac-002", "Ana Souza", "PACIENTE", null, createdAt),
    createSeedPassenger("pas-004", "pac-004", "Pedro Souza", "ACOMPANHANTE", "pac-002", createdAt)
  );
  data.localizacoes.push({
    id: "loc-001",
    viagemId: "VIA-SJS-0001",
    viagem_id: "VIA-SJS-0001",
    veiculoId: "vei-001",
    veiculo_id: "vei-001",
    motoristaId: "mot-001",
    motorista_id: "mot-001",
    latitude: -29.5448,
    longitude: -51.4827,
    velocidade: 0,
    precisao: 10,
    bateria: 100,
    status_viagem: tripDefaultStatus,
    timestamp_dispositivo: createdAt,
    created_at: createdAt,
    rotulo: "UBS Sao Jose do Sul",
    registrado_em: createdAt,
    criadoEm: createdAt,
    atualizadoEm: createdAt
  });

  return data;
}

function createSeedPassenger(id, pacienteId, nome, tipo, acompanhanteDe, createdAt) {
  return {
    id,
    viagemId: "VIA-SJS-0001",
    viagem_id: "VIA-SJS-0001",
    pacienteId,
    paciente_id: pacienteId,
    tipo,
    nome,
    cpf: "",
    telefone: "",
    necessidade_especial: false,
    cadeirante: false,
    usa_muletas: false,
    mobilidade_reduzida: false,
    necessita_auxilio: false,
    acompanhante: tipo === "ACOMPANHANTE",
    paciente_referencia: acompanhanteDe,
    acompanhanteDe,
    status: "AGUARDANDO",
    observacoes_embarque: "",
    observacoes: "",
    possuiNecessidadeEspecial: false,
    created_at: createdAt,
    updated_at: createdAt,
    criadoEm: createdAt,
    atualizadoEm: createdAt
  };
}

function createRepository(options = {}) {
  const dataFile = options.dataFile || defaultDataFile;
  const backupDir = options.backupDir || defaultBackupDir;

  function ensureDataFile() {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.mkdirSync(backupDir, { recursive: true });

    if (!fs.existsSync(dataFile)) {
      writeData(createSeedData(), false);
      return;
    }

    const data = loadData();
    const hasSeed = Object.keys(collectionPrefixes).some((collection) => Array.isArray(data[collection]) && data[collection].length > 0);
    if (!hasSeed) {
      writeData(createSeedData(), false);
    }
  }

  function loadData() {
    ensureParent();
    if (!fs.existsSync(dataFile)) return createSeedData();

    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : createEmptyData();
    return { ...createEmptyData(), ...parsed };
  }

  function saveData(data) {
    writeData(data, true);
    return data;
  }

  function getCollection(collection) {
    const data = loadData();
    assertCollection(data, collection);
    return data[collection];
  }

  function addItem(collection, item) {
    const data = loadData();
    assertCollection(data, collection);
    const timestamp = nowIso();
    const record = {
      id: item.id || nextId(data[collection], collection),
      ...item,
      criadoEm: item.criadoEm || timestamp,
      atualizadoEm: timestamp
    };
    data[collection].push(record);
    saveData(data);
    return record;
  }

  function updateItem(collection, id, patch) {
    const data = loadData();
    assertCollection(data, collection);
    const index = data[collection].findIndex((item) => String(item.id) === String(id));
    if (index === -1) return null;

    data[collection][index] = {
      ...data[collection][index],
      ...patch,
      id: data[collection][index].id,
      atualizadoEm: nowIso()
    };
    saveData(data);
    return data[collection][index];
  }

  function findById(collection, id) {
    return getCollection(collection).find((item) => String(item.id) === String(id)) || null;
  }

  function ensureParent() {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  }

  function writeData(data, backup) {
    ensureParent();
    fs.mkdirSync(backupDir, { recursive: true });
    if (backup && fs.existsSync(dataFile)) {
      const backupName = `painel-logistico-${Date.now()}.json`;
      fs.copyFileSync(dataFile, path.join(backupDir, backupName));
    }
    const tempFile = `${dataFile}.tmp`;
    fs.writeFileSync(tempFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    fs.renameSync(tempFile, dataFile);
  }

  return {
    ensureDataFile,
    loadData,
    saveData,
    getCollection,
    addItem,
    updateItem,
    findById
  };
}

function assertCollection(data, collection) {
  if (!Array.isArray(data[collection])) {
    throw new Error(`Colecao invalida: ${collection}`);
  }
}

function nextId(items, collection) {
  const prefix = collectionPrefixes[collection] || "item";
  const number = String(items.length + 1).padStart(4, "0");
  return `${prefix}-${number}-${Date.now()}`;
}

module.exports = createRepository;
