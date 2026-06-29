const chartPalette = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0f766e", "#c9a64d", "#64748b"];
const dashboardChartInstances = window.dashboardChartInstances || {};
window.dashboardChartInstances = dashboardChartInstances;

function createDashboardChart(canvasId, dataset, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart || !dataset) return null;

  if (dashboardChartInstances[canvasId]) {
    try { dashboardChartInstances[canvasId].destroy(); } catch (error) { /* ignora chart antigo */ }
    delete dashboardChartInstances[canvasId];
  }

  const type = options.type || dataset.type || "bar";
  const chartData = {
    labels: dataset.labels || [],
    datasets: [{
      label: dataset.title || options.label || "Indicador",
      data: dataset.values || [],
      borderColor: options.borderColor || chartPalette[0],
      backgroundColor: type === "line" ? "rgba(37, 99, 235, .14)" : chartPalette,
      borderWidth: 2,
      tension: .35,
      fill: type === "line"
    }]
  };
  const chart = new Chart(canvas, {
    type,
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: type !== "bar", position: "bottom" },
        tooltip: { mode: "index", intersect: false }
      },
      scales: type === "doughnut" ? {} : {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "rgba(100, 116, 139, .18)" } }
      },
      ...(options.chartOptions || {})
    }
  });
  dashboardChartInstances[canvasId] = chart;
  return chart;
}

async function fetchChartData(path, options = {}) {
  const request = window.authFetch || fetch;
  const response = await request(path, { headers: { Accept: "application/json" }, signal: options.signal });
  let body = {};
  try { body = await response.json(); } catch (error) { body = {}; }
  if (!response.ok || !body.ok) throw new Error(body.error || "Falha ao carregar grafico.");
  return body.data.datasets || [];
}

window.createDashboardChart = createDashboardChart;
window.fetchChartData = fetchChartData;
