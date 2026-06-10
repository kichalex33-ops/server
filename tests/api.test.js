const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-api-"));
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

test("GET /api/status returns local json storage status", async () => {
  await withServer(async ({ baseUrl }) => {
    const { response, body } = await requestJson(baseUrl, "/api/status");

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.app, "Painel Logistico");
    assert.equal(body.storage, "json");
    assert.ok(body.timestamp);
  });
});

test("POST /api/localizacoes validates and stores external GPS data", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    const { response, body } = await requestJson(baseUrl, "/api/localizacoes", {
      method: "POST",
      body: JSON.stringify({
        viagemId: "VIA-SJS-0001",
        veiculoId: "vei-001",
        motoristaId: "mot-001",
        latitude: -29.5448,
        longitude: -51.4827,
        velocidade: 42
      })
    });

    assert.equal(response.status, 201);
    assert.equal(body.ok, true);
    assert.equal(body.data.viagemId, "VIA-SJS-0001");
    assert.equal(repository.getCollection("localizacoes").length, 2);
  });
});

test("POST /api/localizacoes rejects missing coordinates", async () => {
  await withServer(async ({ baseUrl }) => {
    const { response, body } = await requestJson(baseUrl, "/api/localizacoes", {
      method: "POST",
      body: JSON.stringify({ viagemId: "VIA-SJS-0001" })
    });

    assert.equal(response.status, 400);
    assert.equal(body.ok, false);
    assert.match(body.error, /latitude/i);
  });
});

test("driver compatibility endpoints use the same collections", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    const created = await requestJson(baseUrl, "/api/driver/events", {
      method: "POST",
      body: JSON.stringify({
        viagemId: "VIA-SJS-0001",
        tipo: "GPS",
        descricao: "Localizacao recebida do app motorista"
      })
    });
    const listed = await requestJson(baseUrl, "/api/driver/events");

    assert.equal(created.response.status, 201);
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.data.eventos.length, repository.getCollection("eventos").length);
  });
});
