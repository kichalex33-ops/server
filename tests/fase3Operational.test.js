const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-fase3-"));
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
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  return { response, body };
}

test("operational trip state endpoints validate transitions and write event and sync log", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    const prep = await requestJson(baseUrl, "/api/viagens/VIA-SJS-0001/iniciar-preparacao", {
      method: "POST",
      body: JSON.stringify({ observacoes: "Preparacao iniciada" })
    });
    assert.equal(prep.response.status, 200);
    assert.equal(prep.body.data.viagem.status, "PREPARACAO");
    assert.equal(prep.body.data.viagem.motorista_id, "mot-001");
    assert.equal(prep.body.data.viagem.veiculo_id, "vei-001");

    const saida = await requestJson(baseUrl, "/api/viagens/VIA-SJS-0001/confirmar-saida", {
      method: "POST",
      body: JSON.stringify({ km_saida: 1020, motorista_id: "mot-001" })
    });
    assert.equal(saida.response.status, 200);
    assert.equal(saida.body.data.viagem.status, "SAIDA_CONFIRMADA");
    assert.equal(saida.body.data.viagem.km_saida, 1020);

    const invalid = await requestJson(baseUrl, "/api/viagens/VIA-SJS-0001/iniciar-preparacao", {
      method: "POST",
      body: JSON.stringify({})
    });
    assert.equal(invalid.response.status, 400);
    assert.match(invalid.body.error, /Transicao invalida/i);

    assert.ok(repository.getCollection("eventos").some((event) => event.tipo === "VIAGEM_STATUS" && event.status === "SAIDA_CONFIRMADA"));
    assert.ok(repository.getCollection("syncLogs").some((log) => log.tipo === "VIAGEM_STATUS" && log.status === "PENDENTE"));
  });
});

test("passenger boarding, absence and dropoff update passenger and timeline", async () => {
  await withServer(async ({ baseUrl }) => {
    const embarque = await requestJson(baseUrl, "/api/passageiros/pas-001/embarque", {
      method: "POST",
      body: JSON.stringify({ motorista_id: "mot-001", observacoes_embarque: "Embarcou na UBS" })
    });
    assert.equal(embarque.response.status, 200);
    assert.equal(embarque.body.data.passageiro.status, "EMBARCADO");
    assert.equal(embarque.body.data.passageiro.possuiNecessidadeEspecial, false);

    const ausencia = await requestJson(baseUrl, "/api/passageiros/pas-003/ausente", {
      method: "POST",
      body: JSON.stringify({ motorista_id: "mot-001", observacoes: "Nao compareceu" })
    });
    assert.equal(ausencia.response.status, 200);
    assert.equal(ausencia.body.data.passageiro.status, "AUSENTE");

    const desembarque = await requestJson(baseUrl, "/api/passageiros/pas-001/desembarque", {
      method: "POST",
      body: JSON.stringify({ motorista_id: "mot-001" })
    });
    assert.equal(desembarque.response.status, 200);
    assert.equal(desembarque.body.data.passageiro.status, "DESEMBARCADO");

    const timeline = await requestJson(baseUrl, "/api/viagens/VIA-SJS-0001/timeline");
    assert.equal(timeline.response.status, 200);
    assert.ok(timeline.body.data.timeline.some((item) => item.tipo === "PASSAGEIRO_EMBARCADO"));
    assert.ok(timeline.body.data.timeline.some((item) => item.tipo === "PASSAGEIRO_AUSENTE"));
  });
});

test("occurrences, expenses, sync and prolonged waiting monitor are operational", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    const occurrence = await requestJson(baseUrl, "/api/ocorrencias", {
      method: "POST",
      body: JSON.stringify({
        viagem_id: "VIA-SJS-0001",
        motorista_id: "mot-001",
        veiculo_id: "vei-001",
        tipo: "ATRASO",
        descricao: "Atraso no embarque",
        severidade: "MEDIA"
      })
    });
    assert.equal(occurrence.response.status, 201);
    assert.equal(occurrence.body.data.ocorrencia.status, "ABERTA");

    const resolved = await requestJson(baseUrl, `/api/ocorrencias/${occurrence.body.data.ocorrencia.id}/resolver`, {
      method: "PUT",
      body: JSON.stringify({})
    });
    assert.equal(resolved.response.status, 200);
    assert.equal(resolved.body.data.ocorrencia.status, "RESOLVIDA");

    const expense = await requestJson(baseUrl, "/api/despesas", {
      method: "POST",
      body: JSON.stringify({
        viagem_id: "VIA-SJS-0001",
        motorista_id: "mot-001",
        veiculo_id: "vei-001",
        tipo: "ABASTECIMENTO",
        local: "Posto local",
        litros: 20,
        valor: 120
      })
    });
    assert.equal(expense.response.status, 201);
    assert.equal(expense.body.data.despesa.valor_litro, 6);

    repository.updateItem("viagens", "VIA-SJS-0001", {
      status: "EM_ESPERA",
      espera_iniciada_em: new Date(Date.now() - 31 * 60 * 1000).toISOString()
    });
    const sync = await requestJson(baseUrl, "/api/sync/forcar", { method: "POST", body: JSON.stringify({}) });
    assert.equal(sync.response.status, 200);
    assert.ok(sync.body.data.alertasGerados >= 1);

    const status = await requestJson(baseUrl, "/api/sync/status");
    assert.equal(status.response.status, 200);
    assert.ok(status.body.data.pendentes >= 1);
    assert.ok(status.body.data.ultimaSincronizacao);
  });
});

test("driver compatibility endpoints operate over the same passengers, occurrences, expenses and sync collections", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    const boarding = await requestJson(baseUrl, "/api/driver/passengers/pas-002/boarding", {
      method: "POST",
      body: JSON.stringify({ motorista_id: "mot-001" })
    });
    const occurrence = await requestJson(baseUrl, "/api/driver/occurrences", {
      method: "POST",
      body: JSON.stringify({ viagem_id: "VIA-SJS-0001", tipo: "OUTRO", descricao: "Teste driver" })
    });
    const expense = await requestJson(baseUrl, "/api/driver/expenses", {
      method: "POST",
      body: JSON.stringify({ viagem_id: "VIA-SJS-0001", tipo: "PEDAGIO", valor: 12 })
    });
    const sync = await requestJson(baseUrl, "/api/driver/sync", {
      method: "POST",
      body: JSON.stringify({ viagem_id: "VIA-SJS-0001", tipo: "FILA_APP", payload: { offline: true } })
    });

    assert.equal(boarding.response.status, 200);
    assert.equal(occurrence.response.status, 201);
    assert.equal(expense.response.status, 201);
    assert.equal(sync.response.status, 201);
    assert.equal(repository.findById("passageiros", "pas-002").status, "EMBARCADO");
    assert.ok(repository.getCollection("syncLogs").some((item) => item.tipo === "FILA_APP"));
  });
});
