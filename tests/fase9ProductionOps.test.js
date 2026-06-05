const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-fase9-"));
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

async function requestJson(baseUrl, pathName, options = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  });
  const body = await response.json();
  return { response, body };
}

test(".env.example exposes production variables and .env remains ignored", () => {
  const envExample = fs.readFileSync(path.join(__dirname, "..", ".env.example"), "utf8");
  for (const key of ["PORT", "NODE_ENV", "API_TOKEN", "CORS_ORIGIN", "APP_URL", "PUBLIC_URL", "BACKUP_DIR", "LOG_LEVEL"]) {
    assert.match(envExample, new RegExp(`^${key}=`, "m"));
  }

  const gitignore = fs.readFileSync(path.join(__dirname, "..", ".gitignore"), "utf8");
  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^data\/backups\//m);
});

test("production infra page and API expose server, storage and operational counters", async () => {
  await withServer(async ({ baseUrl }) => {
    const page = await fetch(`${baseUrl}/painel-logistico/admin/infra`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Infraestrutura/);

    const status = await requestJson(baseUrl, "/api/infra/status");
    assert.equal(status.response.status, 200);
    assert.equal(status.body.data.servidor.app, "Painel Logistico");
    assert.equal(typeof status.body.data.servidor.uptimeSegundos, "number");
    assert.equal(typeof status.body.data.storage.dataSizeBytes, "number");
    assert.equal(typeof status.body.data.indicadores.gpsRecebidos, "number");
    assert.equal(typeof status.body.data.indicadores.alertasAbertos, "number");
    assert.equal(typeof status.body.data.indicadores.sincronizacoesPendentes, "number");
  });
});

test("manual production backup can be created and listed", async () => {
  await withServer(async ({ baseUrl, tempDir }) => {
    const backup = await requestJson(baseUrl, "/api/infra/backup", {
      method: "POST",
      body: { reason: "teste-producao" }
    });

    assert.equal(backup.response.status, 201);
    assert.match(backup.body.data.backup.file, /teste-producao\.json$/);
    assert.ok(fs.existsSync(path.join(tempDir, "backups", backup.body.data.backup.file)));

    const list = await requestJson(baseUrl, "/api/infra/backups");
    assert.equal(list.response.status, 200);
    assert.ok(list.body.data.backups.some((item) => item.file === backup.body.data.backup.file));
  });
});
