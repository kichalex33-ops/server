const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-fase8-"));
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
    await callback({ baseUrl, repository });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function requestJson(baseUrl, pathName, options = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  });
  const body = await response.json();
  return { response, body };
}

test("panic creates critical emergency, alert, audit, insurance and assistance preparation", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    const panic = await requestJson(baseUrl, "/api/panico", {
      method: "POST",
      body: {
        tipo: "ACIDENTE",
        viagem_id: "VIA-SJS-0001",
        motorista_id: "mot-001",
        veiculo_id: "vei-001",
        latitude: -29.5449,
        longitude: -51.4828,
        observacoes: "Colisao leve na rota"
      }
    });

    assert.equal(panic.response.status, 201);
    assert.equal(panic.body.data.emergencia.tipo, "ACIDENTE");
    assert.equal(panic.body.data.emergencia.status, "ABERTA");
    assert.equal(panic.body.data.alerta.severidade, "CRITICA");

    const data = repository.loadData();
    assert.equal(data.emergencias.length, 1);
    assert.equal(data.insurance_events.length, 1);
    assert.equal(data.assistance_events.length, 1);
    assert.ok(data.auditLogs.some((item) => item.tipo === "PANICO"));
  });
});

test("emergency central page and response protocol endpoints work", async () => {
  await withServer(async ({ baseUrl }) => {
    const page = await fetch(`${baseUrl}/painel-logistico/emergencias`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Central de Emergencia/);

    const panic = await requestJson(baseUrl, "/api/panico", {
      method: "POST",
      body: { tipo: "PANE_MECANICA", viagem_id: "VIA-SJS-0001", motorista_id: "mot-001", veiculo_id: "vei-001" }
    });
    const id = panic.body.data.emergencia.id;

    const list = await requestJson(baseUrl, "/api/emergencias");
    assert.equal(list.response.status, 200);
    assert.equal(list.body.data.emergencias.length, 1);

    const attend = await requestJson(baseUrl, `/api/emergencias/${id}/atender`, {
      method: "POST",
      body: { responsavel: "Operador", acao: "motorista_contatado", observacoes: "Motorista em seguranca" }
    });
    assert.equal(attend.response.status, 200);
    assert.equal(attend.body.data.emergencia.status, "EM_ATENDIMENTO");
    assert.equal(attend.body.data.emergencia.protocolo.length, 1);

    const finish = await requestJson(baseUrl, `/api/emergencias/${id}/finalizar`, {
      method: "POST",
      body: { responsavel: "Operador", observacoes: "Ocorrencia resolvida" }
    });
    assert.equal(finish.response.status, 200);
    assert.equal(finish.body.data.emergencia.status, "FINALIZADA");
  });
});

test("giroflex, watchdog, antifraud, messages, audit and LGPD reports are exposed", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    await requestJson(baseUrl, "/api/giroflex/iniciar", {
      method: "POST",
      body: { viagem_id: "VIA-SJS-0001", motorista_id: "mot-001", veiculo_id: "vei-001" }
    });
    const giroStop = await requestJson(baseUrl, "/api/giroflex/finalizar", {
      method: "POST",
      body: { viagem_id: "VIA-SJS-0001", distancia_km: 12, velocidade_media: 48 }
    });
    assert.equal(giroStop.response.status, 200);
    assert.equal(giroStop.body.data.giroflex.status, "FINALIZADO");

    const trip = repository.findById("viagens", "VIA-SJS-0001");
    repository.updateItem("viagens", trip.id, { status: "EM_ESPERA", espera_iniciada_em: new Date(Date.now() - 45 * 60 * 1000).toISOString(), km_saida: 1000, km_retorno: 1100 });
    repository.addItem("localizacoes", { viagem_id: trip.id, viagemId: trip.id, latitude: -29.5448, longitude: -51.4827, velocidade: 0, created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() });
    repository.addItem("localizacoes", { viagem_id: trip.id, viagemId: trip.id, latitude: -29.545, longitude: -51.483, velocidade: 95, created_at: new Date().toISOString() });

    const watchdog = await requestJson(baseUrl, "/api/watchdog");
    assert.equal(watchdog.response.status, 200);
    assert.ok(Array.isArray(watchdog.body.data.alertas));

    const antifraud = await requestJson(baseUrl, "/api/antifraude");
    assert.equal(antifraud.response.status, 200);
    assert.ok(["APROVADO", "PENDENTE_REVISAO", "REJEITADO"].includes(antifraud.body.data.itens[0].status));

    const message = await requestJson(baseUrl, "/api/mensagens", {
      method: "POST",
      body: { origem: "operador", destino: "motorista", tipo: "Emergencia", mensagem: "Retorne contato", motorista_id: "mot-001" }
    });
    assert.equal(message.response.status, 201);
    const messages = await requestJson(baseUrl, "/api/mensagens");
    assert.equal(messages.body.data.mensagens[0].tipo, "EMERGENCIA");

    const audit = await requestJson(baseUrl, "/api/auditoria");
    assert.equal(audit.response.status, 200);
    assert.ok(audit.body.data.auditLogs.length >= 1);

    const lgpd = await requestJson(baseUrl, "/api/lgpd?mascarar=true");
    assert.equal(lgpd.response.status, 200);
    assert.equal(lgpd.body.data.mascaramentoAtivo, true);
  });
});
