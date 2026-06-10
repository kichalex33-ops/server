const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createRepository = require("../src/repositories/jsonRepository");

test("jsonRepository creates data file, seeds collections and updates records", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-json-"));
  const dataFile = path.join(tempDir, "painel-logistico.json");
  const backupDir = path.join(tempDir, "backups");
  const repository = createRepository({ dataFile, backupDir });

  repository.ensureDataFile();
  const initialData = repository.loadData();

  assert.equal(initialData.config.app, "Painel Logistico");
  assert.equal(initialData.motoristas[0].id, "mot-001");
  assert.equal(initialData.viagens[0].id, "VIA-SJS-0001");

  const alerta = repository.addItem("alertas", {
    tipo: "GPS_SEM_ATUALIZACAO",
    descricao: "Teste automatizado"
  });

  assert.ok(alerta.id);
  assert.ok(alerta.criadoEm);
  assert.equal(alerta.tipo, "GPS_SEM_ATUALIZACAO");

  const atualizado = repository.updateItem("alertas", alerta.id, { status: "resolvido" });
  assert.equal(atualizado.status, "resolvido");
  assert.equal(repository.findById("alertas", alerta.id).status, "resolvido");
  assert.ok(fs.existsSync(dataFile));
});
