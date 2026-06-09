const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");
const { analyzeOperationalHealth } = require("../src/services/watchdogService");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-fase-c-"));
  const repository = createRepository({
    dataFile: path.join(tempDir, "painel-logistico.json"),
    backupDir: path.join(tempDir, "backups")
  });
  repository.ensureDataFile();
  const app = createApp({ repository });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await callback({ baseUrl, repository, tempDir });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/system/health exposes phase C server, GPS and sync fields", async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/system/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.match(body.server_time, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(typeof body.uptime, "number");
    assert.equal(typeof body.memory, "object");
    assert.equal(typeof body.storage, "object");
    assert.equal(typeof body.last_gps_received, "string");
    assert.equal(typeof body.pending_sync_events, "number");
  });
});

test("system health and sync pages are served", async () => {
  await withServer(async ({ baseUrl }) => {
    const healthPage = await fetch(`${baseUrl}/sistema/saude`);
    const syncPage = await fetch(`${baseUrl}/operador/sincronizacao`);
    const healthHtml = await healthPage.text();
    const syncHtml = await syncPage.text();

    assert.equal(healthPage.status, 200);
    assert.match(healthHtml, /Saúde do Sistema/);
    assert.match(healthHtml, /\/api\/system\/health/);
    assert.equal(syncPage.status, 200);
    assert.match(syncHtml, /Sincronização Operacional/);
    assert.match(syncHtml, /\/api\/sync\/painel/);
  });
});

test("sync panel reports pending and error events and can retry errors", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    repository.addItem("syncLogs", { tipo: "GPS", status: "PENDENTE", viagem_id: "VIA-SJS-0001" });
    repository.addItem("syncLogs", { tipo: "CHECKLIST", status: "ERRO", viagem_id: "VIA-SJS-0001", erro: "offline" });

    const panelResponse = await fetch(`${baseUrl}/api/sync/painel`);
    const panel = await panelResponse.json();
    assert.equal(panel.data.pendentes, 1);
    assert.equal(panel.data.erros, 1);
    assert.equal(panel.data.eventosErro.length, 1);

    const retryResponse = await fetch(`${baseUrl}/api/sync/reenvio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const retry = await retryResponse.json();
    assert.equal(retry.data.reenfileirados, 1);

    const afterResponse = await fetch(`${baseUrl}/api/sync/painel`);
    const after = await afterResponse.json();
    assert.equal(after.data.erros, 0);
    assert.equal(after.data.pendentes, 2);
  });
});

test("watchdog service detects stale GPS and growing sync queue", () => {
  const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const data = {
    viagens: [{ id: "VIA-1", status: "EM_TRANSITO_IDA", motorista_id: "mot-1", veiculo_id: "vei-1", updated_at: old }],
    motoristas: [{ id: "mot-1", status: "ativo" }],
    localizacoes: [{ viagem_id: "VIA-1", motorista_id: "mot-1", created_at: old, velocidade: 0 }],
    syncLogs: Array.from({ length: 30 }, (_, index) => ({ id: `syn-${index}`, status: "PENDENTE" }))
  };

  const result = analyzeOperationalHealth(data, { syncQueueLimit: 10 });
  assert.equal(result.status, "atencao");
  assert.ok(result.alertas.some((item) => item.tipo === "GPS_PARADO"));
  assert.ok(result.alertas.some((item) => item.tipo === "FILA_SYNC_CRESCENDO"));
});

test("security middleware adds headers and rate limit metadata", async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/status`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-dns-prefetch-control"), "off");
    assert.ok(response.headers.get("ratelimit-limit"));
  });
});

test("backup script supports daily backup copy", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "scripts", "backup.js"), "utf8");
  assert.match(source, /diario/);
  assert.match(source, /semanal/);
  assert.match(source, /copyFileSync/);
});
