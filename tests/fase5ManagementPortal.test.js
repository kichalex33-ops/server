const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-fase5-"));
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

async function requestJson(baseUrl, pathName) {
  const response = await fetch(`${baseUrl}${pathName}`, { headers: { Accept: "application/json" } });
  const body = await response.json();
  return { response, body };
}

test("portal separates operador and gestao with profile login and theme support", async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/painel-logistico`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Operador Logistico/i);
    assert.match(html, /Painel Gestor/i);
    assert.match(html, /GESTAO/);
    assert.match(html, /OPERADOR/);
    assert.match(html, /themeToggle/);
    assert.match(html, /portal.js/);
  });
});

test("operador page is light by default and gestao page is separate", async () => {
  await withServer(async ({ baseUrl }) => {
    const operador = await fetch(`${baseUrl}/painel-logistico/operador`);
    const operadorHtml = await operador.text();
    const gestao = await fetch(`${baseUrl}/painel-logistico/gestao`);
    const gestaoHtml = await gestao.text();

    assert.equal(operador.status, 200);
    assert.match(operadorHtml, /Painel Operacional/);
    assert.match(operadorHtml, /operator-light/);
    assert.match(operadorHtml, /Viagens do Dia/);
    assert.match(operadorHtml, /Sala de Situacao/);

    assert.equal(gestao.status, 200);
    assert.match(gestaoHtml, /Painel do Gestor/);
    assert.match(gestaoHtml, /Dashboard Gerencial/);
    assert.match(gestaoHtml, /gestao.js/);
  });
});

test("gestao APIs return dashboard, rankings, audit and CSV data from JSON", async () => {
  await withServer(async ({ baseUrl }) => {
    const dashboard = await requestJson(baseUrl, "/api/gestao/dashboard");
    const frota = await requestJson(baseUrl, "/api/gestao/frota");
    const motoristas = await requestJson(baseUrl, "/api/gestao/motoristas");
    const passageiros = await requestJson(baseUrl, "/api/gestao/passageiros");
    const custos = await requestJson(baseUrl, "/api/gestao/custos");
    const auditoria = await requestJson(baseUrl, "/api/gestao/auditoria");

    assert.equal(dashboard.response.status, 200);
    assert.deepEqual(Object.keys(dashboard.body.data).sort(), [
      "absenteismo",
      "alertasVelocidade",
      "acompanhantesTransportados",
      "custoTotal",
      "kmRodados",
      "motoristasAtivos",
      "ocorrencias",
      "pacientesTransportados",
      "taxaOcupacao",
      "veiculosAtivos",
      "viagensPeriodo"
    ].sort());
    assert.equal(dashboard.body.data.viagensPeriodo, 1);
    assert.equal(dashboard.body.data.veiculosAtivos, 1);
    assert.equal(frota.body.data.resumo.veiculosCadastrados, 1);
    assert.equal(motoristas.body.data.motoristas[0].motorista_id, "mot-001");
    assert.equal(passageiros.body.data.passageirosPrevistos, 4);
    assert.equal(custos.body.data.custoTotal, 0);
    assert.ok(Array.isArray(auditoria.body.data.itens));

    const csv = await fetch(`${baseUrl}/api/export/csv?tipo=viagens`);
    const csvText = await csv.text();
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get("content-type"), /text\/csv/);
    assert.match(csvText.split("\n")[0], /id,codigo,origem,destino,status/);
    assert.match(csvText, /VIA-SJS-0001/);
  });
});
