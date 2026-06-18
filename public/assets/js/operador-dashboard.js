async function loadOperatorDashboard() {
  const [indicadores, viagens] = await Promise.all([
    window.authFetch(window.apiUrl("/indicadores/operador")).then((response) => response.json()),
    fetchChartData(window.apiUrl("/graficos/viagens"))
  ]);
  const kpis = indicadores.data.kpis;
  setText("#kpiOngoing", kpis.viagensAtivas);
  setText("#operatorFeed", "");
  renderOperatorFeed(indicadores.data.feed.ultimosEventos || []);
  createDashboardChart("operatorStatusChart", viagens.find((item) => item.id === "status-viagens"), { type: "doughnut" });
  createDashboardChart("operatorHourlyChart", viagens.find((item) => item.id === "movimentacao-hora"), { type: "line" });
  await loadDrivers();
  bindDriverForm();
}

async function loadDrivers() {
  const response = await window.authFetch(window.apiUrl("/motoristas"), { headers: { Accept: "application/json" } });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "Falha ao carregar motoristas.");
  renderDrivers(body.data.motoristas || []);
}

function bindDriverForm() {
  const form = document.querySelector("#driverForm");
  const refresh = document.querySelector("#refreshDriversBtn");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", submitDriverForm);
  }
  if (refresh && !refresh.dataset.bound) {
    refresh.dataset.bound = "true";
    refresh.addEventListener("click", () => loadDrivers().catch(showDriverError));
  }
}

async function submitDriverForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("#driverFormStatus");
  const payload = Object.fromEntries(new FormData(form).entries());
  status.textContent = "Salvando...";
  const response = await window.authFetch(window.apiUrl("/motoristas"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "Falha ao cadastrar motorista.");
  form.reset();
  status.textContent = "Motorista cadastrado.";
  await loadDrivers();
  await generateDriverQr(body.data.motorista.id);
}

function renderDrivers(drivers) {
  const target = document.querySelector("#driversList");
  if (!target) return;
  target.innerHTML = drivers.length ? drivers.map((driver) => `
    <div class="ranking-row">
      <strong>${escapeText(driver.status || "ativo")}</strong>
      <span>${escapeText(driver.nome || driver.id)}<br><small>${escapeText(driver.matricula || driver.cpf || "")}</small></span>
      <button class="driver-action" type="button" data-driver-id="${escapeText(driver.id)}">Gerar QR</button>
    </div>
  `).join("") : emptyDriverList();
  target.querySelectorAll("[data-driver-id]").forEach((button) => {
    button.addEventListener("click", () => generateDriverQr(button.dataset.driverId).catch(showQrError));
  });
}

async function generateDriverQr(driverId) {
  const status = document.querySelector("#driverQrStatus");
  const payloadBox = document.querySelector("#driverQrPayload");
  const canvas = document.querySelector("#driverQrCanvas");
  status.textContent = "Gerando QR...";
  const response = await window.authFetch(window.apiUrl(`/motoristas/${encodeURIComponent(driverId)}/qrcode`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ origem: "painel_operador" })
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "Falha ao gerar QR Code.");
  const text = body.data.qr.texto;
  payloadBox.value = text;
  if (window.QRCode && canvas) {
    await window.QRCode.toCanvas(canvas, text, { width: 220, margin: 1, errorCorrectionLevel: "M" });
  }
  status.textContent = `Expira em ${formatDateTime(body.data.qr.expira_em)}`;
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

function emptyDriverList() {
  return `<div class="ranking-row"><strong>-</strong><span>Nenhum motorista cadastrado.</span><b>0</b></div>`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

function showDriverError(error) {
  const status = document.querySelector("#driverFormStatus");
  if (status) status.textContent = error.message;
}

function showQrError(error) {
  const status = document.querySelector("#driverQrStatus");
  if (status) status.textContent = error.message;
}

loadOperatorDashboard().catch((error) => {
  const target = document.querySelector("#operatorFeed");
  if (target) target.innerHTML = `<div class="list-item"><span class="dot" style="background:var(--red)"></span><div><strong>Falha ao carregar</strong><span>${escapeText(error.message)}</span></div></div>`;
});
