const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-fase10-"));
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

async function requestJson(baseUrl, pathName) {
  const response = await fetch(`${baseUrl}${pathName}`, { headers: { Accept: "application/json" } });
  const body = await response.json();
  return { response, body };
}

test("fase 10 keeps Ollama optional by default in environment example", () => {
  const envExample = fs.readFileSync(path.join(__dirname, "..", ".env.example"), "utf8");
  assert.match(envExample, /^APP_URL=http:\/\/10\.0\.0\.4:3000$/m);
  assert.match(envExample, /^PUBLIC_URL=http:\/\/10\.0\.0\.4:3000$/m);
  assert.match(envExample, /^OLLAMA_ENABLED=false$/m);
  assert.match(envExample, /^OLLAMA_MODEL=qwen2\.5:0\.5b$/m);
});

test("GET /api/infra/resources exposes lightweight non-sensitive resource snapshot", async () => {
  await withServer(async ({ baseUrl }) => {
    const result = await requestJson(baseUrl, "/api/infra/resources");
    assert.equal(result.response.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(typeof result.body.data.uptimeSegundos, "number");
    assert.equal(typeof result.body.data.memoria.heapUsedBytes, "number");
    assert.equal(typeof result.body.data.dados.tamanhoJsonBytes, "number");
    assert.equal(typeof result.body.data.dados.viagens, "number");
    assert.equal(result.body.data.iaOpcional.ollamaEnabled, false);
    assert.equal(result.body.data.iaOpcional.modelo, "qwen2.5:0.5b");
    assert.equal(result.body.data.servidor, undefined);
  });
});
