const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-fase4-"));
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

test("POST /api/gps receives real GPS, stores history, writes event and exposes live map", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    const gps = await requestJson(baseUrl, "/api/gps", {
      method: "POST",
      body: JSON.stringify({
        viagem_id: "VIA-SJS-0001",
        motorista_id: "mot-001",
        veiculo_id: "vei-001",
        latitude: -29.561,
        longitude: -51.501,
        velocidade: 92,
        precisao: 8,
        bateria: 77,
        status_viagem: "EM_TRANSITO_IDA",
        timestamp_dispositivo: "2026-06-03T12:00:00.000Z"
      })
    });

    assert.equal(gps.response.status, 201);
    assert.equal(gps.body.success, true);
    assert.equal(gps.body.message, "GPS recebido com sucesso");
    assert.equal(gps.body.data.viagem_id, "VIA-SJS-0001");
    assert.equal(gps.body.data.motorista_id, "mot-001");
    assert.equal(gps.body.data.veiculo_id, "vei-001");
    assert.equal(repository.getCollection("localizacoes").length, 2);
    assert.ok(repository.getCollection("eventos").some((event) => event.tipo === "GPS_RECEBIDO"));
    assert.ok(repository.getCollection("syncLogs").some((log) => log.tipo === "GPS_RECEBIDO"));
    assert.ok(repository.getCollection("alertas").some((alert) => alert.tipo === "VELOCIDADE_ACIMA_LIMITE"));

    const live = await requestJson(baseUrl, "/api/live-map");

    assert.equal(live.response.status, 200);
    assert.equal(live.body.data.veiculos[0].veiculo_id, "vei-001");
    assert.equal(live.body.data.veiculos[0].placa, "LOG-2045");
    assert.equal(live.body.data.veiculos[0].prefixo, "SMS-01");
    assert.equal(live.body.data.veiculos[0].motorista, "Joao Santos");
    assert.equal(live.body.data.veiculos[0].telefone, "(00) 90000-0000");
    assert.equal(live.body.data.veiculos[0].viagem_id, "VIA-SJS-0001");
    assert.equal(live.body.data.veiculos[0].status_viagem, "EM_TRANSITO_IDA");
    assert.equal(live.body.data.veiculos[0].latitude, -29.561);
    assert.equal(live.body.data.veiculos[0].longitude, -51.501);
    assert.equal(live.body.data.veiculos[0].velocidade, 92);
    assert.equal(live.body.data.veiculos[0].origem, "UBS Sao Jose do Sul");
    assert.equal(live.body.data.veiculos[0].destino, "Hospital Montenegro");
    assert.equal(live.body.data.veiculos[0].passageiros, 4);
    assert.equal(live.body.data.veiculos[0].alerta_ativo, true);
    assert.equal(live.body.data.veiculos[0].tipo_alerta, "VELOCIDADE_ACIMA_LIMITE");
    assert.equal(live.body.data.veiculos[0].cor_status, "LARANJA");
    assert.equal(live.body.data.indicadores.veiculosEmRota, 1);
  });
});

test("POST /api/gps validates coordinates and existing trip", async () => {
  await withServer(async ({ baseUrl }) => {
    const invalidCoordinates = await requestJson(baseUrl, "/api/gps", {
      method: "POST",
      body: JSON.stringify({ viagem_id: "VIA-SJS-0001", latitude: -120, longitude: -51.5 })
    });
    assert.equal(invalidCoordinates.response.status, 400);
    assert.match(invalidCoordinates.body.error, /latitude/i);

    const missingTrip = await requestJson(baseUrl, "/api/gps", {
      method: "POST",
      body: JSON.stringify({ viagem_id: "VIA-INEXISTENTE", latitude: -29.561, longitude: -51.501 })
    });
    assert.equal(missingTrip.response.status, 404);
    assert.match(missingTrip.body.error, /Viagem nao encontrada/i);
  });
});

test("GET /api/viagens/:id/trajeto returns ordered GPS history", async () => {
  await withServer(async ({ baseUrl }) => {
    await requestJson(baseUrl, "/api/gps", {
      method: "POST",
      body: JSON.stringify({
        viagem_id: "VIA-SJS-0001",
        latitude: -29.55,
        longitude: -51.49,
        velocidade: 35,
        timestamp_dispositivo: "2026-06-03T11:00:00.000Z"
      })
    });
    await requestJson(baseUrl, "/api/gps", {
      method: "POST",
      body: JSON.stringify({
        viagem_id: "VIA-SJS-0001",
        latitude: -29.56,
        longitude: -51.5,
        velocidade: 44,
        timestamp_dispositivo: "2026-06-03T11:05:00.000Z"
      })
    });

    const route = await requestJson(baseUrl, "/api/viagens/VIA-SJS-0001/trajeto");

    assert.equal(route.response.status, 200);
    assert.equal(route.body.data.viagem_id, "VIA-SJS-0001");
    assert.ok(route.body.data.trajeto.length >= 3);
    assert.deepEqual(route.body.data.trajeto.at(-1), {
      latitude: -29.56,
      longitude: -51.5,
      velocidade: 44,
      timestamp_dispositivo: "2026-06-03T11:05:00.000Z"
    });
  });
});

test("GET /painel-logistico/sala-situacao serves the operational map page", async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/painel-logistico/sala-situacao`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Sala de Situacao/);
    assert.match(html, /leaflet/);
    assert.match(html, /sala-situacao\.js/);
  });
});
