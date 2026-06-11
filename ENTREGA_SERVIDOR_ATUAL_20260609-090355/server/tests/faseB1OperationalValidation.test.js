const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-fase-b1-"));
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
    await callback({ baseUrl });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/system/health exposes operational readiness fields", async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/system/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(typeof body.uptime, "number");
    assert.equal(typeof body.memory, "object");
    assert.equal(typeof body.storage, "object");
    assert.equal(typeof body.node_version, "string");
    assert.equal(typeof body.gps_queue, "number");
    assert.equal(typeof body.sync_queue, "number");
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });
});

test("PM2 ecosystem config defines production app, logs and restart policy", () => {
  const configPath = path.join(__dirname, "..", "ecosystem.config.js");
  const source = fs.readFileSync(configPath, "utf8");

  assert.match(source, /painel-logistico/);
  assert.match(source, /server\.js/);
  assert.match(source, /NODE_ENV:\s*"production"/);
  assert.match(source, /out_file/);
  assert.match(source, /error_file/);
  assert.match(source, /max_restarts/);
});
