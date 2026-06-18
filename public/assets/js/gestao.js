const apiRoot = window.PAINEL_API_ROOT || "/api";
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

async function apiGet(path) {
  const response = await window.authFetch(`${apiRoot}${path}`, { headers: { Accept: "application/json" } });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "Falha ao carregar dados.");
  return body.data;
}

async function loadGestao() {
  const [dashboard, frota, motoristas, passageiros, custos, auditoria, viagensChart, custosChart, frotaChart, ocorrenciasChart] = await Promise.all([
    apiGet("/gestao/dashboard"),
    apiGet("/gestao/frota"),
    apiGet("/gestao/motoristas"),
    apiGet("/gestao/passageiros"),
    apiGet("/gestao/custos"),
    apiGet("/gestao/auditoria"),
    fetchChartData(window.apiUrl("/graficos/viagens")),
    fetchChartData(window.apiUrl("/graficos/custos")),
    fetchChartData(window.apiUrl("/graficos/frota")),
    fetchChartData(window.apiUrl("/graficos/ocorrencias"))
  ]);

  fillDashboard(dashboard, custos);
  fillRankings(frota, motoristas);
  fillPassengers(passageiros);
  fillAttention(dashboard);
  fillAudit(auditoria.itens || []);
  fillManagerCharts({
    viagens: viagensChart,
    custos: custosChart,
    frota: frotaChart,
    ocorrencias: ocorrenciasChart
  });
  bindAuthenticatedExports();
}

function fillDashboard(dashboard, custos) {
  text("#kpiCostKm", brl.format(custos.custoPorKm || 0));
  text("#kpiCostPatient", brl.format(custos.custoPorPaciente || 0));
  text("#kpiTrips", dashboard.viagensPeriodo);
  text("#kpiPatients", dashboard.pacientesTransportados);
  text("#kpiOccupation", `${dashboard.taxaOcupacao}%`);
  text("#kpiAbsence", `${dashboard.absenteismo}%`);
}

function fillRankings(frota, motoristas) {
  document.querySelector("#driverRanking").innerHTML = (motoristas.ranking || []).slice(0, 5).map((item, index) => `
    <div class="ranking-row"><strong>${index + 1}</strong><span>${escapeHtml(item.nome)}</span><b>${item.viagens}</b></div>
  `).join("") || empty("Sem motoristas no periodo");
  document.querySelector("#fleetRanking").innerHTML = (frota.ranking || []).slice(0, 5).map((item, index) => `
    <div class="ranking-row"><strong>${index + 1}</strong><span>${escapeHtml(item.prefixo || item.placa)}</span><b>${item.kmRodados} km</b></div>
  `).join("") || empty("Sem frota no periodo");
}

function fillPassengers(passageiros) {
  document.querySelector("#passengerSummary").innerHTML = [
    ["Previstos", passageiros.passageirosPrevistos],
    ["Pacientes transportados", passageiros.pacientesTransportados],
    ["Acompanhantes transportados", passageiros.acompanhantesTransportados],
    ["Ausentes", passageiros.pacientesAusentes],
    ["Comparecimento", `${passageiros.taxaComparecimento}%`]
  ].map(([label, value]) => `<div class="ranking-row"><strong>*</strong><span>${label}</span><b>${value}</b></div>`).join("");
}

function fillManagerCharts(charts) {
  const datasets = {
    viagensMes: findDataset(charts.viagens, "viagens-mes"),
    custosCategoria: findDataset(charts.custos, "custos-categoria"),
    frotaUtilizada: findDataset(charts.frota, "veiculos-mais-utilizados"),
    ocorrenciasTipo: findDataset(charts.ocorrencias, "ocorrencias-tipo"),
    absenteismo: findDataset(charts.ocorrencias, "absenteismo")
  };

  createDashboardChart("managerTripsMonthChart", datasets.viagensMes, { type: "bar" });
  createDashboardChart("managerCostsChart", datasets.custosCategoria, { type: "doughnut" });
  createDashboardChart("managerFleetChart", datasets.frotaUtilizada, {
    type: "bar",
    chartOptions: { indexAxis: "y" }
  });
  createDashboardChart("managerOccurrencesChart", datasets.ocorrenciasTipo, { type: "doughnut" });
  createDashboardChart("managerAbsenceChart", datasets.absenteismo, { type: "line" });
}

function fillAttention(dashboard) {
  document.querySelector("#attentionList").innerHTML = [
    ["Excesso de Velocidade", `${dashboard.alertasVelocidade} ocorrencias`, "red"],
    ["Ocorrencias", `${dashboard.ocorrencias} registros`, "yellow"],
    ["Veiculos Ativos", `${dashboard.veiculosAtivos} veiculos`, "green"],
    ["Motoristas Ativos", `${dashboard.motoristasAtivos} online`, "blue"]
  ].map(([title, detail, color]) => `
    <div class="list-item"><span class="list-icon ${color}">!</span><div><strong>${title}</strong><span>${detail}</span></div></div>
  `).join("");
}

function fillAudit(items) {
  document.querySelector("#auditTable").innerHTML = items.slice(0, 20).map((item) => `
    <tr>
      <td>${escapeHtml(item.origem || "")}</td>
      <td>${escapeHtml(item.tipo || "")}</td>
      <td>${escapeHtml(item.viagem_id || "")}</td>
      <td>${escapeHtml(item.descricao || "")}</td>
      <td>${formatDate(item.dataHora)}</td>
    </tr>
  `).join("") || `<tr><td colspan="5">Sem itens de auditoria no periodo.</td></tr>`;
}

function findDataset(collection, id) {
  return (collection || []).find((item) => item.id === id);
}

function text(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function empty(message) {
  return `<div class="ranking-row"><strong>*</strong><span>${message}</span><b>0</b></div>`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function bindAuthenticatedExports() {
  document.querySelectorAll('a[href^="/api/export/"]').forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const href = link.getAttribute("href").replace(/^\/api/, "");
      const response = await window.authFetch(window.apiUrl(href), { headers: { Accept: "text/csv" } });
      if (!response.ok) throw new Error("Falha ao exportar CSV.");
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = new URL(link.href).searchParams.get("tipo") || "export";
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
    });
  });
}

loadGestao().catch((error) => {
  document.querySelector("#auditTable").innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
});
