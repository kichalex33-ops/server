const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-fase-b-"));
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

test("GET /motorista serves the offline-first driver PWA shell", async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/motorista`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Painel Logistico Motorista/);
    assert.match(html, /manifest\.json/);
    assert.match(html, /service-worker\.js/);
    assert.match(html, /Confirmar Pareamento/);
    assert.match(html, /Sincronizar agora/);
  });
});

test("driver PWA manifest and service worker expose installable offline assets", async () => {
  await withServer(async ({ baseUrl }) => {
    const manifestResponse = await fetch(`${baseUrl}/motorista/manifest.json`);
    const manifest = await manifestResponse.json();

    assert.equal(manifestResponse.status, 200);
    assert.equal(manifest.name, "Painel Logistico Motorista");
    assert.equal(manifest.short_name, "Motorista");
    assert.equal(manifest.display, "standalone");
    assert.equal(manifest.start_url, "/motorista");
    assert.ok(Array.isArray(manifest.icons));

    const swResponse = await fetch(`${baseUrl}/motorista/service-worker.js`);
    const sw = await swResponse.text();
    assert.equal(swResponse.status, 200);
    assert.match(sw, /CACHE_NAME/);
    assert.match(sw, /offline\.html/);

    const storeResponse = await fetch(`${baseUrl}/motorista/assets/js/offline-store.js`);
    const store = await storeResponse.text();
    assert.equal(storeResponse.status, 200);
    assert.match(store, /indexedDB/);
    assert.match(store, /eventosPendentes/);
    assert.match(store, /localizacoesPendentes/);
  });
});

test("driver PWA integrates manual QR payload pairing and sync functions", async () => {
  await withServer(async ({ baseUrl }) => {
    const appResponse = await fetch(`${baseUrl}/motorista/assets/js/app-motorista.js`);
    const appSource = await appResponse.text();

    assert.equal(appResponse.status, 200);
    assert.match(appSource, /confirmarPareamento/);
    assert.match(appSource, /syncNow/);
    assert.match(appSource, /navigator\.geolocation/);
    assert.match(appSource, /api\/driver\/pairing\/confirm/);
    assert.match(appSource, /api\/driver\/trips/);
    assert.match(appSource, /api\/driver\/locations/);
    assert.match(appSource, /api\/driver\/panic/);
  });
});
