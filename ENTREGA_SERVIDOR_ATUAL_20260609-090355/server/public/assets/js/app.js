const gpsStops = { origem: 0, saida: 3, intermediario: 6, proximo: 11, destino: 14 };
const demoData = {
  empresa: "Andrade Gestão em Saúde",
  sistema: "Painel Logístico",
  municipio: "São José do Sul",
  viagem: { id: "VIA-SJS-0001", origem: "Centro de Saúde / UBS São José do Sul", destino: "Hospital Montenegro", km: 42, tempo: "58 min" },
  veiculo: { nome: "Van Saúde 01", placa: "LOG-2045", prefixo: "SMS-01", capacidade: 7 },
  motorista: { nome: "João Santos", cnh: "Válida" },
  rota: [
    { lat: -29.5448, lng: -51.4827, label: "UBS São José do Sul" },
    { lat: -29.5482, lng: -51.4814, label: "Saída da UBS" },
    { lat: -29.5528, lng: -51.4796, label: "Acesso municipal" },
    { lat: -29.5588, lng: -51.4778, label: "Saída do município" },
    { lat: -29.5668, lng: -51.4762, label: "Estrada municipal" },
    { lat: -29.5756, lng: -51.4744, label: "Trecho rural" },
    { lat: -29.5865, lng: -51.4722, label: "Trecho intermediário" },
    { lat: -29.5988, lng: -51.4705, label: "Acesso principal" },
    { lat: -29.6125, lng: -51.4688, label: "Em deslocamento" },
    { lat: -29.6262, lng: -51.4673, label: "Trecho rodoviário" },
    { lat: -29.6405, lng: -51.4658, label: "Rumo a Montenegro" },
    { lat: -29.655, lng: -51.4646, label: "Próximo a Montenegro" },
    { lat: -29.6695, lng: -51.4632, label: "Acesso urbano" },
    { lat: -29.6808, lng: -51.4621, label: "Entrada de Montenegro" },
    { lat: -29.6887, lng: -51.461, label: "Hospital Montenegro" }
  ],
  grupos: [
    { paciente: "Maria da Silva", acompanhante: "José da Silva", motivo: "Consulta hospitalar" },
    { paciente: "Ana Souza", acompanhante: "Pedro Souza", motivo: "Exame agendado" }
  ],
  checklist: ["Documentação do veículo", "Nível de combustível", "Pneus e estepe", "Cinto de segurança", "Limpeza e acessibilidade"],
  eventos: [
    ["SISTEMA", "Viagem criada na plataforma.", "Programada"],
    ["DESPACHO", "Dados enviados ao app do motorista.", "Despachada"],
    ["DESPACHO", "Motorista João Santos confirmou recebimento.", "Confirmada"],
    ["GPS", "Van LOG-2045 posicionada na UBS São José do Sul.", "Posicionada", gpsStops.origem],
    ["CHECKLIST", "Checklist de saída iniciado.", "Preparação"],
    ["CHECKLIST", "Checklist aprovado.", "Pronta para saída"],
    ["EMBARQUE", "Maria da Silva embarcou.", "Embarque", null, "Maria da Silva"],
    ["EMBARQUE", "José da Silva embarcou como acompanhante.", "Embarque", null, "José da Silva"],
    ["EMBARQUE", "Ana Souza embarcou.", "Embarque", null, "Ana Souza"],
    ["EMBARQUE", "Pedro Souza embarcou como acompanhante.", "Embarque", null, "Pedro Souza"],
    ["DESPACHO", "Viagem iniciada.", "Em deslocamento"],
    ["GPS", "GPS recebido: UBS São José do Sul.", "Em deslocamento", gpsStops.origem],
    ["GPS", "GPS recebido: saída do município.", "Em deslocamento", gpsStops.saida],
    ["GPS", "GPS recebido: trecho intermediário.", "Em deslocamento", gpsStops.intermediario],
    ["OCORRÊNCIA", "Ocorrência: atraso leve por trânsito.", "Atraso leve"],
    ["MENSAGEM", "Aviso da central enviado ao motorista.", "Atraso comunicado"],
    ["MENSAGEM", "Mensagem recebida do motorista: Ciente, seguindo rota principal.", "Em deslocamento"],
    ["GPS", "GPS recebido: próximo a Montenegro.", "Próximo ao destino", gpsStops.proximo],
    ["GPS", "Chegada ao Hospital Montenegro.", "No destino", gpsStops.destino],
    ["FINALIZAÇÃO", "Maria da Silva desembarcou.", "Desembarque", null, "Maria da Silva"],
    ["FINALIZAÇÃO", "José da Silva desembarcou.", "Desembarque", null, "José da Silva"],
    ["FINALIZAÇÃO", "Ana Souza desembarcou.", "Desembarque", null, "Ana Souza"],
    ["FINALIZAÇÃO", "Pedro Souza desembarcou.", "Desembarque", null, "Pedro Souza"],
    ["FINALIZAÇÃO", "Viagem concluída.", "Concluída"],
    ["SINCRONIZAÇÃO", "Sincronização concluída.", "Concluída"]
  ]
};
const state = {
  currentIndex: -1, running: false, timer: null, receivedEvents: [], messages: [], incidents: [], alerts: [],
  passengerStatus: { "Maria da Silva": "aguardando", "José da Silva": "aguardando", "Ana Souza": "aguardando", "Pedro Souza": "aguardando" },
  lastGpsIndex: null, vehicleRouteIndex: 0, lastGpsAt: null, lastSyncAt: null, syncedCount: 0, checklistStarted: false, checklistDone: false,
  tripStatus: "Programada", vehicleStatus: "Aguardando despacho"
};
const apiState = { usingFallback: true, lastApiLoad: null, activeTripId: null, dashboard: null };
const apiRoot = (window.PAINEL_API_ROOT || "/api").replace(/\/$/, "");
const realApiEndpoints = [
  "/api/dashboard/resumo-dia",
  "/api/viagens",
  "/api/alertas",
  "/api/viagens/{id}/eventos",
  "/api/viagens/{id}/mensagens",
  "/api/viagens/{id}/localizacoes"
];
const $ = (selector) => document.querySelector(selector);
let map = null, vanMarker = null, leafletAvailable = false, vehicleAnimation = null;
const simulationIntervalMs = Math.round(180000 / (demoData.eventos.length - 1));
function updateClock() { $("#currentTime").textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
function formatTime(date) { return date ? new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Não realizada"; }
async function apiGet(path) {
  const response = await fetch(`${apiRoot}${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`API indisponível: ${path}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || `Resposta inválida: ${path}`);
  return payload.data;
}
function normalizeApiEvent(item) {
  return {
    category: item.categoria || "SISTEMA",
    text: item.descricao || item.text || "Evento recebido pela API.",
    status: item.status || state.tripStatus,
    receivedAt: item.criado_em || item.created_at || new Date().toISOString()
  };
}
function normalizeApiMessage(item) {
  return { author: item.autor || "Central", text: item.mensagem || "", createdAt: item.criado_em || new Date().toISOString() };
}
function normalizeApiAlert(item) {
  return {
    title: item.titulo || "Ocorrência",
    detail: item.detalhe || "",
    severity: item.gravidade || "Média",
    status: item.status || "Em acompanhamento",
    createdAt: item.criado_em || new Date().toISOString()
  };
}
function applyApiLocations(localizacoes) {
  if (!Array.isArray(localizacoes) || !localizacoes.length) return;
  const realRoute = localizacoes.map((item) => ({ lat: Number(item.latitude), lng: Number(item.longitude), label: item.rotulo || "Localização recebida" }));
  demoData.rota = realRoute.length > 1 ? realRoute : [realRoute[0], ...demoData.rota.slice(1)];
  state.lastGpsIndex = realRoute.length > 1 ? demoData.rota.length - 1 : 0;
  state.vehicleRouteIndex = state.lastGpsIndex;
  state.lastGpsAt = localizacoes[localizacoes.length - 1].registrado_em || new Date().toISOString();
  if (leafletAvailable && vanMarker) vanMarker.setLatLng([demoData.rota[state.vehicleRouteIndex].lat, demoData.rota[state.vehicleRouteIndex].lng]);
}
async function loadApiData() {
  try {
    const dashboard = await apiGet("/dashboard/resumo-dia");
    const viagens = await apiGet("/viagens");
    const viagem = dashboard.viagem_ativa || (viagens.viagens || [])[0];
    const viagemId = viagem ? Number(viagem.id) : null;
    const [alertas, eventos, mensagens, localizacoes] = await Promise.all([
      apiGet("/alertas"),
      viagemId ? apiGet(`/viagens/${viagemId}/eventos`) : Promise.resolve({ eventos: [] }),
      viagemId ? apiGet(`/viagens/${viagemId}/mensagens`) : Promise.resolve({ mensagens: [] }),
      viagemId ? apiGet(`/viagens/${viagemId}/localizacoes`) : Promise.resolve({ localizacoes: [] })
    ]);

    apiState.usingFallback = false;
    apiState.lastApiLoad = new Date().toISOString();
    apiState.activeTripId = viagemId;
    apiState.dashboard = dashboard;

    if (viagem) {
      demoData.viagem.id = viagem.codigo || demoData.viagem.id;
      demoData.viagem.origem = viagem.origem || demoData.viagem.origem;
      demoData.viagem.destino = viagem.destino || demoData.viagem.destino;
      demoData.viagem.km = Number(viagem.km_estimado || demoData.viagem.km);
      demoData.viagem.tempo = viagem.tempo_estimado || demoData.viagem.tempo;
      state.tripStatus = viagem.status || state.tripStatus;
    }

    if (Array.isArray(eventos.eventos) && eventos.eventos.length) state.receivedEvents = eventos.eventos.map(normalizeApiEvent);
    if (Array.isArray(mensagens.mensagens) && mensagens.mensagens.length) state.messages = mensagens.mensagens.map(normalizeApiMessage);
    if (Array.isArray(alertas.alertas)) state.incidents = alertas.alertas.map(normalizeApiAlert);
    applyApiLocations(localizacoes.localizacoes || []);
    render();
  } catch (error) {
    // fallback demonstrativo: enquanto a API Node local não estiver disponível,
    // a página mantém os dados visuais aprovados da demo e a simulação local.
    apiState.usingFallback = true;
    console.info("Painel Logístico operando com fallback demonstrativo.", error.message);
    render();
  }
}
function initMap() {
  if (!window.L) { $("#map").hidden = true; $("#mapFallback").hidden = false; $("#mapMode").textContent = "Modo demonstração"; $("#mapMode").className = "badge warning"; return; }
  leafletAvailable = true;
  map = L.map("map", { zoomControl: true, scrollWheelZoom: false });
  const route = demoData.rota.map((point) => [point.lat, point.lng]);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap" }).addTo(map);
  L.marker(route[0]).addTo(map).bindPopup("<strong>Origem</strong><br>UBS São José do Sul");
  L.marker(route[route.length - 1]).addTo(map).bindPopup("<strong>Destino</strong><br>Hospital Montenegro");
  const routeLine = L.polyline(route, { color: "#c8a84d", weight: 5, opacity: 0.92 }).addTo(map);
  const vanIcon = L.divIcon({ className: "van-map-icon", html: `<div class="van-icon-body"><span>🚐</span></div>`, iconSize: [42, 42], iconAnchor: [21, 21], popupAnchor: [0, -18] });
  vanMarker = L.marker(route[0], { icon: vanIcon }).addTo(map);
  map.fitBounds(routeLine.getBounds(), { padding: [35, 35] });
  updateVehiclePopup();
}
function boardedCount() { return Object.values(state.passengerStatus).filter((status) => status === "embarcado").length; }
function handledCount() { return Object.values(state.passengerStatus).filter((status) => status !== "aguardando").length; }
function transported(names) { return names.filter((name) => state.passengerStatus[name] === "desembarcado").length; }
function pendingEvents() { return Math.max(0, state.receivedEvents.length - state.syncedCount); }
function routeProgress() { return demoData.rota.length > 1 ? state.vehicleRouteIndex / (demoData.rota.length - 1) : 0; }
function updateVehiclePopup() {
  if (!vanMarker) return;
  const gps = state.lastGpsIndex === null ? demoData.rota[0] : demoData.rota[state.lastGpsIndex];
  vanMarker.bindPopup(`<strong>Van Saúde 01</strong><br>Placa LOG-2045<br>Motorista João Santos<br>Passageiros embarcados: ${boardedCount()}<br>Status: ${state.vehicleStatus}<br>Último GPS: ${state.lastGpsAt ? formatTime(state.lastGpsAt) : gps.label}<br>Progresso da rota: ${Math.round(routeProgress() * 100)}%`);
}
function moveVehicleVisual(targetIndex, updateGps) {
  const safeTarget = Math.max(0, Math.min(demoData.rota.length - 1, targetIndex));
  const start = state.vehicleRouteIndex || 0;
  const direction = safeTarget >= start ? 1 : -1;
  const segment = [];
  for (let index = start; direction > 0 ? index <= safeTarget : index >= safeTarget; index += direction) segment.push({ index, point: demoData.rota[index] });
  window.clearInterval(vehicleAnimation);
  let step = 0;
  const applyPoint = (current) => {
    state.vehicleRouteIndex = current.index;
    if (leafletAvailable && vanMarker) vanMarker.setLatLng([current.point.lat, current.point.lng]);
    else $("#fallbackVan").style.left = `${8 + (current.index / (demoData.rota.length - 1)) * 76}%`;
    if (updateGps && current.index === safeTarget) { state.lastGpsIndex = safeTarget; state.lastGpsAt = new Date().toISOString(); }
    updateVehiclePopup();
  };
  const tick = () => { applyPoint(segment[Math.min(step, segment.length - 1)]); step += 1; if (step >= segment.length) window.clearInterval(vehicleAnimation); };
  tick();
  if (segment.length > 1) vehicleAnimation = window.setInterval(tick, 700);
}
function addIncident(title, detail, severity = "Média") { state.incidents.push({ title, detail, severity, status: "Em acompanhamento", createdAt: new Date().toISOString() }); }
function addMessage(author, text) { state.messages.push({ author, text, createdAt: new Date().toISOString() }); }
function applyEvent(raw) {
  const event = { category: raw[0], text: raw[1], status: raw[2], gpsIndex: raw[3], passenger: raw[4], receivedAt: new Date().toISOString() };
  state.receivedEvents.push(event);
  state.tripStatus = event.status || state.tripStatus;
  if (event.category === "GPS" || event.text.includes("Viagem iniciada")) state.vehicleStatus = "Em deslocamento";
  if (event.text.includes("posicionada")) state.vehicleStatus = "Posicionada na origem";
  if (event.text.includes("concluída")) state.vehicleStatus = "Viagem concluída";
  if (event.text.includes("Checklist de saída iniciado")) state.checklistStarted = true;
  if (event.text.includes("Checklist aprovado")) { state.checklistDone = true; addIncident("Checklist aprovado", "Checklist de saída aprovado para a viagem.", "Baixa"); }
  if (event.gpsIndex !== undefined && event.gpsIndex !== null) { moveVehicleVisual(event.gpsIndex, true); addIncident("GPS recebido", event.text, "Baixa"); }
  if (event.category === "EMBARQUE") state.passengerStatus[event.passenger] = "embarcado";
  if (event.category === "FINALIZAÇÃO" && event.passenger) state.passengerStatus[event.passenger] = "desembarcado";
  if (event.category === "OCORRÊNCIA") { addIncident("Atraso leve por trânsito", "Atraso leve registrado no trecho intermediário.", "Média"); addIncident("Intercorrência em rota", "Parada rápida para verificação de bem-estar de passageiro. Rota retomada.", "Média"); }
  if (event.text.includes("Viagem iniciada")) addMessage("Central", "Motorista, confirmar saída da UBS.");
  if (event.text.includes("Aviso da central")) addMessage("Central", "Manter rota principal e informar chegada.");
  if (event.text.includes("Mensagem recebida")) addMessage("João Santos", "Ciente, seguindo rota.");
  if (event.text.includes("confirmou recebimento")) addMessage("João Santos", "Saída confirmada.");
  if (event.category === "SINCRONIZAÇÃO") { state.lastSyncAt = new Date().toISOString(); state.syncedCount = state.receivedEvents.length; }
}
function nextEvent() {
  if (state.currentIndex >= demoData.eventos.length - 1) { pauseSimulation(); return; }
  state.currentIndex += 1;
  const raw = demoData.eventos[state.currentIndex];
  applyEvent(raw);
  if ((raw[3] === undefined || raw[3] === null) && state.currentIndex >= 10) moveVehicleVisual(Math.round((state.currentIndex / (demoData.eventos.length - 1)) * (demoData.rota.length - 1)), false);
  render();
}
function startSimulation() { if (state.running) return; state.running = true; render(); if (state.currentIndex < 0) nextEvent(); state.timer = window.setInterval(nextEvent, simulationIntervalMs); }
function pauseSimulation() { state.running = false; window.clearInterval(state.timer); state.timer = null; render(); }
function resetSimulation() { window.location.reload(); }
async function syncNow() {
  try {
    await apiGet("/status");
    await loadApiData();
    state.lastSyncAt = new Date().toISOString();
    state.syncedCount = state.receivedEvents.length;
    addIncident("Sincronização concluída", "Dados reais carregados pela API.", "Baixa");
  } catch (error) {
    // fallback demonstrativo para manter a operação visual funcionando sem banco configurado.
    state.lastSyncAt = new Date().toISOString();
    state.syncedCount = state.receivedEvents.length;
    addIncident("Sincronização em fallback", "API indisponível; simulação local mantida até iniciar o servidor Node.", "Baixa");
  }
  render();
}
function simulateIncident() { addIncident("Veículo parado para verificação", "Motorista informou parada breve de segurança na rota.", "Média"); render(); }
function alertDriver() { addMessage("Central", "Contato aberto com João Santos."); addIncident("Motorista selecionado", "João Santos está online para comunicação com a base.", "Baixa"); render(); }
function exportJson() {
  const payload = { empresa: demoData.empresa, sistema: demoData.sistema, municipio: demoData.municipio, viagem: demoData.viagem, motorista: demoData.motorista, veiculo: demoData.veiculo, passageiros: state.passengerStatus, acompanhantes: ["José da Silva", "Pedro Souza"], eventos: state.receivedEvents, mensagens: state.messages, ocorrencias: state.incidents, localizacaoAtual: demoData.rota[state.vehicleRouteIndex], statusFinal: state.tripStatus };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = "painel-logistico-exportacao.json"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
}
function renderPassengers() {
  $("#passengerList").innerHTML = demoData.grupos.map((group) => `<article class="passenger-group"><div class="avatar">P</div><div><strong>Paciente: ${group.paciente}</strong><span>${group.motivo} - ${state.passengerStatus[group.paciente]}</span></div><div class="avatar companion">A</div><div><strong>Acompanhante: ${group.acompanhante}</strong><span>Vinculado à ${group.paciente} - ${state.passengerStatus[group.acompanhante]}</span></div></article>`).join("");
}
function renderEvents() { $("#eventCounter").textContent = `${state.receivedEvents.length}/${demoData.eventos.length}`; $("#eventList").innerHTML = state.receivedEvents.map((event, i) => `<li class="${i === state.receivedEvents.length - 1 ? "active new-event" : ""}"><span class="cat ${event.category.toLowerCase()}">[${event.category}]</span><small>${formatTime(event.receivedAt)}</small>${event.text}</li>`).join(""); $("#eventList").scrollTop = $("#eventList").scrollHeight; }
function renderIncidents() { $("#incidentCount").textContent = state.incidents.length; $("#incidentList").innerHTML = state.incidents.length ? state.incidents.map((item) => `<article class="stack-item"><strong>${item.title}</strong><span>${formatTime(item.createdAt)} · Gravidade: ${item.severity} · ${item.status}</span><p>${item.detail}</p><div class="mini-actions"><button>Marcar como tratado</button><button>Ver detalhes</button></div></article>`).join("") : `<article class="stack-item warning"><strong>Nenhuma ocorrência ativa</strong><span>Operação aguardando dados recebidos.</span></article>`; }
function renderMessages() { $("#messageList").innerHTML = state.messages.length ? state.messages.map((msg) => `<article class="${msg.author === "Central" ? "base" : "driver"}"><strong>${msg.author}</strong><span>${msg.text}</span><small>${formatTime(msg.createdAt)}</small></article>`).join("") : `<article class="base"><strong>Central</strong><span>Aguardando comunicação com motorista.</span></article>`; }
function renderDispatch() { const steps = ["Criada", "Despachada para motorista", "Recebida no app", "Confirmada pelo motorista", "Checklist aprovado", "Viagem iniciada"]; $("#dispatchList").innerHTML = steps.map((step, i) => `<div class="${state.currentIndex >= i ? "done" : ""}"><strong>${step}</strong><span>${state.currentIndex >= i ? "Registrado" : "Aguardando"}</span></div>`).join(""); }
function renderChecklist() { $("#checklistBadge").textContent = state.checklistDone ? "Aprovado" : state.checklistStarted ? "Em andamento" : "Pendente"; $("#driverChecklist").textContent = state.checklistDone ? "Aprovado" : "Pendente"; $("#checklistList").innerHTML = demoData.checklist.map((item) => `<article class="check-item ${state.checklistDone ? "done" : ""}"><strong>${item}</strong><span>${state.checklistDone ? "Aprovado" : state.checklistStarted ? "Em verificação" : "Pendente"}</span></article>`).join(""); }
function droppedCount() { return Object.values(state.passengerStatus).filter((status) => status === "desembarcado").length; }
function renderOverview() {
  const latest = state.receivedEvents[state.receivedEvents.length - 1];
  const progress = Math.round(routeProgress() * 100);
  const pending = pendingEvents();
  const syncs = state.lastSyncAt ? 1 : 0;
  const completed = state.tripStatus === "Concluída" ? 1 : 0;
  const dashboard = apiState.dashboard || {};
  if ($("#overviewStatus")) {
    $("#overviewStatus").textContent = apiState.usingFallback ? "Fallback demonstrativo" : state.running ? "Recebendo dados" : "Dados reais";
    $("#overviewOngoing").textContent = dashboard.viagensEmAndamento ?? (completed ? 0 : 1);
    $("#overviewCompleted").textContent = dashboard.viagensConcluidas ?? completed;
    $("#overviewIncidents").textContent = dashboard.ocorrenciasAbertas ?? state.incidents.length;
    $("#overviewPending").textContent = dashboard.sincronizacoesPendentes ?? pending;
    $("#overviewTripStatus").textContent = state.tripStatus;
    $("#overviewProgress").textContent = `${progress}%`;
    $("#overviewLastUpdate").textContent = latest ? formatTime(latest.receivedAt) : "Aguardando dados";
    $("#overviewBoarded").textContent = dashboard.pacientesEmbarcados ?? boardedCount();
    $("#overviewDropped").textContent = droppedCount();
    $("#overviewEvents").textContent = dashboard.eventosRecebidos ?? state.receivedEvents.length;
    $("#overviewSyncs").textContent = dashboard.sincronizacoesPendentes ?? syncs;
    $("#overviewIncidentTotal").textContent = dashboard.ocorrenciasAbertas ?? state.incidents.length;
    $("#dayTripStatus").textContent = state.tripStatus;
    $("#dayTripUpdate").textContent = latest ? formatTime(latest.receivedAt) : "Aguardando";
  }
}
function renderMetrics() {
  const patients = transported(["Maria da Silva", "Ana Souza"]), companions = transported(["José da Silva", "Pedro Souza"]), occupied = boardedCount();
  const dashboard = apiState.dashboard || {};
  $("#metricPatients").textContent = dashboard.pacientesTransportados ?? patients; $("#metricCompanions").textContent = dashboard.acompanhantesTransportados ?? companions; $("#metricPassengers").textContent = dashboard.passageirosPrevistos ?? handledCount(); $("#metricIncidents").textContent = dashboard.ocorrenciasAbertas ?? state.incidents.length;
  $("#vehicleOccupation").textContent = `${occupied}/7`; $("#occupationBadge").textContent = `${occupied}/7`; $("#occupiedSeats").textContent = occupied; $("#freeSeats").textContent = 7 - occupied; $("#occupancyFill").style.width = `${(occupied / 7) * 100}%`;
  $("#passengerBadge").textContent = `${occupied} embarcados`; $("#reportPatients").textContent = patients; $("#reportCompanions").textContent = companions; $("#reportIncidents").textContent = state.incidents.length; $("#reportEvents").textContent = state.receivedEvents.length; $("#reportTrips").textContent = state.tripStatus === "Concluída" ? 1 : 0;
}
function renderStatus() {
  const latest = state.receivedEvents[state.receivedEvents.length - 1], gps = state.lastGpsIndex === null ? null : demoData.rota[state.lastGpsIndex], progress = Math.round(routeProgress() * 100);
  $("#progressText").textContent = `${progress}%`; $("#progressBar").style.width = `${progress}%`; $("#tripStatus").textContent = state.tripStatus; $("#tripTableStatus").textContent = state.tripStatus; $("#tripBadge").textContent = state.tripStatus;
  $("#vehicleStatus").textContent = state.vehicleStatus; $("#currentEvent").textContent = latest ? latest.text : "Aguardando início"; $("#lastGps").textContent = gps ? `${gps.label} (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)})` : "Sem posição recebida"; $("#tripLastGps").textContent = $("#lastGps").textContent; $("#driverGps").textContent = gps ? "há poucos segundos" : "Aguardando"; $("#gpsStatus").textContent = gps ? "Recebendo dados" : "Aguardando dados";
  $("#simulationState").textContent = state.running ? "Recebendo dados" : state.currentIndex >= 0 ? "Pausada" : "Aguardando"; $("#receivingIndicator").textContent = state.running ? "Recebendo dados do app motorista..." : "Aguardando dados do app motorista"; $("#lastUpdate").textContent = latest ? `Última atualização: ${formatTime(latest.receivedAt)}` : "Última atualização: aguardando dados";
  const pending = pendingEvents(); $("#syncStatusBadge").textContent = state.lastSyncAt && pending === 0 ? "Concluído" : state.running ? "Sincronizando" : "Online"; $("#syncLast").textContent = formatTime(state.lastSyncAt); $("#syncPending").textContent = pending; $("#syncQueue").textContent = pending; $("#syncReceived").textContent = state.receivedEvents.length; updateVehiclePopup();
}
function render() { renderOverview(); renderMetrics(); renderPassengers(); renderEvents(); renderIncidents(); renderMessages(); renderDispatch(); renderChecklist(); renderStatus(); }
function bindControls() { $("#startBtn").addEventListener("click", startSimulation); $("#pauseBtn").addEventListener("click", pauseSimulation); $("#nextBtn").addEventListener("click", () => { pauseSimulation(); nextEvent(); }); $("#resetBtn").addEventListener("click", resetSimulation); $("#syncBtn").addEventListener("click", syncNow); $("#refreshBtn").addEventListener("click", loadApiData); $("#incidentBtn").addEventListener("click", simulateIncident); $("#exportBtn").addEventListener("click", exportJson); $("#driverAlertBtn").addEventListener("click", alertDriver); $("#overviewStartBtn").addEventListener("click", startSimulation); $("#overviewNextBtn").addEventListener("click", () => { pauseSimulation(); nextEvent(); }); $("#overviewSyncBtn").addEventListener("click", syncNow); $("#overviewExportBtn").addEventListener("click", exportJson); }
updateClock(); window.setInterval(updateClock, 30000); initMap(); bindControls(); render(); loadApiData(); window.setInterval(loadApiData, 5000);
