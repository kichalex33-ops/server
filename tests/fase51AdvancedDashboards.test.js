const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const createApp = require("../src/app");
const createRepository = require("../src/repositories/jsonRepository");

async function withServer(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "painel-fase51-"));
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

test("advanced indicador endpoints expose operador and gestor KPIs", async () => {
  await withServer(async ({ baseUrl }) => {
    const operador = await requestJson(baseUrl, "/api/indicadores/operador");
    const gestor = await requestJson(baseUrl, "/api/indicadores/gestor");

    assert.equal(operador.response.status, 200);
    assert.deepEqual(Object.keys(operador.body.data.kpis).sort(), [
      "alertasPendentes",
      "emEspera",
      "pacientesEmTransito",
      "veiculosOperacionais",
      "viagensAtivas",
      "viagensHoje"
    ].sort());
    assert.ok(Array.isArray(operador.body.data.feed.ultimosEventos));

    assert.equal(gestor.response.status, 200);
    assert.deepEqual(Object.keys(gestor.body.data.kpis).sort(), [
      "absenteismo",
      "custoPorKm",
      "custoTotal",
      "kmRodados",
      "ocorrencias",
      "pacientesTransportados",
      "totalViagens",
      "utilizacaoFrota"
    ].sort());
    assert.ok(Array.isArray(gestor.body.data.rankings.motoristas));
    assert.ok(Array.isArray(gestor.body.data.rankings.veiculos));
    assert.ok(Array.isArray(gestor.body.data.rankings.destinos));
  });
});

test("advanced chart endpoints expose Chart.js-ready datasets", async () => {
  await withServer(async ({ baseUrl }) => {
    for (const pathName of ["/api/graficos/viagens", "/api/graficos/custos", "/api/graficos/frota", "/api/graficos/ocorrencias"]) {
      const { response, body } = await requestJson(baseUrl, pathName);
      assert.equal(response.status, 200);
      assert.ok(Array.isArray(body.data.datasets));
      assert.ok(body.data.datasets.length >= 1);
      assert.ok(Array.isArray(body.data.datasets[0].labels));
      assert.ok(Array.isArray(body.data.datasets[0].values));
    }
  });
});

test("operator and manager dashboards include Chart.js and unified chart layer", async () => {
  await withServer(async ({ baseUrl }) => {
    const operador = await fetch(`${baseUrl}/painel-logistico/operador`);
    const operadorHtml = await operador.text();
    const gestor = await fetch(`${baseUrl}/painel-logistico/gestao`);
    const gestorHtml = await gestor.text();
    const charts = await fetch(`${baseUrl}/assets/js/charts/dashboard-charts.js`);
    const chartsText = await charts.text();

    assert.equal(operador.status, 200);
    assert.match(operadorHtml, /cdn\.jsdelivr\.net\/npm\/chart\.js/);
    assert.match(operadorHtml, /operatorStatusChart/);
    assert.match(operadorHtml, /operatorHourlyChart/);
    assert.match(operadorHtml, /dashboard-charts\.js/);

    assert.equal(gestor.status, 200);
    assert.match(gestorHtml, /managerTripsMonthChart/);
    assert.match(gestorHtml, /managerCostsChart/);
    assert.match(gestorHtml, /managerAbsenceChart/);
    assert.match(gestorHtml, /dashboard-charts\.js/);

    assert.equal(charts.status, 200);
    assert.match(chartsText, /createDashboardChart/);
  });
});
