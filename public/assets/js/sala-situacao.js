const apiRoot = (window.PAINEL_API_ROOT || "/api").replace(/\/$/, "");
const pollMs = 5000;
const demoPayload = {
  atualizado_em: new Date().toISOString(),
  modo: "demo",
  mapa: "OpenStreetMap",
  indicadores: {
    viagensAtivas: 1,
    veiculosEmRota: 1,
    alertasAtivos: 1,
    ocorrenciasAbertas: 0,
    gpsSemAtualizacao: 0,
    velocidadeAcimaLimite: 0
  },
  veiculos: [
    {
      veiculo_id: "vei-001",
      placa: "LOG-2045",
      prefixo: "SMS-01",
      motorista: "Joao Santos",
      telefone: "(00) 90000-0000",
      viagem_id: "VIA-SJS-0001",
      status_viagem: "EM_TRANSITO_IDA",
      latitude: -29.572,
      longitude: -51.476,
      velocidade: 46,
      ultima_atualizacao: new Date().toISOString(),
      origem: "UBS Sao Jose do Sul",
      destino: "Hospital Montenegro",
      passageiros: 4,
      alerta_ativo: false,
      tipo_alerta: null,
      cor_status: "AZUL"
    }
  ],
  alertas: [
    { tipo: "DEMO_OPERACIONAL", descricao: "Modo demonstrativo ativo para treino da sala.", viagem_id: "VIA-SJS-0001", status: "ABERTO", created_at: new Date().toISOString() }
  ],
  feed: [
    { tipo: "GPS_RECEBIDO", descricao: "GPS demonstrativo recebido.", viagem_id: "VIA-SJS-0001", dataHora: new Date().toISOString() },
    { tipo: "SALA_SITUACAO", descricao: "Central acompanhando viagem ativa.", viagem_id: "VIA-SJS-0001", dataHora: new Date().toISOString() }
  ]
};

const $ = (selector) => document.querySelector(selector);
const state = { map: null, markers: new Map(), routeLine: null, usingDemo: false, lastPayload: null };

function initMap() {
  if (!window.L) {
    $("#liveMap").hidden = true;
    $("#mapFallback").hidden = false;
    $("#mapBadge").textContent = "Sem mapa";
    $("#mapBadge").className = "badge error";
    return;
  }

  state.map = L.map("liveMap", { zoomControl: true, scrollWheelZoom: true }).setView([-29.56, -51.49], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(state.map);
}

async function fetchLiveMap() {
  if ($("#demoToggle").checked) return applyPayload(demoPayload, true);
  try {
    const response = await fetch(`${apiRoot}/live-map`, { headers: { Accept: "application/json" } });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.error || "Falha ao carregar mapa.");
    applyPayload(body.data, false);
  } catch (error) {
    const fallback = { ...demoPayload, feed: [{ tipo: "FALLBACK", descricao: error.message, dataHora: new Date().toISOString() }, ...demoPayload.feed] };
    applyPayload(fallback, true, true);
  }
}

function applyPayload(payload, demo, errorMode = false) {
  state.usingDemo = demo;
  state.lastPayload = payload;
  renderMetrics(payload);
  renderTrips(payload.veiculos || []);
  renderAlerts(payload.alertas || []);
  renderFeed(payload.feed || []);
  renderMap(payload.veiculos || []);
  $("#mapBadge").textContent = errorMode ? "Fallback" : demo ? "Demo" : "Real";
  $("#mapBadge").className = `badge ${errorMode ? "error" : demo ? "demo" : "real"}`;
}

function renderMetrics(payload) {
  const indicadores = payload.indicadores || {};
  $("#metricTrips").textContent = indicadores.viagensAtivas || 0;
  $("#metricVehicles").textContent = indicadores.veiculosEmRota || 0;
  $("#metricAlerts").textContent = indicadores.alertasAtivos || 0;
  $("#metricGps").textContent = indicadores.gpsSemAtualizacao || 0;
  $("#metricUpdated").textContent = formatTime(payload.atualizado_em || new Date().toISOString());
}

function renderTrips(vehicles) {
  $("#tripCount").textContent = vehicles.length;
  $("#activeTrips").innerHTML = vehicles.length ? vehicles.map((item) => `
    <article class="item ${colorClass(item.cor_status)}">
      <strong>${item.prefixo || item.veiculo_id || "Veiculo"} - ${item.placa || "sem placa"}</strong>
      <span>${item.origem || "Origem"} para ${item.destino || "Destino"}</span>
      <small>${item.motorista || "Motorista"} | ${item.status_viagem || "status"} | ${item.velocidade ?? "--"} km/h</small>
      <small>Passageiros: ${item.passageiros || 0} | Ultimo GPS: ${formatTime(item.ultima_atualizacao)}</small>
    </article>
  `).join("") : emptyItem("Nenhuma viagem ativa", "Aguardando GPS real ou modo demo.");
}

function renderAlerts(alerts) {
  $("#alertCount").textContent = alerts.length;
  $("#alertsList").innerHTML = alerts.length ? alerts.map((item) => `
    <article class="item ${alertClass(item.tipo)}">
      <strong>${item.tipo || "ALERTA"}</strong>
      <span>${item.descricao || "Alerta operacional"}</span>
      <small>${item.viagem_id || "sem viagem"} | ${formatTime(item.created_at || item.criadoEm)}</small>
    </article>
  `).join("") : emptyItem("Sem alertas ativos", "Operacao dentro dos parametros.");
}

function renderFeed(feed) {
  $("#feedCount").textContent = feed.length;
  $("#feedList").innerHTML = feed.length ? feed.map((item) => `
    <li>
      <small>${formatTime(item.dataHora || item.created_at || item.criadoEm)} | ${item.viagem_id || "geral"}</small>
      <strong>${item.tipo || "EVENTO"}</strong> - ${item.descricao || "Evento recebido"}
    </li>
  `).join("") : "<li><small>--:--</small>Aguardando eventos.</li>";
}

function renderMap(vehicles) {
  if (!state.map) return;
  const visibleIds = new Set();
  const points = [];

  for (const vehicle of vehicles) {
    if (vehicle.latitude === null || vehicle.longitude === null || vehicle.latitude === undefined || vehicle.longitude === undefined) continue;
    const id = vehicle.veiculo_id || vehicle.viagem_id;
    visibleIds.add(id);
    const latLng = [Number(vehicle.latitude), Number(vehicle.longitude)];
    points.push(latLng);
    const marker = state.markers.get(id);
    if (marker) {
      marker.setLatLng(latLng);
      marker.setIcon(markerIcon(vehicle));
      marker.bindPopup(popupHtml(vehicle));
    } else {
      state.markers.set(id, L.marker(latLng, { icon: markerIcon(vehicle) }).addTo(state.map).bindPopup(popupHtml(vehicle)));
    }
  }

  for (const [id, marker] of state.markers.entries()) {
    if (!visibleIds.has(id)) {
      state.map.removeLayer(marker);
      state.markers.delete(id);
    }
  }

  if (state.routeLine) state.map.removeLayer(state.routeLine);
  if (points.length > 1) state.routeLine = L.polyline(points, { color: "#c8a84d", weight: 4, opacity: 0.85 }).addTo(state.map);
  if (points.length) state.map.fitBounds(L.latLngBounds(points), { padding: [42, 42], maxZoom: 14 });
}

function markerIcon(vehicle) {
  const status = vehicle.cor_status || "CINZA";
  return L.divIcon({
    className: "",
    html: `<div class="vehicle-marker marker-${status}">${escapeHtml(vehicle.prefixo || "V")}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
}

function popupHtml(vehicle) {
  return `
    <strong>${escapeHtml(vehicle.prefixo || "Veiculo")}</strong><br>
    Placa: ${escapeHtml(vehicle.placa || "--")}<br>
    Motorista: ${escapeHtml(vehicle.motorista || "--")}<br>
    Viagem: ${escapeHtml(vehicle.viagem_id || "--")}<br>
    Velocidade: ${vehicle.velocidade ?? "--"} km/h<br>
    Status: ${escapeHtml(vehicle.status_viagem || "--")}
  `;
}

function emptyItem(title, detail) {
  return `<article class="item gray"><strong>${title}</strong><span>${detail}</span></article>`;
}

function colorClass(status) {
  const map = { VERMELHO: "red", LARANJA: "orange", AMARELO: "yellow", VERDE: "green", CINZA: "gray" };
  return map[status] || "";
}

function alertClass(type) {
  if (type === "VELOCIDADE_ACIMA_LIMITE") return "orange";
  if (type === "GPS_SEM_ATUALIZACAO" || type === "OCORRENCIA") return "red";
  if (type === "VEICULO_PARADO" || type === "ESPERA_PROLONGADA") return "yellow";
  return "";
}

function formatTime(value) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

$("#demoToggle").addEventListener("change", fetchLiveMap);
initMap();
fetchLiveMap();
window.setInterval(fetchLiveMap, pollMs);
