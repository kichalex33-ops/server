const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-driver-registration-"));
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

test("operator can create and edit drivers through motoristas API", async () => {
  await withServer(async ({ baseUrl }) => {
    const invalid = await requestJson(baseUrl, "/api/motoristas", {
      method: "POST",
      body: JSON.stringify({ nome: "", telefone: "", status: "ativo" })
    });
    assert.equal(invalid.response.status, 400);
    assert.match(invalid.body.error, /nome/i);

    const created = await requestJson(baseUrl, "/api/motoristas", {
      method: "POST",
      body: JSON.stringify({
        nome: "Alex Teste",
        cpf: "00000000000",
        telefone: "(51) 99999-0000",
        cnh: "123456789",
        categoria_cnh: "D",
        validade_cnh: "2027-12-31",
        status: "ativo",
        observacoes: "Motorista de homologacao"
      })
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.motorista.nome, "Alex Teste");
    assert.equal(created.body.data.motorista.categoria_cnh, "D");

    const id = created.body.data.motorista.id;
    const updated = await requestJson(baseUrl, `/api/motoristas/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        nome: "Alex Teste Atualizado",
        cpf: "00000000000",
        telefone: "(51) 98888-0000",
        cnh: "123456789",
        categoria_cnh: "E",
        validade_cnh: "2028-01-15",
        status: "ativo",
        observacoes: "Atualizado pelo operador"
      })
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.data.motorista.nome, "Alex Teste Atualizado");
    assert.equal(updated.body.data.motorista.categoria_cnh, "E");

    const listed = await requestJson(baseUrl, "/api/motoristas");
    const driver = listed.body.data.motoristas.find((item) => item.id === id);
    assert.equal(listed.response.status, 200);
    assert.equal(driver.telefone, "(51) 98888-0000");
    assert.equal(driver.app_pareado, false);
  });
});

test("driver list exposes app pairing status after QR confirmation", async () => {
  await withServer(async ({ baseUrl }) => {
    const created = await requestJson(baseUrl, "/api/motoristas", {
      method: "POST",
      body: JSON.stringify({ nome: "Barbara Motorista", telefone: "(51) 97777-0000", status: "ativo" })
    });
    const driverId = created.body.data.motorista.id;
    const pairing = await requestJson(baseUrl, `/api/operator/drivers/${driverId}/pairing`, {
      method: "POST",
      body: JSON.stringify({ server_url: baseUrl })
    });
    const qrPayload = pairing.body.data.qrPayload;
    const confirmed = await requestJson(baseUrl, "/api/driver/pairing/confirm", {
      method: "POST",
      body: JSON.stringify({
        pairing_id: qrPayload.pairing_id,
        pairing_token: qrPayload.pairing_token,
        device: {
          device_id: "device-barbara",
          platform: "android"
        }
      })
    });
    assert.equal(confirmed.response.status, 200);

    const listed = await requestJson(baseUrl, "/api/motoristas");
    const driver = listed.body.data.motoristas.find((item) => item.id === driverId);
    assert.equal(driver.app_pareado, true);
    assert.equal(driver.dispositivo_app.device_id, "device-barbara");
  });
});

test("operator page contains driver registration modal and edit action hooks", async () => {
  await withServer(async ({ baseUrl }) => {
    const page = await fetch(`${baseUrl}/painel-logistico/operador`);
    const html = await page.text();
    const js = fs.readFileSync(path.join(__dirname, "..", "public", "assets", "js", "driver-pairing.js"), "utf8");

    assert.equal(page.status, 200);
    assert.match(html, /Novo Motorista/);
    assert.match(html, /driverFormModal/);
    assert.match(html, /Categoria CNH/);
    assert.match(html, /App pareado/);
    assert.match(js, /data-edit-driver-id/);
    assert.match(js, /PUT/);
    assert.match(js, /Gerar QR do App/);
  });
});
