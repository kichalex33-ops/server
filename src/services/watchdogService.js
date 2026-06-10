const DEFAULT_GPS_STALE_MS = 10 * 60 * 1000;
const DEFAULT_DRIVER_STALE_MS = 20 * 60 * 1000;
const DEFAULT_SYNC_QUEUE_LIMIT = 25;

function analyzeOperationalHealth(data, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const gpsStaleMs = Number(options.gpsStaleMs || DEFAULT_GPS_STALE_MS);
  const driverStaleMs = Number(options.driverStaleMs || DEFAULT_DRIVER_STALE_MS);
  const syncQueueLimit = Number(options.syncQueueLimit || DEFAULT_SYNC_QUEUE_LIMIT);
  const alertas = [];

  const latestLocationsByTrip = latestBy(data.localizacoes || [], (item) => item.viagem_id || item.viagemId);
  const latestLocationsByDriver = latestBy(data.localizacoes || [], (item) => item.motorista_id || item.motoristaId);
  const pendingSyncEvents = (data.syncLogs || []).filter((item) => isPending(item.status));
  const errorSyncEvents = (data.syncLogs || []).filter((item) => isError(item.status));

  for (const trip of data.viagens || []) {
    if (!isActiveTrip(trip.status)) continue;
    const latest = latestLocationsByTrip.get(String(trip.id));
    if (!latest) {
      alertas.push(watchdogAlert("GPS_PARADO", "Viagem ativa sem GPS recebido.", trip, "ALTA"));
      continue;
    }

    const latestTime = eventTime(latest);
    if (latestTime && now.getTime() - latestTime.getTime() > gpsStaleMs) {
      alertas.push(watchdogAlert("GPS_PARADO", "GPS sem atualização dentro da janela operacional.", trip, "ALTA"));
    }

    const tripUpdate = eventTime({ created_at: trip.updated_at || trip.atualizadoEm || trip.criadoEm || trip.created_at });
    if (tripUpdate && now.getTime() - tripUpdate.getTime() > driverStaleMs) {
      alertas.push(watchdogAlert("VIAGEM_SEM_ATUALIZACAO", "Viagem ativa sem mudança recente de estado.", trip, "MEDIA"));
    }
  }

  for (const driver of data.motoristas || []) {
    if (String(driver.status || "").toLowerCase() !== "ativo") continue;
    const latest = latestLocationsByDriver.get(String(driver.id));
    if (!latest) continue;
    const latestTime = eventTime(latest);
    if (latestTime && now.getTime() - latestTime.getTime() > driverStaleMs) {
      alertas.push({
        tipo: "DISPOSITIVO_DESCONECTADO",
        severidade: "MEDIA",
        descricao: "Motorista ativo sem comunicação recente do dispositivo.",
        motorista_id: driver.id,
        created_at: now.toISOString()
      });
    }
  }

  if (pendingSyncEvents.length > syncQueueLimit) {
    alertas.push({
      tipo: "FILA_SYNC_CRESCENDO",
      severidade: "ALTA",
      descricao: `Fila de sincronização acima do limite operacional (${pendingSyncEvents.length}).`,
      total_pendente: pendingSyncEvents.length,
      created_at: now.toISOString()
    });
  }

  return {
    status: alertas.some((item) => item.severidade === "ALTA") ? "atencao" : "ok",
    alertas,
    metricas: {
      gps_total: (data.localizacoes || []).length,
      motoristas_ativos: (data.motoristas || []).filter((item) => String(item.status || "").toLowerCase() === "ativo").length,
      viagens_ativas: (data.viagens || []).filter((item) => isActiveTrip(item.status)).length,
      sync_pendente: pendingSyncEvents.length,
      sync_erro: errorSyncEvents.length
    },
    timestamp: now.toISOString()
  };
}

function latestBy(items, selector) {
  const result = new Map();
  for (const item of items) {
    const key = selector(item);
    if (!key) continue;
    const current = result.get(String(key));
    if (!current || compareTime(item, current) > 0) result.set(String(key), item);
  }
  return result;
}

function compareTime(a, b) {
  return Number(eventTime(a) || 0) - Number(eventTime(b) || 0);
}

function eventTime(item) {
  const value = item.timestamp_dispositivo || item.registrado_em || item.created_at || item.criadoEm || item.createdAt;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function watchdogAlert(tipo, descricao, trip, severidade) {
  return {
    tipo,
    severidade,
    descricao,
    viagem_id: trip.id,
    motorista_id: trip.motorista_id || trip.motoristaId || null,
    veiculo_id: trip.veiculo_id || trip.veiculoId || null,
    created_at: new Date().toISOString()
  };
}

function isActiveTrip(status) {
  return [
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
  ].includes(normalize(status));
}

function isPending(status) {
  return ["PENDENTE", "PENDING", "LOCAL", "ENVIANDO"].includes(normalize(status));
}

function isError(status) {
  return ["ERRO", "ERROR", "FALHA"].includes(normalize(status));
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

module.exports = {
  analyzeOperationalHealth
};
