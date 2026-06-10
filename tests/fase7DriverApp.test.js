const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-fase7-"));
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

test("driver login and daily trips expose vehicle, passengers and notices", async () => {
  await withServer(async ({ baseUrl }) => {
    const login = await requestJson(baseUrl, "/api/driver/login", {
      method: "POST",
      body: { identificador: "mot-001", senha: "OPteste 01", lembrar: true }
    });
    assert.equal(login.response.status, 200);
    assert.equal(login.body.data.motorista.id, "mot-001");
    assert.ok(login.body.data.sessao.token);

    const trips = await requestJson(baseUrl, "/api/driver/trips?motorista_id=mot-001");
    assert.equal(trips.response.status, 200);
    assert.ok(trips.body.data.viagens[0].passageiros.length >= 4);
    assert.equal(trips.body.data.viagens[0].veiculo.id, "vei-001");

    const notices = await requestJson(baseUrl, "/api/driver/notices");
    assert.equal(notices.response.status, 200);
    assert.ok(Array.isArray(notices.body.data.avisos));
  });
});

test("driver operational flow validates checklist, km, panic and proof metadata", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    const tripId = "VIA-SJS-0001";
    const checklistMissing = await requestJson(baseUrl, `/api/driver/trips/${tripId}/checklist`, {
      method: "POST",
      body: { motorista_id: "mot-001", documentacao: true }
    });
    assert.equal(checklistMissing.response.status, 400);

    const checklist = await requestJson(baseUrl, `/api/driver/trips/${tripId}/checklist`, {
      method: "POST",
      body: {
        motorista_id: "mot-001",
        documentacao: true,
        pneus: true,
        combustivel: true,
        iluminacao: true,
        freios: true,
        limpeza: true,
        observacoes: "Veiculo liberado"
      }
    });
    assert.equal(checklist.response.status, 201);
    assert.equal(checklist.body.data.checklist.status, "APROVADO");

    const emptyKm = await requestJson(baseUrl, `/api/driver/trips/${tripId}/km-inicial`, {
      method: "POST",
      body: { motorista_id: "mot-001" }
    });
    assert.equal(emptyKm.response.status, 400);

    const kmInicial = await requestJson(baseUrl, `/api/driver/trips/${tripId}/km-inicial`, {
      method: "POST",
      body: { motorista_id: "mot-001", km_saida: 1000, latitude: -29.5448, longitude: -51.4827 }
    });
    assert.equal(kmInicial.response.status, 200);
    assert.equal(kmInicial.body.data.viagem.km_saida, 1000);

    for (const action of ["confirmar-saida", "iniciar-espera", "iniciar-retorno"]) {
      const step = await requestJson(baseUrl, `/api/driver/trips/${tripId}/flow`, {
        method: "POST",
        body: { action, motorista_id: "mot-001" }
      });
      assert.equal(step.response.status, 200);
    }

    const badFinal = await requestJson(baseUrl, `/api/driver/trips/${tripId}/finalizar`, {
      method: "POST",
      body: { motorista_id: "mot-001", km_final: 999 }
    });
    assert.equal(badFinal.response.status, 400);

    const final = await requestJson(baseUrl, `/api/driver/trips/${tripId}/finalizar`, {
      method: "POST",
      body: { motorista_id: "mot-001", km_final: 1048, resumo: "Piloto concluido" }
    });
    assert.equal(final.response.status, 200);
    assert.equal(final.body.data.viagem.status, "CONCLUIDA");

    const panic = await requestJson(baseUrl, "/api/driver/panic", {
      method: "POST",
      body: { viagem_id: tripId, motorista_id: "mot-001", latitude: -29.5449, longitude: -51.4828 }
    });
    assert.equal(panic.response.status, 201);
    assert.equal(panic.body.data.mensagem, "Central sera notificada assim que houver conexao.");

    const proof = await requestJson(baseUrl, "/api/driver/proofs", {
      method: "POST",
      body: { viagem_id: tripId, passageiro_id: "pas-001", arquivo_nome: "consulta.jpg", tipo: "foto" }
    });
    assert.equal(proof.response.status, 201);
    assert.equal(proof.body.data.comprovante.passageiro_id, "pas-001");

    const data = repository.loadData();
    assert.ok(data.ocorrencias.some((item) => item.tipo === "PANICO"));
    assert.ok(data.comprovantes.some((item) => item.arquivo_nome === "consulta.jpg"));
  });
});
