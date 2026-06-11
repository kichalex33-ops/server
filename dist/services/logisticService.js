import { requireAny, requireField, validateCoordinates } from '../utils/validation.js';
import httpError from '../utils/httpError.js';
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
    lgpdConsents: "lgp",
    ocorrencias: "ocorrencias",
    despesas: "despesas",
    syncLogs: "syncLogs"
};
const TRIP_STATES = [
    "AGUARDANDO", "PREPARACAO", "SAIDA_CONFIRMADA", "EM_TRANSITO_IDA", "CHEGADA_EMBARQUE",
    "PASSAGEIRO_EMBARCADO", "PASSAGEIRO_AUSENTE", "EM_ESPERA", "REEMBARQUE_RETORNO",
    "EM_TRANSITO_VOLTA", "PASSAGEIRO_DESEMBARCADO", "FINALIZACAO", "CONCLUIDA", "CANCELADA",
    "PENDENTE_SINCRONIZACAO", "SINCRONIZADA", "ERRO_SINCRONIZACAO"
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
    "AGUARDANDO", "PREPARACAO", "SAIDA_CONFIRMADA", "EM_TRANSITO_IDA", "CHEGADA_EMBARQUE",
    "PASSAGEIRO_EMBARCADO", "PASSAGEIRO_AUSENTE", "EM_ESPERA", "REEMBARQUE_RETORNO",
    "EM_TRANSITO_VOLTA", "PASSAGEIRO_DESEMBARCADO", "FINALIZACAO"
];
const GPS_STALE_MS = 10 * 60 * 1000;
const STOPPED_MS = 15 * 60 * 1000;
const WAITING_MS = 30 * 60 * 1000;
const SPEED_LIMIT_KMH = 80;
import { createDriverPairingService } from './driverPairingService.js';
export function createLogisticService(factory) {
    const repository = factory.json; // Fallback para operacoes nao migradas
    const motoristaRepo = factory.motoristas;
    const veiculoRepo = factory.veiculos;
    const pacienteRepo = factory.pacientes;
    const viagemRepo = factory.viagens;
    const pairingService = createDriverPairingService(factory.json);
    async function createMotorista(payload) {
        requireField(payload, 'nome', 'nome');
        requireField(payload, 'cpf', 'cpf');
        const motorista = await motoristaRepo.addItem('motoristas', {
            ...payload,
            status: payload.status || 'ativo',
        });
        // Gera QR Code automaticamente após cadastro
        const pairing = await pairingService.createPairing({
            motoristaId: motorista.id,
            serverUrl: payload.server_url || process.env.APP_URL || ''
        });
        return { motorista, pairing };
    }
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
    function productionInfra() {
        const data = repository.loadData();
        const storage = repository.storageInfo();
        return {
            servidor: {
                app: data.config.app,
                empresa: data.config.empresa,
                ambiente: process.env.NODE_ENV || data.config.ambiente || "development",
                uptimeSegundos: Math.round(process.uptime()),
                node: process.version,
                porta: Number(process.env.PORT || 3000),
                timestamp: nowIso()
            },
            storage,
            indicadores: {
                gpsRecebidos: data.localizacoes.length,
                eventosRecebidos: data.eventos.length,
                alertasAbertos: data.alertas.filter((item) => isOpen(item.status || "ABERTO")).length
            }
        };
    }
    function resourceSnapshot() {
        const data = repository.loadData();
        const storage = repository.storageInfo();
        const memory = process.memoryUsage();
        return {
            uptimeSegundos: Math.round(process.uptime()),
            memoria: memory,
            dados: {
                tamanhoJsonBytes: storage.dataSizeBytes,
                viagens: data.viagens.length,
                alertasAbertos: data.alertas.filter((item) => isOpen(item.status || "ABERTO")).length
            },
            timestamp: nowIso()
        };
    }
    function dashboardSummary() {
        runWaitingMonitor();
        const data = repository.loadData();
        const todayStr = new Date().toISOString().slice(0, 10);
        const viagensHoje = data.viagens.filter((trip) => (trip.data_viagem || trip.dataViagem || "").slice(0, 10) === todayStr);
        const ultimaLocalizacao = data.localizacoes[data.localizacoes.length - 1] || null;
        const viagemAtiva = viagensHoje[0] || data.viagens[0] || null;
        return {
            viagensHoje: viagensHoje.length,
            viagensEmAndamento: data.viagens.filter((trip) => ACTIVE_TRIP_STATUSES.includes(normalizeStatus(trip.status))).length,
            motoristasAtivos: data.motoristas.filter((driver) => driver.status === "ativo").length,
            ultimaLocalizacao,
            viagem_ativa: viagemAtiva
        };
    }
    function list(collection) {
        return { [collectionResponseKeys[collection]]: repository.getCollection(collection) };
    }
    async function create(collection, payload) {
        if (collection === "viagens")
            return createTrip(payload);
        if (collection === "motoristas")
            return createMotorista(payload);
        return repository.addItem(collection, payload);
    }
    function find(collection, id) {
        return repository.findById(collection, id);
    }
    async function updateStatus(collection, id, status) {
        requireField({ status }, "status", "status");
        if (collection === "viagens")
            return transitionTrip(id, status, {});
        return repository.updateItem(collection, id, { status: normalizeStatus(status) });
    }
    function listByTrip(collection, tripId) {
        const items = repository.getCollection(collection).filter((item) => tripMatch(item, tripId));
        return { [collectionResponseKeys[collection]]: items };
    }
    async function addGps(payload) {
        const viagemId = requireAny(payload, ["viagem_id", "viagemId"], "viagem_id");
        const trip = repository.findById("viagens", viagemId);
        if (!trip)
            throw httpError(404, "Viagem nao encontrada.");
        const { latitude, longitude } = validateCoordinates(payload);
        const timestamp = nowIso();
        const deviceTimestamp = payload.timestamp_dispositivo || payload.timestamp || timestamp;
        const velocidade = Number(payload.velocidade || 0);
        const location = await repository.addItem("localizacoes", {
            viagem_id: viagemId,
            viagemId,
            latitude,
            longitude,
            velocidade,
            timestamp_dispositivo: deviceTimestamp,
            created_at: timestamp,
            registrado_em: deviceTimestamp
        });
        await repository.updateItem("viagens", viagemId, {
            status: normalizeStatus(payload.status_viagem || trip.status || "AGUARDANDO"),
            updated_at: timestamp
        });
        evaluateGpsAlerts(location, trip);
        return location;
    }
    async function createTrip(payload) {
        const timestamp = nowIso();
        const trip = await repository.addItem("viagens", normalizeTrip({
            status: "AGUARDANDO",
            ...payload,
            created_at: payload.created_at || timestamp,
            updated_at: timestamp
        }));
        recordEvent({ viagem_id: trip.id, tipo: "VIAGEM_CRIADA", descricao: "Viagem criada" });
        return trip;
    }
    async function transitionTrip(tripId, targetStatus, payload = {}) {
        const trip = repository.findById("viagens", tripId);
        if (!trip)
            return null;
        const from = normalizeStatus(trip.status || "AGUARDANDO");
        const to = normalizeStatus(targetStatus);
        validateTripState(to);
        const timestamp = nowIso();
        const patch = { ...payload, status: to, updated_at: timestamp };
        const updated = await repository.updateItem("viagens", tripId, patch);
        recordEvent({ viagem_id: tripId, tipo: "VIAGEM_STATUS", descricao: `Viagem alterada de ${from} para ${to}`, status: to });
        return updated;
    }
    function liveMap() {
        runOperationalMonitors();
        const data = repository.loadData();
        const veiculos = data.viagens
            .filter((trip) => ACTIVE_TRIP_STATUSES.includes(normalizeStatus(trip.status)))
            .map((trip) => liveVehicle(data, trip));
        return {
            atualizado_em: nowIso(),
            veiculos,
            indicadores: { viagensAtivas: veiculos.length }
        };
    }
    function driverLogin(payload) {
        const identificador = requireAny(payload, ["login", "cpf"], "login ou CPF");
        const senha = requireField(payload, "senha", "senha");
        const driver = repository.getCollection("motoristas").find((item) => String(item.cpf) === String(identificador) || String(item.id) === String(identificador));
        if (!driver || senha !== "OPteste 01")
            throw httpError(401, "Credenciais invalidas.");
        return { token: "demo-token", usuario: authUserFromDriver(driver) };
    }
    // Monitoring
    function runOperationalMonitors() {
        runWaitingMonitor();
    }
    function runWaitingMonitor() {
        const data = repository.loadData();
        for (const trip of data.viagens) {
            if (normalizeStatus(trip.status) === "EM_ESPERA" && trip.espera_iniciada_em) {
                const elapsed = Date.now() - new Date(trip.espera_iniciada_em).getTime();
                if (elapsed > WAITING_MS) {
                    ensureAlert({ viagem_id: trip.id, tipo: "ESPERA_PROLONGADA", descricao: "Espera ha mais de 30 min" });
                }
            }
        }
    }
    function evaluateGpsAlerts(location, trip) {
        if (Number(location.velocidade || 0) > SPEED_LIMIT_KMH) {
            ensureAlert({
                viagem_id: location.viagem_id,
                tipo: "VELOCIDADE_ACIMA_LIMITE",
                descricao: `Velocidade: ${location.velocidade} km/h`,
                severidade: "ALTA"
            });
        }
    }
    function ensureAlert(payload) {
        const data = repository.loadData();
        const exists = data.alertas.some((a) => a.tipo === payload.tipo && tripMatch(a, payload.viagem_id) && isOpen(a.status || "ABERTO"));
        if (exists)
            return null;
        return repository.addItem("alertas", { status: "ABERTO", ...payload, created_at: nowIso() });
    }
    function recordEvent(payload) {
        return repository.addItem("eventos", { ...payload, created_at: nowIso() });
    }
    function authUserFromDriver(driver) {
        return {
            id: driver.id,
            nome: driver.nome,
            perfil: "motorista",
            permissoes: { viagens: true }
        };
    }
    function liveVehicle(data, trip) {
        const latest = data.localizacoes.filter((l) => tripMatch(l, trip.id)).at(-1);
        return {
            id: trip.id,
            status: trip.status,
            latitude: latest ? latest.latitude : null,
            longitude: latest ? latest.longitude : null,
            velocidade: latest ? latest.velocidade : null
        };
    }
    return {
        status, productionInfra, resourceSnapshot, dashboardSummary, list, create, find, updateStatus,
        listByTrip, addGps, liveMap, driverLogin
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
    if (!TRIP_STATES.includes(status))
        throw httpError(400, `Estado invalido: ${status}`);
}
function nowIso() { return new Date().toISOString(); }
function tripMatch(item, tripId) {
    return String(item.viagemId || item.viagem_id || "") === String(tripId);
}
function normalizeTrip(trip) {
    return { ...trip, status: normalizeStatus(trip.status || "AGUARDANDO") };
}
function isOpen(status) {
    return !["RESOLVIDO", "CONCLUIDA", "CANCELADA"].includes(normalizeStatus(status));
}
