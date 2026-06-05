async function loadOperatorDashboard() {
  const [indicadores, viagens] = await Promise.all([
    fetch("/api/indicadores/operador").then((response) => response.json()),
    fetchChartData("/api/graficos/viagens")
  ]);
  const kpis = indicadores.data.kpis;
  setText("#kpiOngoing", kpis.viagensAtivas);
  setText("#operatorFeed", "");
  renderOperatorFeed(indicadores.data.feed.ultimosEventos || []);
  createDashboardChart("operatorStatusChart", viagens.find((item) => item.id === "status-viagens"), { type: "doughnut" });
  createDashboardChart("operatorHourlyChart", viagens.find((item) => item.id === "movimentacao-hora"), { type: "line" });
}

function renderOperatorFeed(items) {
  const target = document.querySelector("#operatorFeed");
  if (!target) return;
  target.innerHTML = items.length ? items.slice(0, 5).map((item) => `
    <div class="list-item"><span class="dot"></span><div><strong>${escapeText(item.tipo || "EVENTO")}</strong><span>${escapeText(item.descricao || "")}</span></div><span class="time">${formatShortTime(item.dataHora)}</span></div>
  `).join("") : `<div class="list-item"><span class="dot"></span><div><strong>Sem eventos</strong><span>Aguardando operacao.</span></div></div>`;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function formatShortTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

loadOperatorDashboard().catch((error) => {
  const target = document.querySelector("#operatorFeed");
  if (target) target.innerHTML = `<div class="list-item"><span class="dot" style="background:var(--red)"></span><div><strong>Falha ao carregar</strong><span>${escapeText(error.message)}</span></div></div>`;
});
