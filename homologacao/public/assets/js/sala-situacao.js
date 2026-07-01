const apiRoot = (window.PAINEL_API_ROOT || (window.apiUrl ? window.apiUrl("") : "/api")).replace(/\/$/, "");
const pollMs = 20000;
const $ = (selector) => document.querySelector(selector);
const state = {
  map: null,
  markers: new Map(),
  routeLine: null,
  payload: null,
  selectedId: null,
  fitted: false,
  shouldFocusSelected: false,
  tracking: null,
  trackingSeq: 0,
  filters: { motorista: "", veiculo: "", status: "", viagem: "" }
};

function initMap() {
  if (!window.L) {
    $("#liveMap").hidden = true;
    $("#mapFallback").hidden = false;
    setBadge("Mapa indisponivel", "error");
    return;
  }
  state.map = L.map("liveMap", { zoomControl: true, scrollWheelZoom: true }).setView([-29.5448, -51.4826], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(state.map);
  $("#mapEngineBadge").textContent = "OpenStreetMap";
  $("#mapEngineBadge").className = "badge openstreet";
}

async function fetchLiveMap() {
  try {
    const request = window.authFetch || window.fetch;
    const response = await request(`${apiRoot}/live-map`, { headers: { Accept: "application/json" } });
    const body = await response.json();
    if (response.status === 401 || response.status === 403) throw new Error(body.error || "Token inválido ou expirado.");
    if (!response.ok || body.ok !== true) throw new Error(body.error || "Falha ao carregar o mapa.");
    applyPayload(body.data || {});
    setBadge("Dados reais", "real");
  } catch (error) {
    clearOperationalData(error.message);
    setBadge("Sem conexao", "error");
  }
}

function applyPayload(payload) {
  const rawVehicles = Array.isArray(payload.veiculos) ? payload.veiculos : (Array.isArray(payload.items) ? payload.items : []);
  state.payload = { ...payload, veiculos: rawVehicles };
  populateFilterOptions(rawVehicles);
  const vehicles = filterVehicles(rawVehicles);
  if (!vehicles.some((item) => vehicleId(item) === state.selectedId)) {
    state.selectedId = vehicles.length ? vehicleId(vehicles[0]) : null;
    state.shouldFocusSelected = Boolean(state.selectedId);
  }
  renderMetrics(payload);
  renderVehicles(vehicles);
  renderAlerts(payload.alertas || []);
  renderFeed(payload.feed || []);
  renderMap(vehicles);
  updateSelectedVehicle(vehicles);
  fetchTrackingForSelected(vehicles);
}

function clearOperationalData(message) {
  state.payload = { veiculos: [] };
  renderMetrics({ indicadores: {}, atualizado_em: null });
  renderVehicles([]);
  renderAlerts([]);
  renderFeed([{ tipo: "API", descricao: message, dataHora: new Date().toISOString() }]);
  renderMap([]);
  renderTracking(null);
}

function bindEvents() {
  ["filterMotorista", "filterVeiculo", "filterStatus"].forEach((id) => {
    const element = $(`#${id}`);
    if (!element) return;
    element.addEventListener("change", () => {
      state.filters[id.replace("filter", "").toLowerCase()] = element.value;
      state.shouldFocusSelected = true;
      applyPayload(state.payload || { veiculos: [] });
    });
  });
  $("#filterViagem")?.addEventListener("input", (event) => {
    state.filters.viagem = event.target.value.trim().toLowerCase();
    state.shouldFocusSelected = true;
    applyPayload(state.payload || { veiculos: [] });
  });
  $("#clearFiltersBtn")?.addEventListener("click", () => {
    state.filters = { motorista: "", veiculo: "", status: "", viagem: "" };
    ["filterMotorista", "filterVeiculo", "filterStatus"].forEach((id) => { const el = $(`#${id}`); if (el) el.value = ""; });
    const tripFilter = $("#filterViagem");
    if (tripFilter) tripFilter.value = "";
    state.shouldFocusSelected = true;
    applyPayload(state.payload || { veiculos: [] });
  });
  $("#downloadRouteReportBtn")?.addEventListener("click", downloadRouteReport);
  $("#activeTrips")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-vehicle-id]");
    if (button) selectVehicle(button.dataset.vehicleId);
  });
}

function populateFilterOptions(vehicles) {
  fillSelect("#filterMotorista", uniqueOptions(vehicles, (item) => item.motorista_id, (item) => item.motorista_nome || item.motorista));
  fillSelect("#filterVeiculo", uniqueOptions(vehicles, (item) => item.veiculo_id || item.id, vehicleTitle));
  fillSelect("#filterStatus", uniqueOptions(vehicles, (item) => item.status_viagem || item.status, (item) => formatStatus(item.status_viagem || item.status).toUpperCase()));
}

function uniqueOptions(items, valueFn, labelFn) {
  const map = new Map();
  items.forEach((item) => {
    const value = valueFn(item);
    const label = labelFn(item);
    if (value && label && !map.has(String(value))) map.set(String(value), String(label));
  });
  return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
}

function fillSelect(selector, options) {
  const select = $(selector);
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">Todos</option>` + options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
  select.value = options.some(([value]) => value === current) ? current : "";
}

function filterVehicles(vehicles) {
  return vehicles.filter((item) => {
    if (state.filters.motorista && String(item.motorista_id || "") !== state.filters.motorista) return false;
    if (state.filters.veiculo && String(item.veiculo_id || item.id || "") !== state.filters.veiculo) return false;
    if (state.filters.status && String(item.status_viagem || item.status || "") !== state.filters.status) return false;
    if (state.filters.viagem) {
      const haystack = [item.viagem_id, item.codigo, item.origem, item.destino, item.motorista_nome, item.motorista, item.prefixo, item.placa, item.veiculo_nome].join(" ").toLowerCase();
      if (!haystack.includes(state.filters.viagem)) return false;
    }
    return true;
  });
}

function renderMetrics(payload) {
  const data = payload.indicadores || {};
  $("#metricTrips").textContent = Number(data.viagensAtivas || 0);
  $("#metricVehicles").textContent = Number(data.veiculosEmRota || 0);
  $("#metricAlerts").textContent = Number(data.alertasAtivos || 0);
  $("#metricGps").textContent = Number(data.gpsSemAtualizacao || 0);
  $("#metricUpdated").textContent = formatTime(payload.atualizado_em);
}

function renderVehicles(vehicles) {
  $("#tripCount").textContent = vehicles.length;
  $("#activeTrips").innerHTML = vehicles.length ? vehicles.map((item) => {
    const id = vehicleId(item);
    return `<button class="vehicle-card ${id === state.selectedId ? "active" : ""} ${colorClass(item.cor_status)}" type="button" data-vehicle-id="${escapeHtml(id)}">
      <span class="vehicle-card-main"><strong>${escapeHtml(vehicleTitle(item))}</strong><small>${escapeHtml(item.motorista_nome || item.motorista || "Motorista nao informado")}</small></span>
      <span class="vehicle-card-route">${escapeHtml(routeLabel(item))}</span>
      <span class="vehicle-card-meta"><span>${escapeHtml(item.status_viagem || item.status || "SEM STATUS")}</span><span>${formatVelocity(item.velocidade)}</span><span>GPS ${formatTime(item.ultima_atualizacao)}</span></span>
    </button>`;
  }).join("") : emptyItem("Nenhuma viagem ativa", "Aguardando localizacoes reais do app motorista.");
}

function updateSelectedVehicle(vehicles) {
  const selected = vehicles.find((item) => vehicleId(item) === state.selectedId);
  $("#selectedVehicle").textContent = selected
    ? `${vehicleTitle(selected)} | ${selected.motorista_nome || selected.motorista || "Motorista nao informado"} | ${formatVelocity(selected.velocidade)}`
    : "Nenhum veiculo com localizacao real disponivel.";
  const wazeLink = $("#wazeLink");
  if (wazeLink) {
    const url = selected?.waze_url || wazeUrl(selected?.latitude, selected?.longitude);
    wazeLink.hidden = !url;
    if (url) wazeLink.href = url;
  }
}

function renderAlerts(alerts) {
  $("#alertCount").textContent = alerts.length;
  $("#alertsList").innerHTML = alerts.length ? alerts.map((item) => `
    <article class="item ${alertClass(item.tipo)}">
      <strong>${escapeHtml(formatStatus(item.tipo || "ALERTA").toUpperCase())}</strong>
      <span>${escapeHtml(item.descricao || "Alerta operacional")}</span>
      <small>${escapeHtml(item.motorista_nome || item.viagem_id || "sem viagem")} | ${formatTime(item.criado_em || item.created_at)}</small>
    </article>`).join("") : emptyItem("Sem alertas ativos", "Nenhum alerta real registrado.");
}

function renderFeed(feed) {
  $("#feedCount").textContent = feed.length;
  $("#feedList").innerHTML = feed.length ? feed.map((item) => `<li><small>${formatTime(item.dataHora || item.criado_em)} | ${escapeHtml(item.viagem_id || "geral")}</small><strong>${escapeHtml(item.tipo || "EVENTO")}</strong> - ${escapeHtml(item.descricao || "Atualizacao operacional")}</li>`).join("") : "<li><small>--:--</small>Sem eventos reais registrados.</li>";
}

function renderMap(vehicles) {
  if (!state.map) return;
  const visible = new Set();
  const points = [];
  vehicles.forEach((vehicle) => {
    if (vehicle.latitude == null || vehicle.longitude == null) return;
    const id = vehicleId(vehicle);
    const position = [Number(vehicle.latitude), Number(vehicle.longitude)];
    if (!Number.isFinite(position[0]) || !Number.isFinite(position[1])) return;
    visible.add(id);
    points.push(position);
    let marker = state.markers.get(id);
    if (!marker) {
      marker = L.marker(position, { icon: markerIcon(vehicle) }).addTo(state.map);
      marker.on("click", () => selectVehicle(id));
      state.markers.set(id, marker);
    }
    marker.setLatLng(position).setIcon(markerIcon(vehicle)).bindPopup(popupHtml(vehicle));
  });
  for (const [id, marker] of state.markers.entries()) {
    if (!visible.has(id)) {
      state.map.removeLayer(marker);
      state.markers.delete(id);
    }
  }
  const selected = vehicles.find((item) => vehicleId(item) === state.selectedId);
  if (selected && selected.latitude != null && selected.longitude != null && state.shouldFocusSelected) {
    state.map.setView([Number(selected.latitude), Number(selected.longitude)], Math.max(state.map.getZoom(), 15));
    state.shouldFocusSelected = false;
    state.fitted = true;
  } else if (!state.fitted && points.length) {
    state.map.fitBounds(L.latLngBounds(points), { padding: [42, 42], maxZoom: 14 });
    state.fitted = true;
  }
}

async function fetchTrackingForSelected(vehicles) {
  const selected = vehicles.find((item) => vehicleId(item) === state.selectedId);
  if (!selected?.viagem_id) {
    renderTracking(null);
    drawTrail([]);
    return;
  }
  const seq = ++state.trackingSeq;
  try {
    const request = window.authFetch || window.fetch;
    const response = await request(`${apiRoot}/rastreamento?viagem_id=${encodeURIComponent(selected.viagem_id)}&limit=500`, { headers: { Accept: "application/json" } });
    const body = await response.json();
    if (seq !== state.trackingSeq) return;
    if (response.status === 401 || response.status === 403) throw new Error(body.error || "Token inválido ou expirado.");
    if (!response.ok || body.ok !== true) throw new Error(body.error || "Falha ao carregar histórico.");
    state.tracking = body.data || null;
    renderTracking(state.tracking);
    drawTrail(state.tracking?.pontos || []);
  } catch (error) {
    renderTracking({ error: error.message, registros: [], pontos: [], resumo: {} });
    drawTrail([]);
  }
}

function renderTracking(data) {
  const registros = Array.isArray(data?.registros) ? data.registros : [];
  const resumo = data?.resumo || {};
  $("#historyCount").textContent = registros.length;
  const reportBtn = $("#downloadRouteReportBtn");
  if (reportBtn) reportBtn.disabled = registros.length === 0;
  $("#routeSummary").innerHTML = registros.length ? `
    <div><span>Distancia</span><strong>${Number(resumo.distancia_km || 0).toFixed(2)} km</strong></div>
    <div><span>Vel. media</span><strong>${formatVelocity(resumo.velocidade_media_kmh)}</strong></div>
    <div><span>Vel. maxima</span><strong>${formatVelocity(resumo.velocidade_maxima_kmh)}</strong></div>
    <div><span>Inicio/fim</span><strong>${formatTime(resumo.inicio)} - ${formatTime(resumo.fim)}</strong></div>`
    : `<div class="empty-history">${escapeHtml(data?.error || "Sem registros salvos para esta viagem.")}</div>`;
  $("#historyList").innerHTML = registros.length ? registros.slice(-20).reverse().map((item) => `
    <tr>
      <td>${formatTime(item.criado_em)}</td>
      <td>${formatVelocity(item.velocidade)}</td>
      <td>${escapeHtml(item.latitude || "--")}</td>
      <td>${escapeHtml(item.longitude || "--")}</td>
    </tr>`).join("") : `<tr><td colspan="4">Sem historico.</td></tr>`;
}

function drawTrail(points) {
  if (!state.map) return;
  if (state.routeLine) {
    state.map.removeLayer(state.routeLine);
    state.routeLine = null;
  }
  const latLngs = points.map((point) => [Number(point.latitude), Number(point.longitude)]).filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
  if (latLngs.length < 2) return;
  state.routeLine = L.polyline(latLngs, { weight: 4, opacity: 0.85 }).addTo(state.map);
}

function selectVehicle(id) {
  state.selectedId = String(id);
  state.shouldFocusSelected = true;
  applyPayload(state.payload || { veiculos: [] });
  state.markers.get(state.selectedId)?.openPopup();
}

function downloadRouteReport() {
  const data = state.tracking;
  const registros = Array.isArray(data?.registros) ? data.registros : [];
  if (!registros.length) return;
  const relatorio = data.relatorio || {};
  const resumo = data.resumo || {};
  const lines = [
    ["Relatorio da rota percorrida"],
    ["Gerado em", new Date().toLocaleString("pt-BR")],
    ["Viagem", relatorio.viagem_id || registros[0]?.viagem_id || ""],
    ["Motorista", relatorio.motorista_nome || registros[0]?.motorista_nome || ""],
    ["Veiculo", relatorio.veiculo || vehicleTitle(registros[0] || {})],
    ["Origem", relatorio.origem || registros[0]?.origem || ""],
    ["Destino", relatorio.destino || registros[0]?.destino || ""],
    ["Distancia km", resumo.distancia_km || 0],
    ["Velocidade media km/h", resumo.velocidade_media_kmh || ""],
    ["Velocidade maxima km/h", resumo.velocidade_maxima_kmh || ""],
    [],
    ["Horario", "Latitude", "Longitude", "Velocidade km/h", "Status"]
  ];
  registros.forEach((item) => lines.push([item.criado_em || "", item.latitude || "", item.longitude || "", item.velocidade || "", item.status_viagem || ""]));
  const csv = lines.map((line) => line.map(csvCell).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-rota-${relatorio.viagem_id || Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
function markerIcon(vehicle) { return L.divIcon({ className: "", html: `<div class="vehicle-marker marker-${escapeHtml(vehicle.cor_status || "CINZA")}">${escapeHtml(vehicle.prefixo || "V")}</div>`, iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18] }); }
function popupHtml(vehicle) { const url = vehicle.waze_url || wazeUrl(vehicle.latitude, vehicle.longitude); return `<strong>${escapeHtml(vehicleTitle(vehicle))}</strong><br>Motorista: ${escapeHtml(vehicle.motorista_nome || vehicle.motorista || "--")}<br>Viagem: ${escapeHtml(vehicle.codigo || vehicle.viagem_id || "--")}<br>Status: ${escapeHtml(formatStatus(vehicle.status_viagem || vehicle.status))}<br>Estado: ${escapeHtml(formatStatus(vehicle.estado_rota || vehicle.tipo_alerta || vehicle.status))}<br>Velocidade: ${formatVelocity(vehicle.velocidade)}<br>Último GPS: ${formatTime(vehicle.ultima_atualizacao)}${url ? `<br><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Abrir no Waze</a>` : ""}`; }
function vehicleId(vehicle) { return String(vehicle.viagem_id || vehicle.veiculo_id || vehicle.id || ""); }
function vehicleTitle(vehicle) { return [vehicle.prefixo || vehicle.veiculo_nome || "Veiculo", vehicle.placa].filter(Boolean).join(" - "); }
function routeLabel(item) { return [item.codigo || item.viagem_id || "Viagem", item.origem, item.destino].filter(Boolean).join(" | "); }
function emptyItem(title, detail) { return `<article class="item gray"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></article>`; }
function colorClass(status) { return ({ VERMELHO: "red", LARANJA: "orange", AMARELO: "yellow", VERDE: "green", AZUL: "green", CINZA: "gray" })[status] || "gray"; }
function alertClass(type) { return type === "VELOCIDADE_ACIMA_LIMITE" ? "orange" : ["GPS_SEM_ATUALIZACAO", "OCORRENCIA", "PANICO", "OCORRENCIA_ABERTA"].includes(type) ? "red" : ""; }
function formatStatus(value) { return String(value || "sem status").replace(/_/g, " ").toLowerCase(); }
function formatVelocity(value) { const speed = Number(value); return Number.isFinite(speed) ? `${speed.toFixed(speed % 1 ? 1 : 0)} km/h` : "-- km/h"; }
function formatTime(value) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--"; }
function wazeUrl(latitude, longitude) { const lat = Number(latitude); const lon = Number(longitude); return Number.isFinite(lat) && Number.isFinite(lon) ? `https://www.waze.com/ul?ll=${encodeURIComponent(`${lat},${lon}`)}&navigate=yes&zoom=17` : null; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]); }
function setBadge(text, style) { $("#mapBadge").textContent = text; $("#mapBadge").className = `badge ${style}`; }

bindEvents();
initMap();
fetchLiveMap();
window.setInterval(fetchLiveMap, pollMs);
