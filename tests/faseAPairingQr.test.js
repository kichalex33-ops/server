const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-fase-a-"));
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

test("driver pairing creates a temporary QR payload without exposing token hash", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    const created = await requestJson(baseUrl, "/api/operator/drivers/mot-001/pairing", {
      method: "POST",
      body: { server_url: "http://10.0.0.4:3000" }
    });

    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.qrPayload.type, "PAINEL_LOGISTICO_DRIVER_PAIRING");
    assert.equal(created.body.data.qrPayload.server_url, "http://10.0.0.4:3000");
    assert.equal(created.body.data.qrPayload.api, "http://10.0.0.4:3000");
    assert.ok(created.body.data.qrPayload.token);
    assert.ok(created.body.data.qrPayload.pairing_token);
    assert.equal(created.body.data.qrPayload.token, created.body.data.qrPayload.pairing_token);
    assert.equal(created.body.data.qrPayload.pairing_token_hash, undefined);

    const data = repository.loadData();
    assert.equal(data.driverPairings.length, 1);
    assert.equal(data.driverPairings[0].motorista_id, "mot-001");
    assert.equal(data.driverPairings[0].status, "PENDENTE");
    assert.ok(data.driverPairings[0].pairing_token_hash);
    assert.notEqual(data.driverPairings[0].pairing_token_hash, created.body.data.qrPayload.pairing_token);
    assert.ok(data.auditLogs.some((log) => log.evento === "DRIVER_APP_PAIRING_CREATED"));
  });
});

test("driver pairing accepts Flutter QR scanner payload and returns app session data", async () => {
  const previousToken = process.env.API_TOKEN;
  process.env.API_TOKEN = "teste-api-token";
  try {
    await withServer(async ({ baseUrl, repository }) => {
      const created = await requestJson(baseUrl, "/api/operator/drivers/mot-001/pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-token": "teste-api-token" },
        body: { server_url: "http://10.0.0.4:3000" }
      });
      const qrPayload = created.body.data.qrPayload;

      const confirmed = await requestJson(baseUrl, "/api/driver/pairing/confirm", {
        method: "POST",
        body: {
          pairing_id: qrPayload.pairing_id,
          token: qrPayload.token,
          platform: "android"
        }
      });

      assert.equal(confirmed.response.status, 200);
      assert.equal(confirmed.body.ok, true);
      assert.equal(confirmed.body.data.paired, true);
      assert.equal(confirmed.body.data.login, "mot-001");
      assert.equal(confirmed.body.data.senha_inicial, "OPteste 01");
      assert.equal(confirmed.body.data.temporary_password, "OPteste 01");
      assert.equal(confirmed.body.data.server_url, "http://10.0.0.4:3000");
      assert.equal(confirmed.body.data.motorista.id, "mot-001");
      assert.equal(confirmed.body.data.motorista.perfil, "motorista");
      assert.deepEqual(confirmed.body.data.motorista.modulos_permitidos, ["logistica"]);
      assert.ok(confirmed.body.data.token);
      assert.ok(confirmed.body.data.refresh_token);

      const data = repository.loadData();
      assert.equal(data.driverDevices[0].platform, "android");
      assert.equal(data.motoristas[0].app_login, "mot-001");
      assert.equal(data.motoristas[0].senha_inicial_app, "OPteste 01");
    });
  } finally {
    if (previousToken === undefined) {
      delete process.env.API_TOKEN;
    } else {
      process.env.API_TOKEN = previousToken;
    }
  }
});

test("driver pairing confirm saves device and blocks token reuse", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    const created = await requestJson(baseUrl, "/api/operator/drivers/mot-001/pairing", {
      method: "POST",
      body: { server_url: "http://10.0.0.4:3000" }
    });
    const qrPayload = created.body.data.qrPayload;

    const confirmed = await requestJson(baseUrl, "/api/driver/pairing/confirm", {
      method: "POST",
      body: {
        pairing_id: qrPayload.pairing_id,
        pairing_token: qrPayload.pairing_token,
        device: {
          device_id: "teste-device-001",
          device_name: "Celular Teste",
          platform: "android",
          app_version: "1.0.0"
        }
      }
    });

    assert.equal(confirmed.response.status, 200);
    assert.equal(confirmed.body.ok, true);
    assert.equal(confirmed.body.message, "Dispositivo pareado com sucesso");
    assert.equal(confirmed.body.motorista.id, "mot-001");
    assert.equal(confirmed.body.device.id, "teste-device-001");
    assert.equal(confirmed.body.api.base_url, "http://10.0.0.4:3000");

    const duplicate = await requestJson(baseUrl, "/api/driver/pairing/confirm", {
      method: "POST",
      body: {
        pairing_id: qrPayload.pairing_id,
        pairing_token: qrPayload.pairing_token,
        device: { device_id: "teste-device-002" }
      }
    });
    assert.equal(duplicate.response.status, 409);

    const data = repository.loadData();
    assert.equal(data.driverDevices.length, 1);
    assert.equal(data.driverDevices[0].motorista_id, "mot-001");
    assert.equal(data.driverPairings[0].status, "CONFIRMADO");
    assert.ok(data.auditLogs.some((log) => log.evento === "DRIVER_APP_PAIRING_CONFIRMED"));
  });
});

test("driver pairing cancellation and expiration block confirmation", async () => {
  await withServer(async ({ baseUrl, repository }) => {
    const created = await requestJson(baseUrl, "/api/operator/drivers/mot-001/pairing", {
      method: "POST",
      body: { server_url: "http://10.0.0.4:3000" }
    });
    const qrPayload = created.body.data.qrPayload;

    const cancelled = await requestJson(baseUrl, `/api/operator/pairings/${qrPayload.pairing_id}/cancel`, {
      method: "POST"
    });
    assert.equal(cancelled.response.status, 200);
    assert.equal(cancelled.body.data.status, "CANCELADO");

    const blocked = await requestJson(baseUrl, "/api/driver/pairing/confirm", {
      method: "POST",
      body: {
        pairing_id: qrPayload.pairing_id,
        pairing_token: qrPayload.pairing_token,
        device: { device_id: "teste-device-003" }
      }
    });
    assert.equal(blocked.response.status, 409);

    const expiredCreated = await requestJson(baseUrl, "/api/operator/drivers/mot-001/pairing", {
      method: "POST",
      body: { server_url: "http://10.0.0.4:3000" }
    });
    const expiredPayload = expiredCreated.body.data.qrPayload;
    const data = repository.loadData();
    data.driverPairings = data.driverPairings.map((pairing) => pairing.id === expiredPayload.pairing_id
      ? { ...pairing, expires_at: new Date(Date.now() - 60_000).toISOString() }
      : pairing);
    repository.saveData(data);

    const expired = await requestJson(baseUrl, "/api/driver/pairing/confirm", {
      method: "POST",
      body: {
        pairing_id: expiredPayload.pairing_id,
        pairing_token: expiredPayload.pairing_token,
        device: { device_id: "teste-device-004" }
      }
    });
    assert.equal(expired.response.status, 410);

    const finalData = repository.loadData();
    assert.ok(finalData.auditLogs.some((log) => log.evento === "DRIVER_APP_PAIRING_CANCELLED"));
    assert.ok(finalData.auditLogs.some((log) => log.evento === "DRIVER_APP_PAIRING_EXPIRED"));
  });
});
