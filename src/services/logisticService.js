const { requireAny, requireField, validateCoordinates } = require("../utils/validation");
const httpError = require("../utils/httpError");

const collectionResponseKeys = {
  viagens: "viagens",
  motoristas: "motoristas",
  veiculos: "veiculos",
  pacientes: "pacientes",
  passageiros: "passageiros",
  localizacoes: "localizacoes",
  eventos: "eventos",
  alertas: "alertas",
  mensagens: "mensagens",
  checklists: "checklists",
  avisos: "avisos",
  comprovantes: "comprovantes",
  emergencias: "emergencias",
  auditLogs: "auditLogs",
  insurance_events: "insurance_events",
  assistance_events: "assistance_events",
  giroflexEventos: "giroflexEventos",
  motoristaHistorico: "motoristaHistorico",
  lgpdConsents: "lgpdConsents",
  ocorrencias: "ocorrencias",
  despesas: "despesas",
  syncLogs: "syncLogs"
};

const TRIP_STATES = [
  "AGUARDANDO",
  "PREPARACAO",
  "SAIDA_CONFIRMADA",
  "EM_TRANSITO_IDA",
  "CHEGADA_EMBARQUE",
  "PASSAGEIRO_EMBARCADO",
  "PASSAGEIRO_AUSENTE",
  "EM_ESPERA",
  "REEMBARQUE_RETORNO",
  "EM_TRANSITO_VOLTA",
  "PASSAGEIRO_DESEMBARCADO",
  "FINALIZACAO",
  "CONCLUIDA",
  "CANCELADA",
  "PENDENTE_SINCRONIZACAO",
  "SINCRONIZADA",
  "ERRO_SINCRONIZACAO"
];

const TRIP_TRANSITIONS = {
  AGUARDANDO: ["PREPARACAO", "CANCELADA"],
  PREPARACAO: ["SAIDA_CONFIRMADA", "CANCELADA"],
  SAIDA_CONFIRMADA: ["EM_TRANSITO_IDA", "EM_ESPERA", "CANCELADA"],
  EM_TRANSITO_IDA: ["CHEGADA_EMBARQUE", "EM_ESPERA", "CANCELADA"],
  CHEGADA_EMBARQUE: ["PASSAGEIRO_EMBARCADO", "PASSAGEIRO_AUSENTE", "EM_ESPERA", "CANCELADA"],
  PASSAGEIRO_EMBARCADO: ["EM_ESPERA", "REEMBARQUE_RETORNO", "CANCELADA"],
  PASSAGEIRO_AUSENTE: ["EM_ESPERA", "REEMBARQUE_RETORNO", "CANCELADA"],
  EM_ESPERA: ["REEMBARQUE_RETORNO", "EM_TRANSITO_VOLTA", "CANCELADA"],
  REEMBARQUE_RETORNO: ["EM_TRANSITO_VOLTA", "CANCELADA"],
  EM_TRANSITO_VOLTA: ["PASSAGEIRO_DESEMBARCADO", "FINALIZACAO", "CANCELADA"],
  PASSAGEIRO_DESEMBARCADO: ["FINALIZACAO", "CANCELADA"],
  FINALIZACAO: ["CONCLUIDA", "CANCELADA"],
  PENDENTE_SINCRONIZACAO: ["SINCRONIZADA", "ERRO_SINCRONIZACAO"],
  ERRO_SINCRONIZACAO: ["PENDENTE_SINCRONIZACAO", "SINCRONIZADA"]
};

const ACTIVE_TRIP_STATUSES = [
  "AGUARDANDO",
  "PREPARACAO",
  "SAIDA_CONFIRMADA",
  "EM_TRANSITO_IDA",
  "CHEGADA_EMBARQUE",
  "PASSAGEIRO_EMBARCADO",
  "PASSAGEIRO_AUSENTE",
  "EM_ESPERA",
  "REEMBARQUE_RETORNO",
  "EM_TRANSITO_VOLTA",
  "PASSAGEIRO_DESEMBARCADO",
  "FINALIZACAO"
];

const GPS_STALE_MS = 10 * 60 * 1000;
const STOPPED_MS = 15 * 60 * 1000;
const WAITING_MS = 30 * 60 * 1000;
const SPEED_LIMIT_KMH = 80;

function createLogisticService(repository) {
  function audit(tipo, payload = {}) {
    return repository.addItem("auditLogs", {
      tipo,
      origem: payload.origem || "servidor",
      usuario: payload.usuario || payload.responsavel || null,
      viagem_id: payload.viagem_id || null,
      motorista_id: payload.motorista_id || null,
      veiculo_id: payload.veiculo_id || null,
      emergencia_id: payload.emergencia_id || null,
      detalhes: payload.detalhes || payload,
      created_at: nowIso()
    });
  }

  function status() {
    const data = repository.loadData();
    return {
      ok: true,
      app: data.config.app,
      empresa: data.config.empresa,
      environment: data.config.ambiente,
      storage: "json",
      timestamp: nowIso()
    };
  }

  function dashboardSummary() {
    runWaitingMonitor();
    const data = repository.loadData();
    const today = new Date().toISOString().slice(0, 10);
    const viagensHoje = data.viagens.filter((trip) => (trip.data_viagem || trip.dataViagem || "").slice(0, 10) === today);
    const activeStatuses = ["AGUARDANDO", "PREPARACAO", "SAIDA_CONFIRMADA", "EM_TRANSITO_IDA", "CHEGADA_EMBARQUE", "PASSAGEIRO_EMBARCADO", "PASSAGEIRO_AUSENTE", "EM_ESPERA", "REEMBARQUE_RETORNO", "EM_TRANSITO_VOLTA", "PASSAGEIRO_DESEMBARCADO", "FINALIZACAO"];
    const ultimaLocalizacao = data.localizacoes[data.localizacoes.length - 1] || null;
    const ultimaSincronizacao = data.syncLogs[data.syncLogs.length - 1] || null;
    const viagemAtiva = viagensHoje[0] || data.viagens[0] || null;

    return {
      viagensHoje: viagensHoje.length,
      viagensEmAndamento: data.viagens.filter((trip) => activeStatuses.includes(normalizeStatus(trip.status))).length,
      viagensConcluidas: data.viagens.filter((trip) => normalizeStatus(trip.status) === "CONCLUIDA").length,
      viagensPendentes: data.viagens.filter((trip) => ["AGUARDANDO", "PENDENTE_SINCRONIZACAO"].includes(normalizeStatus(trip.status))).length,
      motoristasAtivos: data.motoristas.filter((driver) => driver.status === "ativo").length,
      veiculosOperacao: data.veiculos.filter((vehicle) => ["operacional", "em_operacao"].includes(String(vehicle.status).toLowerCase())).length,
      pacientesTransportados: data.passageiros.filter((passenger) => normalizePassengerType(passenger.tipo) === "PACIENTE" && normalizeStatus(passenger.status) === "DESEMBARCADO").length,
      acompanhantesTransportados: data.passageiros.filter((passenger) => normalizePassengerType(passenger.tipo) === "ACOMPANHANTE" && normalizeStatus(passenger.status) === "DESEMBARCADO").length,
      pacientesEmbarcados: data.passageiros.filter((passenger) => normalizePassengerType(passenger.tipo) === "PACIENTE" && normalizeStatus(passenger.status) === "EMBARCADO").length,
      pacientesAusentes: data.passageiros.filter((passenger) => normalizePassengerType(passenger.tipo) === "PACIENTE" && normalizeStatus(passenger.status) === "AUSENTE").length,
      passageirosPrevistos: data.passageiros.length,
      ocorrenciasAbertas: data.ocorrencias.filter((item) => normalizeStatus(item.status || "ABERTA") !== "RESOLVIDA").length,
      despesasRegistradas: data.despesas.length,
      sincronizacoesPendentes: data.syncLogs.filter((log) => normalizeStatus(log.status) === "PENDENTE").length,
      alertasAbertos: data.alertas.filter((alert) => normalizeStatus(alert.status || "ABERTO") !== "RESOLVIDO").length,
      eventosRecebidos: data.eventos.length,
      ultimaLocalizacao,
      ultimaSincronizacao,
      viagem_ativa: viagemAtiva,
      metricas: {
        viagensHoje: viagensHoje.length,
        passageirosPrevistos: data.passageiros.length,
        alertasAbertos: data.alertas.length,
        eventosRecebidos: data.eventos.length
      }
    };
  }

  function list(collection) {
    return { [collectionResponseKeys[collection]]: repository.getCollection(collection) };
  }

  function create(collection, payload) {
    if (collection === "viagens") return createTrip(payload);
    return repository.addItem(collection, payload);
  }

  function find(collection, id) {
    return repository.findById(collection, id);
  }

  function updateStatus(collection, id, status) {
    requireField({ status }, "status", "status");
    if (collection === "viagens") return transitionTrip(id, status, {});
    return repository.updateItem(collection, id, { status: normalizeStatus(status) });
  }

  function listByTrip(collection, tripId) {
    const items = repository.getCollection(collection).filter((item) => tripMatch(item, tripId));
    return { [collectionResponseKeys[collection]]: items };
  }

  function addPassenger(tripId, payload) {
    return createPassenger(tripId, payload);
  }

  function addLocation(payload) {
    const viagemId = requireAny(payload, ["viagemId", "viagem_id"], "viagemId ou viagem_id");
    const { latitude, longitude } = validateCoordinates(payload);
    console.log("[GPS] Localizacao recebida", viagemId, latitude, longitude);
    return repository.addItem("localizacoes", {
      ...payload,
      viagemId,
      viagem_id: viagemId,
      veiculoId: payload.veiculoId || payload.veiculo_id || null,
      motoristaId: payload.motoristaId || payload.motorista_id || null,
      latitude,
      longitude,
      velocidade: payload.velocidade ?? null,
      precisao: payload.precisao ?? null,
      bateria: payload.bateria ?? null,
      registrado_em: payload.timestamp || nowIso()
    });
  }

  function addGps(payload) {
    const viagemId = requireAny(payload, ["viagem_id", "viagemId"], "viagem_id");
    const trip = repository.findById("viagens", viagemId);
    if (!trip) throw httpError(404, "Viagem nao encontrada.");

    const { latitude, longitude } = validateCoordinates(payload);
    const timestamp = nowIso();
    const deviceTimestamp = payload.timestamp_dispositivo || payload.timestamp || timestamp;
    const velocidade = payload.velocidade === undefined || payload.velocidade === null || payload.velocidade === "" ? 0 : Number(payload.velocidade);
    if (Number.isNaN(velocidade)) throw httpError(400, "velocidade deve ser numerica.");

    const location = repository.addItem("localizacoes", {
      viagem_id: viagemId,
      viagemId,
      motorista_id: payload.motorista_id || payload.motoristaId || trip.motorista_id || trip.motoristaId || null,
      motoristaId: payload.motoristaId || payload.motorista_id || trip.motoristaId || trip.motorista_id || null,
      veiculo_id: payload.veiculo_id || payload.veiculoId || trip.veiculo_id || trip.veiculoId || null,
      veiculoId: payload.veiculoId || payload.veiculo_id || trip.veiculoId || trip.veiculo_id || null,
      latitude,
      longitude,
      velocidade,
      precisao: payload.precisao === undefined ? null : Number(payload.precisao),
      bateria: payload.bateria === undefined ? null : Number(payload.bateria),
      status_viagem: normalizeStatus(payload.status_viagem || trip.status || "AGUARDANDO"),
      timestamp_dispositivo: deviceTimestamp,
      created_at: timestamp,
      registrado_em: deviceTimestamp
    });

    repository.updateItem("viagens", viagemId, {
      status: location.status_viagem,
      ultima_localizacao_id: location.id,
      ultima_localizacao_em: timestamp,
      status_gps: "ATUALIZADO",
      updated_at: timestamp
    });
    recordEvent({
      viagem_id: viagemId,
      motorista_id: location.motorista_id,
      veiculo_id: location.veiculo_id,
      tipo: "GPS_RECEBIDO",
      descricao: "GPS recebido com sucesso",
      status: location.status_viagem,
      localizacao_id: location.id,
      latitude,
      longitude,
      velocidade,
      created_at: timestamp
    });
    recordSync({ tipo: "GPS_RECEBIDO", viagem_id: viagemId, payload: location, status: "RECEBIDO" });
    evaluateGpsAlerts(location, trip);

    return location;
  }

  function addEvent(payload) {
    const viagemId = requireAny(payload, ["viagemId", "viagem_id"], "viagemId ou viagem_id");
    requireField(payload, "tipo", "tipo");
    requireField(payload, "descricao", "descricao");
    console.log("[EVENTO] Evento recebido", payload.tipo, viagemId);
    return recordEvent({ ...payload, viagem_id: viagemId });
  }

  function addAlert(payload) {
    requireField(payload, "tipo", "tipo");
    requireField(payload, "descricao", "descricao");
    console.log("[ALERTA] Alerta recebido", payload.tipo);
    return repository.addItem("alertas", { status: "ABERTO", ...payload, viagem_id: payload.viagem_id || payload.viagemId || null, created_at: payload.created_at || nowIso() });
  }

  function resolveAlert(id) {
    return repository.updateItem("alertas", id, { status: "RESOLVIDO", resolvidoEm: nowIso(), updated_at: nowIso() });
  }

  function addMessage(payload) {
    requireField(payload, "mensagem", "mensagem");
    requireField(payload, "origem", "origem");
    console.log("[MENSAGEM] Mensagem recebida", payload.origem);
    return repository.addItem("mensagens", { ...payload, viagem_id: payload.viagem_id || payload.viagemId || null, created_at: payload.created_at || nowIso() });
  }

  function addChecklist(payload) {
    const viagemId = requireAny(payload, ["viagemId", "viagem_id"], "viagemId ou viagem_id");
    requireField(payload, "tipo", "tipo");
    if (!payload.itens && !payload.payload) {
      const error = new Error("itens ou payload e obrigatorio.");
      error.statusCode = 400;
      throw error;
    }
    console.log("[CHECKLIST] Checklist recebido", viagemId);
    return repository.addItem("checklists", { ...payload, viagemId, viagem_id: viagemId, created_at: payload.created_at || nowIso() });
  }

  function addSimpleLogged(collection, label, payload) {
    console.log(`[${label}] Registro recebido`);
    return repository.addItem(collection, payload);
  }

  function createTrip(payload) {
    const timestamp = nowIso();
    const trip = repository.addItem("viagens", normalizeTrip({
      status: "AGUARDANDO",
      prioridade: "NORMAL",
      ...payload,
      created_at: payload.created_at || timestamp,
      updated_at: timestamp
    }));
    recordEvent({ viagem_id: trip.id, tipo: "VIAGEM_CRIADA", descricao: "Viagem criada", status: trip.status });
    recordSync({ tipo: "VIAGEM_CRIADA", viagem_id: trip.id, payload: trip });
    return trip;
  }

  function createPassenger(tripId, payload) {
    requireField({ tripId }, "tripId", "viagem_id");
    const passenger = repository.addItem("passageiros", normalizePassenger({
      ...payload,
      viagemId: tripId,
      viagem_id: tripId,
      tipo: payload.tipo || "PACIENTE",
      status: payload.status || "AGUARDANDO"
    }));
    recordEvent({ viagem_id: tripId, tipo: "PASSAGEIRO_CADASTRADO", descricao: `Passageiro cadastrado: ${passenger.nome || passenger.id}`, passageiro_id: passenger.id });
    recordSync({ tipo: "PASSAGEIRO_CADASTRADO", viagem_id: tripId, payload: passenger });
    return passenger;
  }

  function transitionTrip(tripId, targetStatus, payload = {}) {
    const trip = repository.findById("viagens", tripId);
    if (!trip) return null;
    const from = normalizeStatus(trip.status || "AGUARDANDO");
    const to = normalizeStatus(targetStatus);
    validateTripState(to);
    if (from !== to && !(TRIP_TRANSITIONS[from] || []).includes(to)) {
      const error = new Error(`Transicao invalida de ${from} para ${to}.`);
      error.statusCode = 400;
      throw error;
    }

    const timestamp = nowIso();
    const patch = {
      ...payload,
      status: to,
      updated_at: timestamp
    };
    if (to === "SAIDA_CONFIRMADA") patch.hora_saida = payload.hora_saida || timestamp;
    if (to === "EM_ESPERA") patch.espera_iniciada_em = payload.espera_iniciada_em || timestamp;
    if (to === "EM_TRANSITO_VOLTA") patch.hora_retorno = payload.hora_retorno || timestamp;
    if (to === "CONCLUIDA") patch.hora_finalizacao = payload.hora_finalizacao || timestamp;
    if (to === "FINALIZACAO" && !patch.hora_finalizacao) patch.hora_finalizacao = timestamp;

    const updated = repository.updateItem("viagens", tripId, patch);
    recordEvent({
      viagem_id: tripId,
      motorista_id: payload.motorista_id || payload.motoristaId || updated.motorista_id,
      veiculo_id: payload.veiculo_id || payload.veiculoId || updated.veiculo_id,
      tipo: "VIAGEM_STATUS",
      descricao: `Viagem alterada de ${from} para ${to}`,
      status: to
    });
    recordSync({ tipo: "VIAGEM_STATUS", viagem_id: tripId, payload: { from, to, ...payload } });
    return updated;
  }

  function operationalTripAction(tripId, action, payload = {}) {
    const targetByAction = {
      iniciarPreparacao: "PREPARACAO",
      confirmarSaida: "SAIDA_CONFIRMADA",
      iniciarEspera: "EM_ESPERA",
      iniciarRetorno: "EM_TRANSITO_VOLTA",
      finalizar: "CONCLUIDA",
      cancelar: "CANCELADA"
    };
    return { viagem: transitionTrip(tripId, targetByAction[action], payload) };
  }

  function passengerAction(passengerId, action, payload = {}) {
    const targetByAction = { embarque: "EMBARCADO", desembarque: "DESEMBARCADO", ausente: "AUSENTE", desistiu: "DESISTIU" };
    const eventTypeByAction = { embarque: "PASSAGEIRO_EMBARCADO", desembarque: "PASSAGEIRO_DESEMBARCADO", ausente: "PASSAGEIRO_AUSENTE", desistiu: "PASSAGEIRO_DESISTIU" };
    const passenger = repository.findById("passageiros", passengerId);
    if (!passenger) return null;
    const status = targetByAction[action];
    const timestamp = nowIso();
    const patch = normalizePassenger({ ...payload, status, updated_at: timestamp });
    if (action === "embarque") patch.hora_embarque = payload.hora || timestamp;
    if (action === "desembarque") patch.hora_desembarque = payload.hora || timestamp;
    if (action === "ausente") patch.hora_ausencia = payload.hora || timestamp;
    if (action === "desistiu") patch.hora_desistencia = payload.hora || timestamp;
    const updated = repository.updateItem("passageiros", passengerId, patch);
    const viagemId = updated.viagem_id || updated.viagemId;
    recordEvent({ viagem_id: viagemId, motorista_id: payload.motorista_id || payload.motoristaId || null, tipo: eventTypeByAction[action], descricao: `${eventTypeByAction[action]}: ${updated.nome || updated.id}`, passageiro_id: passengerId });
    recordSync({ tipo: eventTypeByAction[action], viagem_id: viagemId, payload: updated });
    return updated;
  }

  function addOccurrence(payload) {
    requireField(payload, "tipo", "tipo");
    requireField(payload, "descricao", "descricao");
    const occurrence = repository.addItem("ocorrencias", {
      status: "ABERTA",
      severidade: payload.severidade || "MEDIA",
      ...payload,
      viagem_id: payload.viagem_id || payload.viagemId || null,
      motorista_id: payload.motorista_id || payload.motoristaId || null,
      veiculo_id: payload.veiculo_id || payload.veiculoId || null,
      created_at: payload.created_at || nowIso(),
      updated_at: nowIso()
    });
    recordEvent({ viagem_id: occurrence.viagem_id, motorista_id: occurrence.motorista_id, veiculo_id: occurrence.veiculo_id, tipo: "OCORRENCIA", descricao: occurrence.descricao, ocorrencia_id: occurrence.id });
    recordSync({ tipo: "OCORRENCIA", viagem_id: occurrence.viagem_id, payload: occurrence });
    return occurrence;
  }

  function resolveOccurrence(id, payload = {}) {
    const occurrence = repository.updateItem("ocorrencias", id, { status: "RESOLVIDA", resolvido_em: payload.resolvido_em || nowIso(), updated_at: nowIso() });
    if (!occurrence) return null;
    recordEvent({ viagem_id: occurrence.viagem_id, tipo: "OCORRENCIA_RESOLVIDA", descricao: `Ocorrencia resolvida: ${occurrence.tipo}`, ocorrencia_id: occurrence.id });
    recordSync({ tipo: "OCORRENCIA_RESOLVIDA", viagem_id: occurrence.viagem_id, payload: occurrence });
    return occurrence;
  }

  function addExpense(payload) {
    requireField(payload, "tipo", "tipo");
    const litros = Number(payload.litros || 0);
    const valor = Number(payload.valor || 0);
    const valorLitro = payload.valor_litro !== undefined ? Number(payload.valor_litro) : litros > 0 && valor > 0 ? Number((valor / litros).toFixed(2)) : null;
    const expense = repository.addItem("despesas", {
      ...payload,
      viagem_id: payload.viagem_id || payload.viagemId || null,
      motorista_id: payload.motorista_id || payload.motoristaId || null,
      veiculo_id: payload.veiculo_id || payload.veiculoId || null,
      litros: payload.litros ?? null,
      valor: payload.valor ?? null,
      valor_litro: valorLitro,
      created_at: payload.created_at || nowIso()
    });
    recordEvent({ viagem_id: expense.viagem_id, tipo: "DESPESA", descricao: `Despesa registrada: ${expense.tipo}`, despesa_id: expense.id });
    recordSync({ tipo: "DESPESA", viagem_id: expense.viagem_id, payload: expense });
    return expense;
  }

  function addSyncEvent(payload) {
    return recordSync({
      tipo: payload.tipo || "SYNC_EVENTO",
      origem: payload.origem || "app_motorista",
      status: payload.status || "RECEBIDO",
      viagem_id: payload.viagem_id || payload.viagemId || null,
      payload: payload.payload || payload
    });
  }

  function syncStatus() {
    runWaitingMonitor();
    const logs = repository.getCollection("syncLogs");
    return {
      pendentes: logs.filter((log) => normalizeStatus(log.status) === "PENDENTE").length,
      confirmados: logs.filter((log) => ["CONFIRMADO", "RECEBIDO", "ENVIADO"].includes(normalizeStatus(log.status))).length,
      erros: logs.filter((log) => normalizeStatus(log.status) === "ERRO").length,
      ultimaSincronizacao: logs[logs.length - 1] || null
    };
  }

  function forceSync() {
    const alertasGerados = runOperationalMonitors();
    const logs = repository.getCollection("syncLogs");
    return { alertasGerados, pendentes: logs.filter((log) => normalizeStatus(log.status) === "PENDENTE").length, total: logs.length };
  }

  function timeline(tripId) {
    const data = repository.loadData();
    const sources = [
      ...data.eventos.map((item) => timelineItem(item, "evento")),
      ...data.ocorrencias.filter((item) => tripMatch(item, tripId)).map((item) => timelineItem(item, "ocorrencia")),
      ...data.mensagens.filter((item) => tripMatch(item, tripId)).map((item) => timelineItem(item, "mensagem")),
      ...data.alertas.filter((item) => tripMatch(item, tripId)).map((item) => timelineItem(item, "alerta")),
      ...data.checklists.filter((item) => tripMatch(item, tripId)).map((item) => timelineItem(item, "checklist")),
      ...data.despesas.filter((item) => tripMatch(item, tripId)).map((item) => timelineItem(item, "despesa"))
    ];
    return { timeline: sources.filter((item) => !tripId || String(item.viagem_id || item.viagemId || "") === String(tripId)).sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()) };
  }

  function liveMap() {
    runOperationalMonitors();
    const data = repository.loadData();
    const veiculos = data.viagens
      .filter((trip) => ACTIVE_TRIP_STATUSES.includes(normalizeStatus(trip.status)))
      .map((trip) => liveVehicle(data, trip));
    const alertasAbertos = data.alertas.filter((alert) => isOpen(alert.status || "ABERTO"));
    const feed = buildFeed(data).slice(0, 30);

    return {
      atualizado_em: nowIso(),
      modo: "real",
      mapa: "OpenStreetMap",
      indicadores: {
        viagensAtivas: veiculos.length,
        veiculosEmRota: veiculos.filter((item) => item.latitude !== null && item.longitude !== null).length,
        alertasAtivos: alertasAbertos.length,
        ocorrenciasAbertas: data.ocorrencias.filter((item) => isOpen(item.status || "ABERTA")).length,
        gpsSemAtualizacao: alertasAbertos.filter((alert) => alert.tipo === "GPS_SEM_ATUALIZACAO").length,
        velocidadeAcimaLimite: alertasAbertos.filter((alert) => alert.tipo === "VELOCIDADE_ACIMA_LIMITE").length
      },
      veiculos,
      viagens: veiculos,
      alertas: alertasAbertos,
      feed
    };
  }

  function managementDashboard(filters = {}) {
    const data = repository.loadData();
    const trips = filterTrips(data.viagens, filters);
    const tripIds = new Set(trips.map((trip) => String(trip.id)));
    const passengers = data.passageiros.filter((passenger) => tripIds.has(String(passenger.viagem_id || passenger.viagemId)));
    const expenses = data.despesas.filter((expense) => !expense.viagem_id || tripIds.has(String(expense.viagem_id || expense.viagemId)));
    const alerts = data.alertas.filter((alert) => !alert.viagem_id || tripIds.has(String(alert.viagem_id || alert.viagemId)));
    const occurrences = data.ocorrencias.filter((occurrence) => !occurrence.viagem_id || tripIds.has(String(occurrence.viagem_id || occurrence.viagemId)));
    const pacientes = passengers.filter((passenger) => normalizePassengerType(passenger.tipo) === "PACIENTE");
    const acompanhantes = passengers.filter((passenger) => normalizePassengerType(passenger.tipo) === "ACOMPANHANTE");
    const transportedPatients = pacientes.filter((passenger) => normalizeStatus(passenger.status) === "DESEMBARCADO").length;
    const transportedCompanions = acompanhantes.filter((passenger) => normalizeStatus(passenger.status) === "DESEMBARCADO").length;
    const occupied = passengers.filter((passenger) => ["EMBARCADO", "DESEMBARCADO"].includes(normalizeStatus(passenger.status))).length;
    const absent = passengers.filter((passenger) => ["AUSENTE", "DESISTIU"].includes(normalizeStatus(passenger.status))).length;
    const capacity = trips.reduce((total, trip) => {
      const vehicle = data.veiculos.find((item) => String(item.id) === String(trip.veiculo_id || trip.veiculoId));
      return total + Number(vehicle && vehicle.capacidade ? vehicle.capacidade : 0);
    }, 0);

    return {
      viagensPeriodo: trips.length,
      pacientesTransportados: transportedPatients,
      acompanhantesTransportados: transportedCompanions,
      taxaOcupacao: percent(occupied, capacity || passengers.length),
      absenteismo: percent(absent, passengers.length),
      kmRodados: trips.reduce((total, trip) => total + tripKm(trip), 0),
      custoTotal: money(expenses.reduce((total, expense) => total + Number(expense.valor || 0), 0)),
      ocorrencias: occurrences.length,
      alertasVelocidade: alerts.filter((alert) => alert.tipo === "VELOCIDADE_ACIMA_LIMITE").length,
      veiculosAtivos: data.veiculos.filter((vehicle) => ["operacional", "em_operacao", "ativo"].includes(String(vehicle.status || "").toLowerCase())).length,
      motoristasAtivos: data.motoristas.filter((driver) => ["ativo", "online", "em_operacao"].includes(String(driver.status || "").toLowerCase())).length
    };
  }

  function managementFleet(filters = {}) {
    const data = repository.loadData();
    const trips = filterTrips(data.viagens, filters);
    const activeVehicleIds = new Set(trips.filter((trip) => ACTIVE_TRIP_STATUSES.includes(normalizeStatus(trip.status))).map((trip) => String(trip.veiculo_id || trip.veiculoId)));
    const despesas = data.despesas;
    const veiculos = data.veiculos.map((vehicle) => {
      const vehicleTrips = trips.filter((trip) => String(trip.veiculo_id || trip.veiculoId) === String(vehicle.id));
      const vehicleExpenses = despesas.filter((expense) => String(expense.veiculo_id || expense.veiculoId || "") === String(vehicle.id));
      return {
        veiculo_id: vehicle.id,
        placa: vehicle.placa || "",
        prefixo: vehicle.prefixo || vehicle.nome || "",
        status: vehicle.status || "",
        viagens: vehicleTrips.length,
        kmRodados: vehicleTrips.reduce((total, trip) => total + tripKm(trip), 0),
        custo: money(vehicleExpenses.reduce((total, expense) => total + Number(expense.valor || 0), 0)),
        ocorrencias: data.ocorrencias.filter((item) => String(item.veiculo_id || item.veiculoId || "") === String(vehicle.id)).length
      };
    });
    return {
      resumo: {
        veiculosCadastrados: data.veiculos.length,
        veiculosAtivos: data.veiculos.filter((vehicle) => ["operacional", "em_operacao", "ativo"].includes(String(vehicle.status || "").toLowerCase())).length,
        veiculosEmRota: activeVehicleIds.size,
        veiculosParados: Math.max(0, data.veiculos.length - activeVehicleIds.size),
        veiculosManutencao: data.veiculos.filter((vehicle) => String(vehicle.status || "").toLowerCase().includes("manut")).length
      },
      veiculos,
      ranking: [...veiculos].sort((a, b) => b.kmRodados - a.kmRodados)
    };
  }

  function managementDrivers(filters = {}) {
    const data = repository.loadData();
    const trips = filterTrips(data.viagens, filters);
    const motoristas = data.motoristas.map((driver) => {
      const driverTrips = trips.filter((trip) => String(trip.motorista_id || trip.motoristaId) === String(driver.id));
      const tripIds = new Set(driverTrips.map((trip) => String(trip.id)));
      const passengers = data.passageiros.filter((passenger) => tripIds.has(String(passenger.viagem_id || passenger.viagemId)));
      return {
        motorista_id: driver.id,
        nome: driver.nome,
        telefone: driver.telefone || "",
        status: driver.status || "",
        viagens: driverTrips.length,
        kmRodados: driverTrips.reduce((total, trip) => total + tripKm(trip), 0),
        passageirosTransportados: passengers.filter((passenger) => ["EMBARCADO", "DESEMBARCADO"].includes(normalizeStatus(passenger.status))).length,
        ocorrencias: data.ocorrencias.filter((item) => String(item.motorista_id || item.motoristaId || "") === String(driver.id)).length,
        alertasVelocidade: data.alertas.filter((item) => String(item.motorista_id || item.motoristaId || "") === String(driver.id) && item.tipo === "VELOCIDADE_ACIMA_LIMITE").length,
        despesas: money(data.despesas.filter((item) => String(item.motorista_id || item.motoristaId || "") === String(driver.id)).reduce((total, item) => total + Number(item.valor || 0), 0))
      };
    });
    return { motoristas, ranking: [...motoristas].sort((a, b) => b.viagens - a.viagens) };
  }

  function managementPassengers(filters = {}) {
    const data = repository.loadData();
    const trips = filterTrips(data.viagens, filters);
    const tripIds = new Set(trips.map((trip) => String(trip.id)));
    const passengers = data.passageiros.filter((passenger) => tripIds.has(String(passenger.viagem_id || passenger.viagemId)));
    const pacientes = passengers.filter((passenger) => normalizePassengerType(passenger.tipo) === "PACIENTE");
    const acompanhantes = passengers.filter((passenger) => normalizePassengerType(passenger.tipo) === "ACOMPANHANTE");
    const ausentes = passengers.filter((passenger) => normalizeStatus(passenger.status) === "AUSENTE").length;
    const desistencias = passengers.filter((passenger) => normalizeStatus(passenger.status) === "DESISTIU").length;
    const destinos = countBy(trips, (trip) => trip.destino || "Sem destino");
    return {
      passageirosPrevistos: passengers.length,
      pacientesTransportados: pacientes.filter((passenger) => normalizeStatus(passenger.status) === "DESEMBARCADO").length,
      acompanhantesTransportados: acompanhantes.filter((passenger) => normalizeStatus(passenger.status) === "DESEMBARCADO").length,
      pacientesAusentes: ausentes,
      desistencias,
      necessidadesEspeciais: passengers.filter((passenger) => passenger.possuiNecessidadeEspecial).length,
      taxaComparecimento: percent(passengers.length - ausentes - desistencias, passengers.length),
      destinosMaisFrequentes: destinos
    };
  }

  function managementCosts(filters = {}) {
    const data = repository.loadData();
    const trips = filterTrips(data.viagens, filters);
    const tripIds = new Set(trips.map((trip) => String(trip.id)));
    const expenses = data.despesas.filter((expense) => !expense.viagem_id || tripIds.has(String(expense.viagem_id || expense.viagemId)));
    const total = expenses.reduce((sum, expense) => sum + Number(expense.valor || 0), 0);
    const km = trips.reduce((sum, trip) => sum + tripKm(trip), 0);
    const pacientes = data.passageiros.filter((passenger) => tripIds.has(String(passenger.viagem_id || passenger.viagemId)) && normalizePassengerType(passenger.tipo) === "PACIENTE").length;
    const porTipo = countMoneyBy(expenses, (expense) => normalizeStatus(expense.tipo || "OUTRO"));
    return {
      custoTotal: money(total),
      combustivel: money(porTipo.ABASTECIMENTO || porTipo.COMBUSTIVEL || 0),
      pedagio: money(porTipo.PEDAGIO || 0),
      estacionamento: money(porTipo.ESTACIONAMENTO || 0),
      manutencao: money(porTipo.MANUTENCAO || 0),
      alimentacao: money(porTipo.ALIMENTACAO || 0),
      custoPorKm: money(km ? total / km : 0),
      custoPorViagem: money(trips.length ? total / trips.length : 0),
      custoPorPaciente: money(pacientes ? total / pacientes : 0),
      categorias: porTipo
    };
  }

  function managementAudit(filters = {}) {
    const data = repository.loadData();
    const tripId = filters.viagemId || filters.viagem_id || "";
    const sources = buildFeed(data).filter((item) => !tripId || String(item.viagem_id || "") === String(tripId));
    return { itens: sources.slice(0, 200) };
  }

  function operatorIndicators(filters = {}) {
    const data = repository.loadData();
    const trips = filterTrips(data.viagens, filters);
    const today = new Date().toISOString().slice(0, 10);
    const activeTrips = trips.filter((trip) => ACTIVE_TRIP_STATUSES.includes(normalizeStatus(trip.status)));
    const waitingTrips = trips.filter((trip) => normalizeStatus(trip.status) === "EM_ESPERA");
    const activeTripIds = new Set(activeTrips.map((trip) => String(trip.id)));
    const passengersInTransit = data.passageiros.filter((passenger) => activeTripIds.has(String(passenger.viagem_id || passenger.viagemId)) && normalizeStatus(passenger.status) === "EMBARCADO").length;
    const openAlerts = data.alertas.filter((alert) => isOpen(alert.status || "ABERTO"));
    const operationalVehicles = data.veiculos.filter((vehicle) => ["operacional", "em_operacao", "ativo"].includes(String(vehicle.status || "").toLowerCase())).length;
    return {
      kpis: {
        viagensHoje: trips.filter((trip) => String(trip.data_viagem || trip.dataViagem || "").slice(0, 10) === today).length || trips.length,
        viagensAtivas: activeTrips.length,
        pacientesEmTransito: passengersInTransit,
        emEspera: waitingTrips.length,
        alertasPendentes: openAlerts.length,
        veiculosOperacionais: operationalVehicles
      },
      graficos: {
        statusViagens: chartTripsByStatus(trips),
        movimentacaoHora: chartEventsByHour(data.eventos)
      },
      feed: { ultimosEventos: buildFeed(data).slice(0, 12) }
    };
  }

  function managerIndicators(filters = {}) {
    const dashboard = managementDashboard(filters);
    const costs = managementCosts(filters);
    const fleet = managementFleet(filters);
    const drivers = managementDrivers(filters);
    const passengers = managementPassengers(filters);
    return {
      kpis: {
        totalViagens: dashboard.viagensPeriodo,
        pacientesTransportados: dashboard.pacientesTransportados,
        absenteismo: dashboard.absenteismo,
        kmRodados: dashboard.kmRodados,
        custoTotal: dashboard.custoTotal,
        custoPorKm: costs.custoPorKm,
        ocorrencias: dashboard.ocorrencias,
        utilizacaoFrota: dashboard.taxaOcupacao
      },
      financeiros: {
        custoPorKm: costs.custoPorKm,
        custoPorViagem: costs.custoPorViagem,
        custoPorPaciente: costs.custoPorPaciente,
        combustivel: costs.combustivel,
        pedagio: costs.pedagio,
        estacionamento: costs.estacionamento,
        manutencao: costs.manutencao
      },
      rankings: {
        motoristas: drivers.ranking.slice(0, 10),
        veiculos: fleet.ranking.slice(0, 10),
        destinos: passengers.destinosMaisFrequentes.slice(0, 10)
      }
    };
  }

  function chartData(kind, filters = {}) {
    const data = repository.loadData();
    const trips = filterTrips(data.viagens, filters);
    if (kind === "viagens") {
      return {
        datasets: [
          chartTripsByStatus(trips),
          chartTripsByMonth(trips),
          chartEventsByHour(data.eventos)
        ]
      };
    }
    if (kind === "custos") {
      const costs = managementCosts(filters);
      return {
        datasets: [
          {
            id: "custos-categoria",
            title: "Custos por Categoria",
            type: "doughnut",
            labels: Object.keys(costs.categorias),
            values: Object.values(costs.categorias)
          },
          {
            id: "kpis-financeiros",
            title: "KPIs Financeiros",
            type: "bar",
            labels: ["Por KM", "Por Viagem", "Por Paciente", "Combustivel", "Pedagio", "Estacionamento", "Manutencao"],
            values: [costs.custoPorKm, costs.custoPorViagem, costs.custoPorPaciente, costs.combustivel, costs.pedagio, costs.estacionamento, costs.manutencao]
          }
        ]
      };
    }
    if (kind === "frota") {
      const fleet = managementFleet(filters);
      return {
        datasets: [
          {
            id: "utilizacao-frota",
            title: "Utilizacao da Frota",
            type: "doughnut",
            labels: ["Em rota", "Parados", "Manutencao"],
            values: [fleet.resumo.veiculosEmRota, fleet.resumo.veiculosParados, fleet.resumo.veiculosManutencao]
          },
          {
            id: "veiculos-mais-utilizados",
            title: "Veiculos Mais Utilizados",
            type: "bar",
            labels: fleet.ranking.map((item) => item.prefixo || item.placa || item.veiculo_id),
            values: fleet.ranking.map((item) => item.kmRodados)
          }
        ]
      };
    }
    if (kind === "ocorrencias") {
      const occurrencesByType = countBy(data.ocorrencias, (item) => item.tipo || "OUTRO");
      const passengers = managementPassengers(filters);
      return {
        datasets: [
          {
            id: "ocorrencias-tipo",
            title: "Ocorrencias por Tipo",
            type: "doughnut",
            labels: occurrencesByType.map((item) => item.nome),
            values: occurrencesByType.map((item) => item.total)
          },
          {
            id: "absenteismo",
            title: "Absenteismo",
            type: "line",
            labels: ["Previstos", "Ausentes", "Desistencias", "Comparecimento"],
            values: [passengers.passageirosPrevistos, passengers.pacientesAusentes, passengers.desistencias, passengers.taxaComparecimento]
          }
        ]
      };
    }
    throw httpError(404, "Grafico nao encontrado.");
  }

  function exportCsv(tipo, filters = {}) {
    const data = repository.loadData();
    const collections = {
      viagens: filterTrips(data.viagens, filters),
      passageiros: data.passageiros,
      motoristas: data.motoristas,
      veiculos: data.veiculos,
      despesas: data.despesas,
      ocorrencias: data.ocorrencias,
      eventos: data.eventos
    };
    const rows = collections[tipo];
    if (!rows) throw httpError(400, "tipo de exportacao invalido.");
    const headerByType = {
      viagens: ["id", "codigo", "origem", "destino", "status", "motorista_id", "veiculo_id", "data_viagem"],
      passageiros: ["id", "viagem_id", "nome", "tipo", "status"],
      motoristas: ["id", "nome", "telefone", "status"],
      veiculos: ["id", "prefixo", "placa", "status", "capacidade"],
      despesas: ["id", "viagem_id", "tipo", "valor", "litros", "created_at"],
      ocorrencias: ["id", "viagem_id", "tipo", "status", "severidade", "created_at"],
      eventos: ["id", "viagem_id", "tipo", "descricao", "created_at"]
    };
    return toCsv(rows, headerByType[tipo]);
  }

  function tripRoute(tripId) {
    const trip = repository.findById("viagens", tripId);
    if (!trip) throw httpError(404, "Viagem nao encontrada.");
    const trajeto = repository.getCollection("localizacoes")
      .filter((item) => tripMatch(item, tripId))
      .sort((a, b) => new Date(a.created_at || a.criadoEm || a.timestamp_dispositivo || a.registrado_em).getTime() - new Date(b.created_at || b.criadoEm || b.timestamp_dispositivo || b.registrado_em).getTime())
      .map((item) => ({
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        velocidade: item.velocidade === undefined || item.velocidade === null ? null : Number(item.velocidade),
        timestamp_dispositivo: item.timestamp_dispositivo || item.registrado_em || item.created_at || item.criadoEm
      }));

    return {
      viagem_id: tripId,
      origem: trip.origem || null,
      destino: trip.destino || null,
      trajeto
    };
  }

  function driverLogin(payload) {
    const identificador = requireAny(payload, ["identificador", "cpf", "matricula"], "CPF ou matricula");
    const senha = requireField(payload, "senha", "senha");
    const driver = repository.getCollection("motoristas").find((item) => {
      return [item.id, item.cpf, item.matricula].filter(Boolean).some((value) => String(value) === String(identificador));
    });
    if (!driver || senha !== "OPteste 01") throw httpError(401, "Credenciais do motorista invalidas.");
    const tokenSource = `${driver.id}:${Date.now()}`;
    return {
      motorista: driver,
      sessao: {
        token: Buffer.from(tokenSource).toString("base64url"),
        lembrar: Boolean(payload.lembrar),
        criado_em: nowIso()
      }
    };
  }

  function driverTrips(filters = {}) {
    const data = repository.loadData();
    const motoristaId = filters.motorista_id || filters.motoristaId || filters.driverId || null;
    const today = new Date().toISOString().slice(0, 10);
    const trips = data.viagens
      .filter((trip) => !motoristaId || String(trip.motorista_id || trip.motoristaId || "") === String(motoristaId))
      .filter((trip) => !filters.hoje || String(trip.data_viagem || trip.dataViagem || "").slice(0, 10) === today)
      .map((trip) => enrichDriverTrip(data, trip));
    return { viagens: trips };
  }

  function driverNotices() {
    const notices = repository.getCollection("avisos");
    if (notices.length) return { avisos: notices.slice().sort(sortNewest) };
    return {
      avisos: [{
        id: "aviso-demo-001",
        titulo: "Piloto real em andamento",
        mensagem: "Validar login, GPS, embarque, espera, retorno e finalizacao da viagem.",
        prioridade: "ALTA",
        data: nowIso()
      }]
    };
  }

  function driverChecklist(tripId, payload = {}) {
    const requiredItems = ["documentacao", "pneus", "combustivel", "iluminacao", "freios", "limpeza"];
    for (const item of requiredItems) {
      if (payload[item] !== true) throw httpError(400, `Checklist incompleto: ${item}.`);
    }
    const trip = repository.findById("viagens", tripId);
    if (!trip) throw httpError(404, "Viagem nao encontrada.");
    const checklist = addChecklist({
      viagem_id: tripId,
      motorista_id: payload.motorista_id || payload.motoristaId || trip.motorista_id || trip.motoristaId || null,
      tipo: "PRE_VIAGEM",
      itens: requiredItems.reduce((items, item) => ({ ...items, [item]: Boolean(payload[item]) }), {}),
      observacoes: payload.observacoes || "",
      status: "APROVADO"
    });
    if (normalizeStatus(trip.status) === "AGUARDANDO") transitionTrip(tripId, "PREPARACAO", payload);
    return { checklist };
  }

  function driverInitialKm(tripId, payload = {}) {
    const kmSaida = Number(requireAny(payload, ["km_saida", "kmSaida"], "KM saida"));
    if (!Number.isFinite(kmSaida)) throw httpError(400, "KM saida deve ser numerico.");
    const trip = repository.findById("viagens", tripId);
    if (!trip) throw httpError(404, "Viagem nao encontrada.");
    const patch = {
      km_saida: kmSaida,
      data_saida: payload.data || nowIso().slice(0, 10),
      hora_saida_registrada: payload.hora || nowIso(),
      gps_saida: gpsFromPayload(payload),
      updated_at: nowIso()
    };
    const viagem = repository.updateItem("viagens", tripId, patch);
    recordEvent({ viagem_id: tripId, motorista_id: payload.motorista_id || payload.motoristaId || viagem.motorista_id, tipo: "KM_INICIAL", descricao: `KM inicial registrado: ${kmSaida}` });
    recordSync({ tipo: "KM_INICIAL", origem: "app_motorista", viagem_id: tripId, payload: patch, status: "RECEBIDO" });
    return { viagem };
  }

  function driverFlowAction(tripId, payload = {}) {
    const action = requireField(payload, "action", "action");
    const targetByAction = {
      "iniciar-preparacao": "PREPARACAO",
      "confirmar-saida": "SAIDA_CONFIRMADA",
      embarque: "CHEGADA_EMBARQUE",
      ida: "EM_TRANSITO_IDA",
      "iniciar-espera": "EM_ESPERA",
      "iniciar-retorno": "EM_TRANSITO_VOLTA",
      desembarque: "PASSAGEIRO_DESEMBARCADO",
      finalizacao: "FINALIZACAO"
    };
    const target = targetByAction[action];
    if (!target) throw httpError(400, "Acao do fluxo invalida.");
    return { viagem: transitionTrip(tripId, target, payload) };
  }

  function driverFinalizeTrip(tripId, payload = {}) {
    const kmFinal = Number(requireAny(payload, ["km_final", "km_retorno", "kmFinal"], "KM final"));
    if (!Number.isFinite(kmFinal)) throw httpError(400, "KM final deve ser numerico.");
    const trip = repository.findById("viagens", tripId);
    if (!trip) throw httpError(404, "Viagem nao encontrada.");
    const kmSaida = Number(trip.km_saida || 0);
    if (!kmSaida || kmFinal <= kmSaida) throw httpError(400, "KM final deve ser maior que KM inicial.");
    const status = normalizeStatus(trip.status || "AGUARDANDO");
    if (status === "EM_TRANSITO_VOLTA") transitionTrip(tripId, "FINALIZACAO", payload);
    const finalPayload = {
      ...payload,
      km_retorno: kmFinal,
      resumo_finalizacao: payload.resumo || payload.observacoes || "",
      gps_finalizacao: gpsFromPayload(payload)
    };
    return { viagem: transitionTrip(tripId, "CONCLUIDA", finalPayload) };
  }

  function driverPanic(payload = {}) {
    const result = panicComplete({ ...payload, tipo: payload.tipo || "OUTRO" });
    return {
      ocorrencia: result.ocorrencia,
      emergencia: result.emergencia,
      mensagem: "Central sera notificada assim que houver conexao."
    };
  }

  function driverProof(payload = {}) {
    const viagemId = requireAny(payload, ["viagem_id", "viagemId"], "viagem_id");
    const passageiroId = requireAny(payload, ["passageiro_id", "passageiroId"], "passageiro_id");
    const arquivoNome = requireAny(payload, ["arquivo_nome", "arquivoNome", "nome"], "arquivo_nome");
    const comprovante = repository.addItem("comprovantes", {
      viagem_id: viagemId,
      passageiro_id: passageiroId,
      tipo: payload.tipo || "foto",
      arquivo_nome: arquivoNome,
      mime: payload.mime || null,
      observacoes: payload.observacoes || "",
      status: "RECEBIDO",
      created_at: nowIso()
    });
    recordEvent({ viagem_id: viagemId, tipo: "COMPROVANTE_CONSULTA", descricao: `Comprovante recebido: ${arquivoNome}`, passageiro_id: passageiroId });
    recordSync({ tipo: "COMPROVANTE_CONSULTA", origem: "app_motorista", viagem_id: viagemId, payload: comprovante, status: "RECEBIDO" });
    return { comprovante };
  }

  function panicComplete(payload = {}) {
    const allowedTypes = ["PANE_MECANICA", "PNEU_FURADO", "ACIDENTE", "EMERGENCIA_MEDICA", "RISCO_ROTA", "FALHA_OPERACIONAL", "OUTRO", "PANICO"];
    const tipo = normalizeStatus(payload.tipo || "OUTRO");
    if (!allowedTypes.includes(tipo)) throw httpError(400, "Tipo de panico invalido.");
    const viagemId = requireAny(payload, ["viagem_id", "viagemId"], "viagem_id");
    const trip = repository.findById("viagens", viagemId);
    if (!trip) throw httpError(404, "Viagem nao encontrada.");
    const timestamp = nowIso();
    const motoristaId = payload.motorista_id || payload.motoristaId || trip.motorista_id || trip.motoristaId || null;
    const veiculoId = payload.veiculo_id || payload.veiculoId || trip.veiculo_id || trip.veiculoId || null;
    const gps = gpsFromPayload(payload);
    const emergencia = repository.addItem("emergencias", {
      tipo,
      status: "ABERTA",
      prioridade: "CRITICA",
      viagem_id: viagemId,
      motorista_id: motoristaId,
      veiculo_id: veiculoId,
      gps,
      observacoes: payload.observacoes || "",
      responsavel: payload.responsavel || null,
      som_configuravel: payload.som_configuravel ?? true,
      protocolo: [],
      iniciou_em: timestamp,
      updated_at: timestamp
    });
    const alerta = ensureAlert({
      viagem_id: viagemId,
      motorista_id: motoristaId,
      veiculo_id: veiculoId,
      tipo: `PANICO_${tipo}`,
      descricao: payload.observacoes || `Panico acionado: ${tipo}`,
      severidade: "CRITICA",
      created_at: timestamp
    });
    const occurrence = addOccurrence({
      viagem_id: viagemId,
      motorista_id: motoristaId,
      veiculo_id: veiculoId,
      tipo: "PANICO",
      severidade: "CRITICA",
      descricao: payload.observacoes || `Panico acionado: ${tipo}`,
      emergencia_id: emergencia.id
    });
    if (gps) {
      addLocation({
        viagem_id: viagemId,
        viagemId,
        motorista_id: motoristaId,
        veiculo_id: veiculoId,
        latitude: gps.latitude,
        longitude: gps.longitude,
        precisao: gps.precisao,
        rotulo: "Panico completo",
        status_viagem: trip.status
      });
    }
    const insuranceEvent = repository.addItem("insurance_events", {
      veiculo_id: veiculoId,
      apolice: payload.apolice || null,
      seguradora: payload.seguradora || null,
      tipo_ocorrencia: tipo,
      gps,
      status: "AGUARDANDO",
      observacoes: payload.observacoes || "",
      emergencia_id: emergencia.id,
      created_at: timestamp
    });
    const assistanceEvent = repository.addItem("assistance_events", {
      veiculo: veiculoId,
      ocorrencia: occurrence.id,
      status: "AGUARDANDO",
      observacoes: payload.observacoes || "",
      emergencia_id: emergencia.id,
      created_at: timestamp
    });
    audit("PANICO", { viagem_id: viagemId, motorista_id: motoristaId, veiculo_id: veiculoId, emergencia_id: emergencia.id, detalhes: { tipo, gps } });
    recordEvent({ viagem_id: viagemId, motorista_id: motoristaId, veiculo_id: veiculoId, tipo: "PANICO_CRITICO", descricao: `Panico critico registrado: ${tipo}`, emergencia_id: emergencia.id });
    recordSync({ tipo: "PANICO_CRITICO", origem: "app_motorista", viagem_id: viagemId, payload: emergencia, status: "PENDENTE" });
    return { emergencia, alerta, ocorrencia: occurrence, insuranceEvent, assistanceEvent };
  }

  function emergencyList(filters = {}) {
    const data = repository.loadData();
    const emergencias = data.emergencias
      .filter((item) => !filters.status || normalizeStatus(item.status) === normalizeStatus(filters.status))
      .map((item) => enrichEmergency(data, item))
      .sort(sortNewest);
    return { emergencias };
  }

  function attendEmergency(id, payload = {}) {
    const emergency = repository.findById("emergencias", id);
    if (!emergency) throw httpError(404, "Emergencia nao encontrada.");
    const timestamp = nowIso();
    const protocolo = [
      ...(emergency.protocolo || []),
      {
        acao: normalizeStatus(payload.acao || "ATENDIMENTO_REGISTRADO"),
        responsavel: payload.responsavel || "Operador",
        observacoes: payload.observacoes || "",
        created_at: timestamp
      }
    ];
    const updated = repository.updateItem("emergencias", id, {
      status: "EM_ATENDIMENTO",
      responsavel: payload.responsavel || emergency.responsavel || null,
      protocolo,
      updated_at: timestamp
    });
    audit("EMERGENCIA_ATENDIDA", { emergencia_id: id, viagem_id: updated.viagem_id, detalhes: protocolo.at(-1) });
    recordEvent({ viagem_id: updated.viagem_id, tipo: "EMERGENCIA_ATENDIDA", descricao: payload.observacoes || "Atendimento de emergencia registrado", emergencia_id: id });
    return { emergencia: updated };
  }

  function finishEmergency(id, payload = {}) {
    const emergency = repository.findById("emergencias", id);
    if (!emergency) throw httpError(404, "Emergencia nao encontrada.");
    const timestamp = nowIso();
    const protocolo = [
      ...(emergency.protocolo || []),
      {
        acao: "ENCERRAMENTO",
        responsavel: payload.responsavel || emergency.responsavel || "Operador",
        observacoes: payload.observacoes || "Emergencia finalizada",
        created_at: timestamp
      }
    ];
    const updated = repository.updateItem("emergencias", id, {
      status: "FINALIZADA",
      finalizada_em: timestamp,
      responsavel: payload.responsavel || emergency.responsavel || null,
      protocolo,
      updated_at: timestamp
    });
    audit("EMERGENCIA_FINALIZADA", { emergencia_id: id, viagem_id: updated.viagem_id, detalhes: protocolo.at(-1) });
    recordEvent({ viagem_id: updated.viagem_id, tipo: "EMERGENCIA_FINALIZADA", descricao: payload.observacoes || "Emergencia finalizada", emergencia_id: id });
    return { emergencia: updated };
  }

  function startGiroflex(payload = {}) {
    const viagemId = requireAny(payload, ["viagem_id", "viagemId"], "viagem_id");
    const trip = repository.findById("viagens", viagemId);
    if (!trip) throw httpError(404, "Viagem nao encontrada.");
    const active = repository.getCollection("giroflexEventos").find((item) => tripMatch(item, viagemId) && item.status === "ATIVO");
    if (active) return { giroflex: active };
    const giroflex = repository.addItem("giroflexEventos", {
      viagem_id: viagemId,
      motorista_id: payload.motorista_id || payload.motoristaId || trip.motorista_id || trip.motoristaId || null,
      veiculo_id: payload.veiculo_id || payload.veiculoId || trip.veiculo_id || trip.veiculoId || null,
      status: "ATIVO",
      marcador: "GIROFLEX",
      prioridade_visual: "CRITICA",
      inicio_em: nowIso(),
      fim_em: null,
      tempo_segundos: null,
      distancia_km: null,
      velocidade_media: null
    });
    audit("GIROFLEX_INICIADO", { viagem_id: viagemId, motorista_id: giroflex.motorista_id, veiculo_id: giroflex.veiculo_id, detalhes: giroflex });
    recordEvent({ viagem_id: viagemId, tipo: "GIROFLEX_INICIADO", descricao: "Modo emergencia ativado", veiculo_id: giroflex.veiculo_id, motorista_id: giroflex.motorista_id });
    return { giroflex };
  }

  function finishGiroflex(payload = {}) {
    const viagemId = requireAny(payload, ["viagem_id", "viagemId"], "viagem_id");
    const active = repository.getCollection("giroflexEventos").find((item) => tripMatch(item, viagemId) && item.status === "ATIVO");
    if (!active) throw httpError(404, "Giroflex ativo nao encontrado.");
    const fim = nowIso();
    const tempoSegundos = Math.max(0, Math.round((new Date(fim).getTime() - new Date(active.inicio_em).getTime()) / 1000));
    const giroflex = repository.updateItem("giroflexEventos", active.id, {
      status: "FINALIZADO",
      fim_em: fim,
      tempo_segundos: tempoSegundos,
      distancia_km: Number(payload.distancia_km || payload.distanciaKm || 0),
      velocidade_media: Number(payload.velocidade_media || payload.velocidadeMedia || 0)
    });
    audit("GIROFLEX_FINALIZADO", { viagem_id: viagemId, detalhes: giroflex });
    recordEvent({ viagem_id: viagemId, tipo: "GIROFLEX_FINALIZADO", descricao: "Modo emergencia finalizado" });
    return { giroflex };
  }

  function advancedWatchdog() {
    const generated = runOperationalMonitors();
    const data = repository.loadData();
    const alertas = [];
    for (const trip of data.viagens) {
      const latest = latestLocation(data, trip.id);
      if (latest && Number(latest.velocidade || 0) > speedLimitForTrip(data, trip)) {
        const alert = ensureAlert({
          viagem_id: trip.id,
          motorista_id: trip.motorista_id,
          veiculo_id: trip.veiculo_id,
          tipo: "VELOCIDADE_ACIMA_LIMITE",
          descricao: `Velocidade acima do limite: ${latest.velocidade} km/h.`,
          severidade: "ALTA"
        });
        if (alert) alertas.push(alert);
        repository.addItem("motoristaHistorico", {
          motorista_id: trip.motorista_id,
          viagem_id: trip.id,
          tipo: "VELOCIDADE",
          valor: latest.velocidade,
          limite: speedLimitForTrip(data, trip),
          created_at: nowIso()
        });
      }
      if (normalizeStatus(trip.status) === "SAIDA_CONFIRMADA") {
        const elapsed = Date.now() - new Date(trip.hora_saida || trip.updated_at || trip.created_at).getTime();
        if (elapsed > 2 * 60 * 60 * 1000) {
          const alert = ensureAlert({ viagem_id: trip.id, motorista_id: trip.motorista_id, veiculo_id: trip.veiculo_id, tipo: "RETORNO_NAO_INICIADO", descricao: "Retorno nao iniciado no prazo operacional.", severidade: "MEDIA" });
          if (alert) alertas.push(alert);
        }
      }
    }
    audit("WATCHDOG_EXECUTADO", { detalhes: { alertasGerados: generated + alertas.length } });
    return {
      alertasGerados: generated + alertas.length,
      alertas,
      monitores: ["GPS_PARADO", "VEICULO_PARADO", "ESPERA_EXCESSIVA", "RETORNO_NAO_INICIADO", "VIAGEM_SEM_ATUALIZACAO", "SINCRONIZACAO_TRAVADA"]
    };
  }

  function antifraudReport(filters = {}) {
    const data = repository.loadData();
    const tolerance = Number(filters.tolerancia || 30);
    const trips = filterTrips(data.viagens, filters);
    const itens = trips.map((trip) => {
      const kmInformado = tripKm(trip);
      const distanciaGps = gpsDistanceForTrip(data, trip.id);
      const divergencia = Math.abs(Number(kmInformado || 0) - distanciaGps);
      const status = !kmInformado ? "PENDENTE_REVISAO" : divergencia <= tolerance ? "APROVADO" : divergencia <= tolerance * 2 ? "PENDENTE_REVISAO" : "REJEITADO";
      return {
        viagem_id: trip.id,
        km_inicial: Number(trip.km_saida || 0),
        km_final: Number(trip.km_retorno || 0),
        km_informado: Number(kmInformado || 0),
        distancia_gps: Number(distanciaGps.toFixed(2)),
        divergencia: Number(divergencia.toFixed(2)),
        tolerancia_km: tolerance,
        status
      };
    });
    audit("ANTIFRAUDE_CONSULTADO", { detalhes: { total: itens.length } });
    return { itens };
  }

  function operationalMessages(filters = {}) {
    const messages = repository.getCollection("mensagens")
      .filter((item) => !filters.motorista_id || String(item.motorista_id || item.motoristaId || "") === String(filters.motorista_id))
      .sort(sortNewest);
    audit("MENSAGENS_CONSULTADAS", { detalhes: { total: messages.length } });
    return { mensagens: messages };
  }

  function createOperationalMessage(payload = {}) {
    const tipo = normalizeStatus(payload.tipo || "MENSAGEM");
    const allowed = ["MENSAGEM", "AVISO", "EMERGENCIA", "ROTA", "SISTEMA"];
    if (!allowed.includes(tipo)) throw httpError(400, "Tipo de mensagem invalido.");
    const message = addMessage({
      ...payload,
      tipo,
      origem: payload.origem || "operador",
      destino: payload.destino || "motorista",
      prioridade: tipo === "EMERGENCIA" ? "ALTA" : payload.prioridade || "NORMAL",
      status: "ENVIADA",
      created_at: payload.created_at || nowIso()
    });
    audit("MENSAGEM_REGISTRADA", { viagem_id: message.viagem_id, motorista_id: message.motorista_id || message.motoristaId || null, detalhes: { tipo, destino: message.destino } });
    return { mensagem: message };
  }

  function auditReport(filters = {}) {
    const auditLogs = repository.getCollection("auditLogs")
      .filter((item) => !filters.tipo || normalizeStatus(item.tipo) === normalizeStatus(filters.tipo))
      .sort(sortNewest);
    return { auditLogs };
  }

  function lgpdReport(filters = {}) {
    const data = repository.loadData();
    const mascarar = String(filters.mascarar || "false") === "true";
    const pacientes = data.passageiros.slice(0, 20).map((item) => ({
      id: item.id,
      nome: mascarar ? maskName(item.nome) : item.nome,
      cpf: mascarar ? maskCpf(item.cpf) : item.cpf,
      viagem_id: item.viagem_id,
      baseLegal: "execucao_servico_publico_saude",
      retencao: "periodo_operacional_e_auditoria"
    }));
    audit("LGPD_CONSULTADO", { detalhes: { mascarar, total: pacientes.length } });
    return {
      mascaramentoAtivo: mascarar,
      logsAcesso: repository.getCollection("auditLogs").length,
      consentimentos: repository.getCollection("lgpdConsents"),
      perfis: ["OPERADOR", "GESTOR", "MOTORISTA"],
      retencaoDados: "Configurar politica municipal antes de producao.",
      pacientes
    };
  }

  function driverTripStatus(payload) {
    const viagemId = requireAny(payload, ["viagemId", "viagem_id", "id"], "viagemId ou viagem_id");
    const statusValue = requireField(payload, "status", "status");
    console.log("[API] Status de viagem recebido", viagemId, statusValue);
    const updated = transitionTrip(viagemId, statusValue, payload);
    return updated;
  }

  function recordEvent(payload) {
    return repository.addItem("eventos", {
      categoria: payload.categoria || payload.tipo || "OPERACIONAL",
      ...payload,
      viagemId: payload.viagemId || payload.viagem_id || null,
      viagem_id: payload.viagem_id || payload.viagemId || null,
      created_at: payload.created_at || nowIso()
    });
  }

  function recordSync(payload) {
    return repository.addItem("syncLogs", {
      tipo: payload.tipo || "OPERACIONAL",
      origem: payload.origem || "servidor",
      status: payload.status || "PENDENTE",
      viagem_id: payload.viagem_id || payload.viagemId || null,
      payload: payload.payload || payload,
      created_at: payload.created_at || nowIso(),
      updated_at: nowIso()
    });
  }

  function evaluateGpsAlerts(location, trip) {
    const velocidade = Number(location.velocidade || 0);
    if (velocidade > SPEED_LIMIT_KMH) {
      ensureAlert({
        viagem_id: location.viagem_id,
        motorista_id: location.motorista_id,
        veiculo_id: location.veiculo_id,
        tipo: "VELOCIDADE_ACIMA_LIMITE",
        descricao: `Velocidade registrada acima do limite operacional: ${velocidade} km/h.`,
        severidade: "ALTA",
        created_at: location.created_at
      });
    }

    const previousStopped = repository.getCollection("localizacoes")
      .filter((item) => tripMatch(item, location.viagem_id) && String(item.id) !== String(location.id) && Number(item.velocidade || 0) === 0)
      .at(-1);
    if (velocidade === 0 && previousStopped) {
      const elapsedMs = new Date(location.timestamp_dispositivo || location.created_at).getTime() - new Date(previousStopped.timestamp_dispositivo || previousStopped.registrado_em || previousStopped.created_at).getTime();
      if (elapsedMs >= STOPPED_MS) {
        ensureAlert({
          viagem_id: location.viagem_id,
          motorista_id: location.motorista_id,
          veiculo_id: location.veiculo_id,
          tipo: "VEICULO_PARADO",
          descricao: "Veiculo parado por tempo acima do limite operacional.",
          severidade: "MEDIA",
          created_at: location.created_at
        });
      }
    }

    if (normalizeStatus(trip.status) === "EM_ESPERA" && trip.espera_iniciada_em) runWaitingMonitor();
  }

  function ensureAlert(payload) {
    const exists = repository.getCollection("alertas").some((alert) => alert.tipo === payload.tipo && tripMatch(alert, payload.viagem_id) && isOpen(alert.status || "ABERTO"));
    if (exists) return null;
    const alert = repository.addItem("alertas", {
      status: "ABERTO",
      ...payload,
      viagemId: payload.viagem_id,
      created_at: payload.created_at || nowIso()
    });
    recordEvent({ viagem_id: payload.viagem_id, motorista_id: payload.motorista_id || null, veiculo_id: payload.veiculo_id || null, tipo: payload.tipo, descricao: payload.descricao, alerta_id: alert.id });
    recordSync({ tipo: payload.tipo, viagem_id: payload.viagem_id, payload: alert });
    return alert;
  }

  function runOperationalMonitors() {
    let generated = runWaitingMonitor();
    const data = repository.loadData();
    for (const trip of data.viagens) {
      if (!ACTIVE_TRIP_STATUSES.includes(normalizeStatus(trip.status))) continue;
      const latest = latestLocation(data, trip.id);
      if (!latest) {
        if (ensureAlert({ viagem_id: trip.id, motorista_id: trip.motorista_id, veiculo_id: trip.veiculo_id, tipo: "GPS_SEM_ATUALIZACAO", descricao: "Viagem ativa sem posicao GPS registrada.", severidade: "MEDIA" })) generated += 1;
        continue;
      }
      const latestTime = new Date(latest.timestamp_dispositivo || latest.registrado_em || latest.created_at || latest.criadoEm).getTime();
      if (Date.now() - latestTime > GPS_STALE_MS) {
        if (ensureAlert({ viagem_id: trip.id, motorista_id: trip.motorista_id, veiculo_id: trip.veiculo_id, tipo: "GPS_SEM_ATUALIZACAO", descricao: "GPS sem atualizacao recente.", severidade: "MEDIA" })) generated += 1;
      }
    }
    return generated;
  }

  function runWaitingMonitor() {
    const data = repository.loadData();
    let generated = 0;
    for (const trip of data.viagens) {
      if (normalizeStatus(trip.status) !== "EM_ESPERA" || !trip.espera_iniciada_em) continue;
      const elapsedMs = Date.now() - new Date(trip.espera_iniciada_em).getTime();
      const alreadyExists = data.alertas.some((alert) => alert.tipo === "ESPERA_PROLONGADA" && tripMatch(alert, trip.id) && isOpen(alert.status || "ABERTO"));
      if (elapsedMs > WAITING_MS && !alreadyExists) {
        const alert = repository.addItem("alertas", {
          viagem_id: trip.id,
          viagemId: trip.id,
          tipo: "ESPERA_PROLONGADA",
          descricao: "Viagem em espera ha mais de 30 minutos.",
          status: "ABERTO",
          created_at: nowIso()
        });
        recordEvent({ viagem_id: trip.id, tipo: "ESPERA_PROLONGADA", descricao: alert.descricao, alerta_id: alert.id });
        recordSync({ tipo: "ESPERA_PROLONGADA", viagem_id: trip.id, payload: alert });
        generated += 1;
      }
    }
    return generated;
  }

  return {
    status,
    dashboardSummary,
    list,
    create,
    find,
    updateStatus,
    listByTrip,
    addPassenger,
    addLocation,
    addGps,
    addEvent,
    addAlert,
    resolveAlert,
    addMessage,
    addChecklist,
    addSimpleLogged,
    createTrip,
    createPassenger,
    transitionTrip,
    operationalTripAction,
    passengerAction,
    addOccurrence,
    resolveOccurrence,
    addExpense,
    addSyncEvent,
    syncStatus,
    forceSync,
    timeline,
    liveMap,
    tripRoute,
    managementDashboard,
    managementFleet,
    managementDrivers,
    managementPassengers,
    managementCosts,
    managementAudit,
    operatorIndicators,
    managerIndicators,
    chartData,
    exportCsv,
    driverLogin,
    driverTrips,
    driverNotices,
    driverChecklist,
    driverInitialKm,
    driverFlowAction,
    driverFinalizeTrip,
    driverPanic,
    driverProof,
    panicComplete,
    emergencyList,
    attendEmergency,
    finishEmergency,
    startGiroflex,
    finishGiroflex,
    advancedWatchdog,
    antifraudReport,
    operationalMessages,
    createOperationalMessage,
    auditReport,
    lgpdReport,
    driverTripStatus
  };
}

function enrichDriverTrip(data, trip) {
  const motoristaId = trip.motorista_id || trip.motoristaId;
  const veiculoId = trip.veiculo_id || trip.veiculoId;
  return {
    ...trip,
    motorista: data.motoristas.find((item) => String(item.id) === String(motoristaId)) || null,
    veiculo: data.veiculos.find((item) => String(item.id) === String(veiculoId)) || null,
    passageiros: data.passageiros.filter((item) => tripMatch(item, trip.id)),
    prioridade: trip.prioridade || "NORMAL"
  };
}

function enrichEmergency(data, emergency) {
  const trip = data.viagens.find((item) => String(item.id) === String(emergency.viagem_id)) || {};
  const driver = data.motoristas.find((item) => String(item.id) === String(emergency.motorista_id || trip.motorista_id || trip.motoristaId)) || {};
  const vehicle = data.veiculos.find((item) => String(item.id) === String(emergency.veiculo_id || trip.veiculo_id || trip.veiculoId)) || {};
  return {
    ...emergency,
    viagem: {
      id: trip.id || emergency.viagem_id,
      origem: trip.origem || null,
      destino: trip.destino || null,
      status: trip.status || null
    },
    motorista: {
      id: driver.id || emergency.motorista_id || null,
      nome: driver.nome || null,
      telefone: driver.telefone || null
    },
    veiculo: {
      id: vehicle.id || emergency.veiculo_id || null,
      placa: vehicle.placa || null,
      prefixo: vehicle.prefixo || vehicle.nome || null
    },
    cronometro_segundos: Math.max(0, Math.round((Date.now() - new Date(emergency.iniciou_em || emergency.created_at || Date.now()).getTime()) / 1000))
  };
}

function speedLimitForTrip(data, trip) {
  const vehicle = data.veiculos.find((item) => String(item.id) === String(trip.veiculo_id || trip.veiculoId)) || {};
  return Number(vehicle.limite_velocidade || vehicle.velocidade_maxima || SPEED_LIMIT_KMH);
}

function gpsDistanceForTrip(data, tripId) {
  const points = data.localizacoes
    .filter((item) => tripMatch(item, tripId) && item.latitude !== undefined && item.longitude !== undefined)
    .sort((a, b) => new Date(a.created_at || a.registrado_em || a.timestamp_dispositivo || 0).getTime() - new Date(b.created_at || b.registrado_em || b.timestamp_dispositivo || 0).getTime());
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += haversineKm(points[index - 1], points[index]);
  }
  return total;
}

function haversineKm(a, b) {
  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(Number(b.latitude) - Number(a.latitude));
  const dLon = toRad(Number(b.longitude) - Number(a.longitude));
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function maskName(name = "") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return `${parts[0]} ${parts.length > 1 ? "***" : ""}`.trim();
}

function maskCpf(cpf = "") {
  const digits = String(cpf || "").replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***.${digits.slice(-4)}`;
}

function sortNewest(a, b) {
  return new Date(b.data || b.created_at || b.criadoEm || 0).getTime() - new Date(a.data || a.created_at || a.criadoEm || 0).getTime();
}

function gpsFromPayload(payload = {}) {
  if (payload.latitude === undefined || payload.longitude === undefined) return null;
  return {
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    precisao: payload.precisao === undefined ? null : Number(payload.precisao),
    dataHora: payload.dataHora || payload.timestamp || nowIso()
  };
}

function liveVehicle(data, trip) {
  const latest = latestLocation(data, trip.id);
  const vehicleId = trip.veiculo_id || trip.veiculoId || (latest && (latest.veiculo_id || latest.veiculoId));
  const driverId = trip.motorista_id || trip.motoristaId || (latest && (latest.motorista_id || latest.motoristaId));
  const vehicle = data.veiculos.find((item) => String(item.id) === String(vehicleId)) || {};
  const driver = data.motoristas.find((item) => String(item.id) === String(driverId)) || {};
  const passengers = data.passageiros.filter((item) => tripMatch(item, trip.id));
  const openAlert = data.alertas.find((item) => tripMatch(item, trip.id) && isOpen(item.status || "ABERTO"));
  const openOccurrence = data.ocorrencias.find((item) => tripMatch(item, trip.id) && isOpen(item.status || "ABERTA"));
  const speed = latest && latest.velocidade !== undefined && latest.velocidade !== null ? Number(latest.velocidade) : null;
  const status = normalizeStatus((latest && latest.status_viagem) || trip.status || "AGUARDANDO");

  return {
    veiculo_id: vehicleId || null,
    placa: vehicle.placa || null,
    prefixo: vehicle.prefixo || vehicle.nome || null,
    motorista: driver.nome || null,
    telefone: driver.telefone || null,
    viagem_id: trip.id,
    status_viagem: status,
    latitude: latest ? Number(latest.latitude) : null,
    longitude: latest ? Number(latest.longitude) : null,
    velocidade: speed,
    ultima_atualizacao: latest ? latest.timestamp_dispositivo || latest.registrado_em || latest.created_at || latest.criadoEm : null,
    origem: trip.origem || null,
    destino: trip.destino || null,
    passageiros: passengers.length,
    alerta_ativo: Boolean(openAlert || openOccurrence),
    tipo_alerta: openAlert ? openAlert.tipo : openOccurrence ? openOccurrence.tipo : null,
    cor_status: colorStatus({ latest, speed, status, openAlert, openOccurrence })
  };
}

function colorStatus({ latest, speed, status, openAlert, openOccurrence }) {
  if (openAlert && openAlert.tipo === "VELOCIDADE_ACIMA_LIMITE") return "LARANJA";
  if (openAlert || openOccurrence) return "VERMELHO";
  if (!latest) return "CINZA";
  const latestTime = new Date(latest.timestamp_dispositivo || latest.registrado_em || latest.created_at || latest.criadoEm).getTime();
  if (Date.now() - latestTime > GPS_STALE_MS) return "CINZA";
  if (Number(speed || 0) === 0 || status === "EM_ESPERA") return "AMARELO";
  if (["CONCLUIDA", "PASSAGEIRO_DESEMBARCADO"].includes(status)) return "VERDE";
  return "AZUL";
}

function latestLocation(data, tripId) {
  return data.localizacoes
    .filter((item) => tripMatch(item, tripId))
    .sort((a, b) => new Date(a.created_at || a.criadoEm || a.timestamp_dispositivo || a.registrado_em).getTime() - new Date(b.created_at || b.criadoEm || b.timestamp_dispositivo || b.registrado_em).getTime())
    .at(-1) || null;
}

function buildFeed(data) {
  const sources = [
    ...data.eventos.map((item) => timelineItem(item, "evento")),
    ...data.alertas.map((item) => timelineItem(item, "alerta")),
    ...data.ocorrencias.map((item) => timelineItem(item, "ocorrencia")),
    ...data.mensagens.map((item) => timelineItem(item, "mensagem")),
    ...data.syncLogs.map((item) => timelineItem(item, "sync"))
  ];
  return sources.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
}

function isOpen(status) {
  return !["RESOLVIDO", "RESOLVIDA", "CONCLUIDA", "CANCELADA"].includes(normalizeStatus(status));
}

function filterTrips(trips, filters = {}) {
  return trips.filter((trip) => {
    const date = String(trip.data_viagem || trip.dataViagem || "").slice(0, 10);
    if (filters.inicio && date && date < String(filters.inicio).slice(0, 10)) return false;
    if (filters.fim && date && date > String(filters.fim).slice(0, 10)) return false;
    if (filters.motoristaId && String(trip.motorista_id || trip.motoristaId || "") !== String(filters.motoristaId)) return false;
    if (filters.veiculoId && String(trip.veiculo_id || trip.veiculoId || "") !== String(filters.veiculoId)) return false;
    if (filters.destino && !String(trip.destino || "").toLowerCase().includes(String(filters.destino).toLowerCase())) return false;
    if (filters.status && normalizeStatus(trip.status) !== normalizeStatus(filters.status)) return false;
    return true;
  });
}

function tripKm(trip) {
  const saida = Number(trip.km_saida || 0);
  const retorno = Number(trip.km_retorno || 0);
  if (retorno > saida) return retorno - saida;
  return Number(trip.km_estimado || trip.kmSimulados || 0);
}

function percent(value, total) {
  if (!total) return 0;
  return Number(((Number(value || 0) / Number(total)) * 100).toFixed(1));
}

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = selector(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
}

function countMoneyBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = selector(item);
    counts[key] = money((counts[key] || 0) + Number(item.valor || 0));
  }
  return counts;
}

function toCsv(rows, headers) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value).replace(/\r?\n/g, " ");
  if (/[",;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function chartTripsByStatus(trips) {
  const buckets = {
    Agendada: 0,
    Ida: 0,
    Espera: 0,
    Retorno: 0,
    Finalizada: 0
  };
  for (const trip of trips) {
    const status = normalizeStatus(trip.status);
    if (["AGUARDANDO", "PREPARACAO", "SAIDA_CONFIRMADA"].includes(status)) buckets.Agendada += 1;
    else if (["EM_TRANSITO_IDA", "CHEGADA_EMBARQUE", "PASSAGEIRO_EMBARCADO", "PASSAGEIRO_AUSENTE"].includes(status)) buckets.Ida += 1;
    else if (status === "EM_ESPERA") buckets.Espera += 1;
    else if (["REEMBARQUE_RETORNO", "EM_TRANSITO_VOLTA", "PASSAGEIRO_DESEMBARCADO", "FINALIZACAO"].includes(status)) buckets.Retorno += 1;
    else if (["CONCLUIDA", "CANCELADA"].includes(status)) buckets.Finalizada += 1;
    else buckets.Agendada += 1;
  }
  return {
    id: "status-viagens",
    title: "Status das Viagens",
    type: "doughnut",
    labels: Object.keys(buckets),
    values: Object.values(buckets)
  };
}

function chartTripsByMonth(trips) {
  const months = {};
  for (const trip of trips) {
    const key = String(trip.data_viagem || trip.dataViagem || new Date().toISOString()).slice(0, 7);
    months[key] = (months[key] || 0) + 1;
  }
  const labels = Object.keys(months).sort();
  return {
    id: "viagens-mes",
    title: "Viagens por Mes",
    type: "bar",
    labels,
    values: labels.map((label) => months[label])
  };
}

function chartEventsByHour(events) {
  const hours = {};
  for (let hour = 0; hour < 24; hour += 1) hours[String(hour).padStart(2, "0")] = 0;
  for (const event of events) {
    const date = new Date(event.created_at || event.criadoEm || event.dataHora || Date.now());
    if (!Number.isNaN(date.getTime())) hours[String(date.getHours()).padStart(2, "0")] += 1;
  }
  return {
    id: "movimentacao-hora",
    title: "Movimentacao por Hora",
    type: "line",
    labels: Object.keys(hours),
    values: Object.values(hours)
  };
}

function tripMatch(item, tripId) {
  return String(item.viagemId || item.viagem_id || item.tripId || "") === String(tripId);
}

function normalizeTrip(trip) {
  const timestamp = nowIso();
  const id = trip.id || trip.codigo;
  return {
    ...trip,
    id,
    codigo: trip.codigo || id,
    motorista_id: trip.motorista_id || trip.motoristaId || null,
    veiculo_id: trip.veiculo_id || trip.veiculoId || null,
    status: normalizeStatus(trip.status || "AGUARDANDO"),
    prioridade: trip.prioridade || "NORMAL",
    data_viagem: trip.data_viagem || trip.dataViagem || new Date().toISOString().slice(0, 10),
    km_saida: trip.km_saida ?? null,
    km_retorno: trip.km_retorno ?? null,
    hora_saida: trip.hora_saida ?? null,
    hora_retorno: trip.hora_retorno ?? null,
    hora_finalizacao: trip.hora_finalizacao ?? null,
    observacoes: trip.observacoes || "",
    created_at: trip.created_at || trip.criadoEm || timestamp,
    updated_at: trip.updated_at || timestamp
  };
}

function normalizePassenger(passenger) {
  const flags = {
    necessidade_especial: Boolean(passenger.necessidade_especial),
    cadeirante: Boolean(passenger.cadeirante),
    usa_muletas: Boolean(passenger.usa_muletas),
    mobilidade_reduzida: Boolean(passenger.mobilidade_reduzida),
    necessita_auxilio: Boolean(passenger.necessita_auxilio),
    acompanhante: Boolean(passenger.acompanhante)
  };
  const tipo = normalizePassengerType(passenger.tipo || "PACIENTE");
  const possuiNecessidadeEspecial = flags.necessidade_especial || flags.cadeirante || flags.usa_muletas || flags.mobilidade_reduzida || flags.necessita_auxilio || Boolean(passenger.acompanhante_obrigatorio);
  return {
    ...passenger,
    viagem_id: passenger.viagem_id || passenger.viagemId,
    tipo,
    cpf: passenger.cpf || "",
    telefone: passenger.telefone || "",
    ...flags,
    acompanhante: flags.acompanhante || tipo === "ACOMPANHANTE",
    paciente_referencia: passenger.paciente_referencia || passenger.acompanhanteDe || null,
    status: normalizeStatus(passenger.status || "AGUARDANDO"),
    observacoes_embarque: passenger.observacoes_embarque || "",
    observacoes: passenger.observacoes || "",
    possuiNecessidadeEspecial,
    created_at: passenger.created_at || passenger.criadoEm || nowIso(),
    updated_at: passenger.updated_at || nowIso()
  };
}

function normalizeStatus(status) {
  return String(status || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function normalizePassengerType(type) {
  const normalized = normalizeStatus(type || "PACIENTE");
  return normalized === "ACOMPANHANTE" ? "ACOMPANHANTE" : "PACIENTE";
}

function validateTripState(status) {
  if (!TRIP_STATES.includes(status)) {
    const error = new Error(`Estado de viagem invalido: ${status}.`);
    error.statusCode = 400;
    throw error;
  }
}

function timelineItem(item, origem) {
  return {
    origem,
    tipo: item.tipo || item.categoria || origem,
    descricao: item.descricao || item.mensagem || item.titulo || item.observacao || origem,
    viagem_id: item.viagem_id || item.viagemId || null,
    dataHora: item.created_at || item.criadoEm || item.createdAt || item.registrado_em || nowIso(),
    item
  };
}

function nowIso() {
  return new Date().toISOString();
}

module.exports = createLogisticService;
