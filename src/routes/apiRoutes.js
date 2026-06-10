const express = require("express");
const createDriverPairingRoutes = require("./driverPairingRoutes");
const createLogisticService = require("../services/logisticService");
const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");

function createApiRoutes({ repository }) {
  const router = express.Router();
  const service = createLogisticService(repository);

  router.get("/status", (req, res) => res.json(service.status()));
  router.get("/system/health", (req, res) => res.json(systemHealth(repository)));
  router.get("/infra/status", (req, res) => res.json(ok(service.productionInfra())));
  router.get("/infra/resources", (req, res) => res.json(ok(service.resourceSnapshot())));
  router.get("/infra/backups", (req, res) => res.json(ok(service.listProductionBackups())));
  router.post("/infra/backup", asyncHandler((req, res) => res.status(201).json(ok(service.createProductionBackup(req.body)))));
  router.post("/infra/restore", asyncHandler((req, res) => res.json(ok(service.restoreProductionBackup(req.body)))));
  router.get("/dashboard/resumo-dia", (req, res) => res.json(ok(service.dashboardSummary())));

  registerCollection(router, service, "viagens", "/viagens", "viagem");
  router.get("/viagens/:id", (req, res) => res.json(okOr404(service.find("viagens", req.params.id), "Viagem nao encontrada.")));
  router.put("/viagens/:id/status", (req, res) => res.json(okOr404(service.updateStatus("viagens", req.params.id, req.body.status), "Viagem nao encontrada.")));
  router.post("/viagens/:id/iniciar-preparacao", asyncHandler((req, res) => res.json(ok(service.operationalTripAction(req.params.id, "iniciarPreparacao", req.body)))));
  router.post("/viagens/:id/confirmar-saida", asyncHandler((req, res) => res.json(ok(service.operationalTripAction(req.params.id, "confirmarSaida", req.body)))));
  router.post("/viagens/:id/iniciar-espera", asyncHandler((req, res) => res.json(ok(service.operationalTripAction(req.params.id, "iniciarEspera", req.body)))));
  router.post("/viagens/:id/iniciar-retorno", asyncHandler((req, res) => res.json(ok(service.operationalTripAction(req.params.id, "iniciarRetorno", req.body)))));
  router.post("/viagens/:id/finalizar", asyncHandler((req, res) => res.json(ok(service.operationalTripAction(req.params.id, "finalizar", req.body)))));
  router.post("/viagens/:id/cancelar", asyncHandler((req, res) => res.json(ok(service.operationalTripAction(req.params.id, "cancelar", req.body)))));
  router.get("/viagens/:id/timeline", (req, res) => res.json(ok(service.timeline(req.params.id))));

  registerCollection(router, service, "motoristas", "/motoristas", "motorista");
  registerCollection(router, service, "veiculos", "/veiculos", "veiculo");
  registerCollection(router, service, "pacientes", "/pacientes", "paciente");

  router.get("/viagens/:id/passageiros", (req, res) => res.json(ok(service.listByTrip("passageiros", req.params.id))));
  router.post("/viagens/:id/passageiros", asyncHandler((req, res) => res.status(201).json(ok({ passageiro: service.addPassenger(req.params.id, req.body) }))));
  router.put("/passageiros/:id/status", (req, res) => res.json(okOr404(service.updateStatus("passageiros", req.params.id, req.body.status), "Passageiro nao encontrado.")));
  router.post("/passageiros/:id/embarque", asyncHandler((req, res) => res.json(okOr404({ passageiro: service.passengerAction(req.params.id, "embarque", req.body) }, "Passageiro nao encontrado."))));
  router.post("/passageiros/:id/desembarque", asyncHandler((req, res) => res.json(okOr404({ passageiro: service.passengerAction(req.params.id, "desembarque", req.body) }, "Passageiro nao encontrado."))));
  router.post("/passageiros/:id/ausente", asyncHandler((req, res) => res.json(okOr404({ passageiro: service.passengerAction(req.params.id, "ausente", req.body) }, "Passageiro nao encontrado."))));
  router.post("/passageiros/:id/desistiu", asyncHandler((req, res) => res.json(okOr404({ passageiro: service.passengerAction(req.params.id, "desistiu", req.body) }, "Passageiro nao encontrado."))));

  router.post("/localizacoes", asyncHandler((req, res) => res.status(201).json(ok(service.addLocation(req.body)))));
  router.get("/viagens/:id/localizacoes", (req, res) => res.json(ok(service.listByTrip("localizacoes", req.params.id))));
  router.post("/gps", asyncHandler((req, res) => {
    const gps = service.addGps(req.body);
    res.status(201).json({ success: true, message: "GPS recebido com sucesso", data: gps });
  }));
  router.get("/live-map", (req, res) => res.json(ok(service.liveMap())));
  router.get("/viagens/:id/trajeto", (req, res) => res.json(ok(service.tripRoute(req.params.id))));

  router.post("/eventos", asyncHandler((req, res) => res.status(201).json(ok(service.addEvent(req.body)))));
  router.get("/viagens/:id/eventos", (req, res) => res.json(ok(service.listByTrip("eventos", req.params.id))));

  router.get("/alertas", (req, res) => res.json(ok(service.list("alertas"))));
  router.post("/alertas", asyncHandler((req, res) => res.status(201).json(ok(service.addAlert(req.body)))));
  router.put("/alertas/:id/resolver", (req, res) => res.json(okOr404(service.resolveAlert(req.params.id), "Alerta nao encontrado.")));

  router.post("/mensagens", asyncHandler((req, res) => res.status(201).json(ok(service.createOperationalMessage(req.body)))));
  router.get("/viagens/:id/mensagens", (req, res) => res.json(ok(service.listByTrip("mensagens", req.params.id))));

  router.post("/checklists", asyncHandler((req, res) => res.status(201).json(ok(service.addChecklist(req.body)))));
  router.get("/viagens/:id/checklists", (req, res) => res.json(ok(service.listByTrip("checklists", req.params.id))));

  router.get("/ocorrencias", (req, res) => res.json(ok(service.list("ocorrencias"))));
  router.post("/ocorrencias", asyncHandler((req, res) => res.status(201).json(ok({ ocorrencia: service.addOccurrence(req.body) }))));
  router.get("/viagens/:id/ocorrencias", (req, res) => res.json(ok(service.listByTrip("ocorrencias", req.params.id))));
  router.put("/ocorrencias/:id/resolver", asyncHandler((req, res) => res.json(okOr404({ ocorrencia: service.resolveOccurrence(req.params.id, req.body) }, "Ocorrencia nao encontrada."))));

  router.get("/despesas", (req, res) => res.json(ok(service.list("despesas"))));
  router.post("/despesas", asyncHandler((req, res) => res.status(201).json(ok({ despesa: service.addExpense(req.body) }))));
  router.get("/viagens/:id/despesas", (req, res) => res.json(ok(service.listByTrip("despesas", req.params.id))));

  router.get("/sync/logs", (req, res) => res.json(ok(service.list("syncLogs"))));
  router.post("/sync/logs", (req, res) => res.status(201).json(ok(service.addSimpleLogged("syncLogs", "SYNC", req.body))));
  router.post("/sync/evento", asyncHandler((req, res) => res.status(201).json(ok({ syncLog: service.addSyncEvent(req.body) }))));
  router.get("/sync/painel", (req, res) => res.json(ok(service.syncStatus())));
  router.get("/sync/status", (req, res) => res.json(ok(service.syncStatus())));
  router.post("/sync/forcar", asyncHandler((req, res) => res.json(ok(service.forceSync()))));
  router.post("/sync/reenvio", asyncHandler((req, res) => res.json(ok(service.retrySyncErrors(req.body)))));

  router.get("/gestao/dashboard", (req, res) => res.json(ok(service.managementDashboard(req.query))));
  router.get("/gestao/frota", (req, res) => res.json(ok(service.managementFleet(req.query))));
  router.get("/gestao/frota/ranking", (req, res) => res.json(ok({ ranking: service.managementFleet(req.query).ranking })));
  router.get("/gestao/motoristas", (req, res) => res.json(ok(service.managementDrivers(req.query))));
  router.get("/gestao/motoristas/ranking", (req, res) => res.json(ok({ ranking: service.managementDrivers(req.query).ranking })));
  router.get("/gestao/passageiros", (req, res) => res.json(ok(service.managementPassengers(req.query))));
  router.get("/gestao/absenteismo", (req, res) => res.json(ok({ absenteismo: service.managementDashboard(req.query).absenteismo })));
  router.get("/gestao/custos", (req, res) => res.json(ok(service.managementCosts(req.query))));
  router.get("/gestao/combustivel", (req, res) => res.json(ok({ combustivel: service.managementCosts(req.query).combustivel })));
  router.get("/gestao/auditoria", (req, res) => res.json(ok(service.managementAudit(req.query))));
  router.get("/gestao/eventos", (req, res) => res.json(ok(service.list("eventos"))));
  router.get("/indicadores/operador", (req, res) => res.json(ok(service.operatorIndicators(req.query))));
  router.get("/indicadores/gestor", (req, res) => res.json(ok(service.managerIndicators(req.query))));
  router.get("/graficos/viagens", (req, res) => res.json(ok(service.chartData("viagens", req.query))));
  router.get("/graficos/custos", (req, res) => res.json(ok(service.chartData("custos", req.query))));
  router.get("/graficos/frota", (req, res) => res.json(ok(service.chartData("frota", req.query))));
  router.get("/graficos/ocorrencias", (req, res) => res.json(ok(service.chartData("ocorrencias", req.query))));
  router.post("/panico", asyncHandler((req, res) => res.status(201).json(ok(service.panicComplete(req.body)))));
  router.get("/emergencias", (req, res) => res.json(ok(service.emergencyList(req.query))));
  router.post("/emergencias/:id/atender", asyncHandler((req, res) => res.json(ok(service.attendEmergency(req.params.id, req.body)))));
  router.post("/emergencias/:id/finalizar", asyncHandler((req, res) => res.json(ok(service.finishEmergency(req.params.id, req.body)))));
  router.post("/giroflex/iniciar", asyncHandler((req, res) => res.status(201).json(ok(service.startGiroflex(req.body)))));
  router.post("/giroflex/finalizar", asyncHandler((req, res) => res.json(ok(service.finishGiroflex(req.body)))));
  router.get("/watchdog", (req, res) => res.json(ok(service.advancedWatchdog(req.query))));
  router.get("/antifraude", (req, res) => res.json(ok(service.antifraudReport(req.query))));
  router.get("/mensagens", (req, res) => res.json(ok(service.operationalMessages(req.query))));
  router.get("/auditoria", (req, res) => res.json(ok(service.auditReport(req.query))));
  router.get("/lgpd", (req, res) => res.json(ok(service.lgpdReport(req.query))));
  router.get("/export/csv", asyncHandler((req, res) => {
    const csv = service.exportCsv(req.query.tipo || "viagens", req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${req.query.tipo || "viagens"}.csv"`);
    res.send(csv);
  }));

  router.post("/driver/login", asyncHandler((req, res) => res.json(ok(service.driverLogin(req.body)))));
  router.get("/driver/trips", (req, res) => res.json(ok(service.driverTrips(req.query))));
  router.get("/driver/notices", (req, res) => res.json(ok(service.driverNotices())));
  router.post("/driver/trips/:id/checklist", asyncHandler((req, res) => res.status(201).json(ok(service.driverChecklist(req.params.id, req.body)))));
  router.post("/driver/trips/:id/km-inicial", asyncHandler((req, res) => res.json(ok(service.driverInitialKm(req.params.id, req.body)))));
  router.post("/driver/trips/:id/flow", asyncHandler((req, res) => res.json(ok(service.driverFlowAction(req.params.id, req.body)))));
  router.post("/driver/trips/:id/finalizar", asyncHandler((req, res) => res.json(ok(service.driverFinalizeTrip(req.params.id, req.body)))));
  router.post("/driver/panic", asyncHandler((req, res) => res.status(201).json(ok(service.driverPanic(req.body)))));
  router.post("/driver/proofs", asyncHandler((req, res) => res.status(201).json(ok(service.driverProof(req.body)))));
  router.post("/driver/events", asyncHandler((req, res) => res.status(201).json(ok(service.addEvent(req.body)))));
  router.get("/driver/events", (req, res) => res.json(ok(service.list("eventos"))));
  router.post("/driver/locations", asyncHandler((req, res) => res.status(201).json(ok(service.addLocation(req.body)))));
  router.get("/driver/locations", (req, res) => res.json(ok(service.list("localizacoes"))));
  router.post("/driver/trips/status", asyncHandler((req, res) => res.status(201).json(ok(service.driverTripStatus(req.body)))));
  router.get("/driver/trips/status", (req, res) => res.json(ok({ viagens: repository.getCollection("viagens").map((trip) => ({ id: trip.id, status: trip.status })) })));
  router.post("/driver/passengers/:id/boarding", asyncHandler((req, res) => res.json(ok({ passageiro: service.passengerAction(req.params.id, "embarque", req.body) }))));
  router.post("/driver/passengers/:id/dropoff", asyncHandler((req, res) => res.json(ok({ passageiro: service.passengerAction(req.params.id, "desembarque", req.body) }))));
  router.post("/driver/passengers/:id/absent", asyncHandler((req, res) => res.json(ok({ passageiro: service.passengerAction(req.params.id, "ausente", req.body) }))));
  router.post("/driver/occurrences", asyncHandler((req, res) => res.status(201).json(ok({ ocorrencia: service.addOccurrence(req.body) }))));
  router.post("/driver/expenses", asyncHandler((req, res) => res.status(201).json(ok({ despesa: service.addExpense(req.body) }))));
  router.post("/driver/sync", asyncHandler((req, res) => res.status(201).json(ok({ syncLog: service.addSyncEvent(req.body) }))));

  router.use(createDriverPairingRoutes({ repository }));

  router.use((req, res) => res.status(404).json({ ok: false, error: "Endpoint nao encontrado." }));

  return router;
}

function registerCollection(router, service, collection, route, itemKey) {
  router.get(route, (req, res) => res.json(ok(service.list(collection))));
  router.post(route, (req, res) => {
    const created = service.create(collection, req.body);
    res.status(201).json(ok({ [itemKey]: created }));
  });
}

function ok(data) {
  return { ok: true, data };
}

function okOr404(data, message) {
  if (!data) throw httpError(404, message);
  return ok(data);
}

function systemHealth(repository) {
  const data = repository.loadData();
  const storage = repository.storageInfo ? repository.storageInfo() : {};
  const gpsQueue = countPending(data.localizacoes);
  const syncQueue = countPending(data.syncLogs) + countPending(data.eventos);
  const latestGps = Array.isArray(data.localizacoes) ? data.localizacoes.slice().sort((a, b) => new Date(a.created_at || a.registrado_em || a.timestamp_dispositivo || 0).getTime() - new Date(b.created_at || b.registrado_em || b.timestamp_dispositivo || 0).getTime()).at(-1) : null;
  const today = new Date().toISOString().slice(0, 10);
  const gpsToday = Array.isArray(data.localizacoes)
    ? data.localizacoes.filter((item) => String(item.created_at || item.registrado_em || item.timestamp_dispositivo || "").slice(0, 10) === today).length
    : 0;
  return {
    status: "ok",
    server_time: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    storage,
    last_gps_received: latestGps ? latestGps.created_at || latestGps.registrado_em || latestGps.timestamp_dispositivo || "" : "",
    gps_today: gpsToday,
    pending_sync_events: syncQueue,
    node_version: process.version,
    gps_queue: gpsQueue,
    sync_queue: syncQueue,
    timestamp: new Date().toISOString()
  };
}

function countPending(items) {
  if (!Array.isArray(items)) return 0;
  return items.filter((item) => {
    const status = String(item.status || item.statusSync || item.sync_status || "").toLowerCase();
    return ["pendente", "pending", "erro", "error", "local"].includes(status);
  }).length;
}

module.exports = createApiRoutes;
