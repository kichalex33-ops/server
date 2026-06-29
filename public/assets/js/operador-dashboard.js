let operatorState = {
  drivers: [],
  vehicles: [],
  trips: [],
  alerts: [],
  checklists: [],
  occurrences: [],
  destinations: [],
  map: {},
};

function requireOperatorSession() {
  const session = window.loadAuthSession ? window.loadAuthSession() : null;
  if (!session || !session.accessToken) {
    redirectToLogin("Sessão não encontrada. Faça login novamente.");
    return false;
  }
  const profile = String(session.usuario?.perfil || "").toUpperCase();
  if (!["OPERADOR", "ADMIN"].includes(profile)) {
    redirectToLogin("Este acesso é exclusivo do Painel Operador.");
    return false;
  }
  return true;
}

function redirectToLogin(message) {
  try {
    sessionStorage.removeItem("painel-logistico-auth");
    localStorage.removeItem("painel-logistico-auth");
    sessionStorage.setItem("painel-logistico-login-message", message || "Faça login novamente.");
  } catch (error) {
    // ignora falha de storage
  }
  window.location.href = "/homologacao/";
}

async function loadOperatorDashboard() {
  bindOperatorActions();
  if (!requireOperatorSession()) return;
  await refreshOperatorData();
}

function bindOperatorActions() {
  bindScreenNavigation();
  bindDriverTabs();
  bindDriverSecretReveal();
  bindOperatorMenu();
  bindDriverForm();
  bindTripForm();
  bindPatientForm();
  bindDestinationForm();
  bindVehicleForm();
  bindPassengerForm();
  bindOperatorAiActions();
  bindFloatingAiChat();
  bindAiShortcuts();
  bindReportActions();
  if (window.bindLogoutButtons) window.bindLogoutButtons();
  const refreshAll = document.querySelector("#refreshAllBtn");
  if (refreshAll && !refreshAll.dataset.bound) {
    refreshAll.dataset.bound = "true";
    refreshAll.addEventListener("click", () => refreshOperatorData().catch(showGlobalError));
  }
}

function bindScreenNavigation() {
  const links = document.querySelectorAll("[data-screen]");
  const panels = document.querySelectorAll("[data-screen-panel]");
  const titles = {
    agenda: ["Viagens Programadas", "Agenda operacional"],
    monitoring: ["Mapa e Monitoramento", "Frota e alertas em tempo real"],
    trips: ["Viagens do Dia", "Planejamento e acompanhamento"],
    registrations: ["Cadastros Operacionais", "Pacientes, destinos, veículos e passageiros"],
    drivers: ["Motoristas e Pareamento", "Equipe e aplicativo móvel"],
    ai: ["IA Operacional", "Resumo, riscos e apoio à decisão"]
  };
  const showScreen = (name) => {
    panels.forEach((panel) => {
      const active = panel.dataset.screenPanel === name;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    document.querySelectorAll(".side-nav [data-screen]").forEach((link) => {
      link.classList.toggle("active", link.dataset.screen === name && !link.dataset.driverTab);
    });
    setText("#screenTitle", titles[name]?.[0] || titles.agenda[0]);
    setText("#screenEyebrow", titles[name]?.[1] || titles.agenda[1]);
    document.body.classList.remove("operator-menu-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  links.forEach((link) => {
    if (link.dataset.screenBound) return;
    link.dataset.screenBound = "true";
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href") || "";
      const isInternalAnchor = href.startsWith("#");
      if (!isInternalAnchor) return;
      event.preventDefault();
      showScreen(link.dataset.screen);
      if (link.dataset.driverTab) showDriverTab(link.dataset.driverTab);
      const anchor = href;
      if (anchor && anchor !== "#" && anchor !== "#visao-geral") {
        window.setTimeout(() => document.querySelector(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
      }
    });
  });
  const date = document.querySelector("#currentDate");
  if (date) date.textContent = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const initialScreen = document.body?.dataset.initialScreen;
  const initialDriverTab = document.body?.dataset.initialDriverTab;
  if (initialScreen) showScreen(initialScreen);
  if (initialDriverTab) showDriverTab(initialDriverTab);
}

function bindDriverTabs() {
  document.querySelectorAll("[data-driver-panel]").forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => showDriverTab(button.dataset.driverPanel));
  });
}

function showDriverTab(name) {
  document.querySelectorAll("[data-driver-panel]").forEach((button) => button.classList.toggle("active", button.dataset.driverPanel === name));
  document.querySelectorAll("[data-driver-content]").forEach((panel) => {
    const active = panel.dataset.driverContent === name;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
}

function bindOperatorMenu() {
  const button = document.querySelector(".menu-button");
  const sideNav = document.querySelector(".side-nav");
  if (!button || !sideNav || button.dataset.bound === "true") return;
  button.dataset.bound = "true";
  const closeMenu = () => document.body.classList.remove("operator-menu-open");
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    document.body.classList.toggle("operator-menu-open");
  });
  document.addEventListener("click", (event) => {
    if (!document.body.classList.contains("operator-menu-open")) return;
    if (sideNav.contains(event.target) || button.contains(event.target)) return;
    closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  document.querySelectorAll(".side-nav a").forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });
}

async function refreshOperatorData() {
  showKpiSkeleton();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const [indicadores, viagensResponse, alertasResponse, checklistsResponse, ocorrenciasResponse, mapaResponse, motoristasResponse, veiculosResponse, pacientesResponse, passageirosResponse, destinosResponse, charts] = await Promise.all([
      safeApiJson("/indicadores/operador", {}, controller.signal),
      safeApiJson("/viagens", { viagens: [], items: [] }, controller.signal),
      safeApiJson("/alertas", { alertas: [], items: [] }, controller.signal),
      safeApiJson("/checklists", { checklists: [], items: [] }, controller.signal),
      safeApiJson("/ocorrencias", { ocorrencias: [], items: [] }, controller.signal),
      safeApiJson("/live-map", { veiculos: [], indicadores: {} }, controller.signal),
      safeApiJson("/motoristas", { motoristas: [], items: [] }, controller.signal),
      safeApiJson("/veiculos", { veiculos: [], items: [] }, controller.signal),
      safeApiJson("/pacientes", { pacientes: [], items: [] }, controller.signal),
      safeApiJson("/passageiros", { passageiros: [], items: [] }, controller.signal),
      safeApiJson("/destinos", { destinos: [], items: [] }, controller.signal),
      safeCharts(window.apiUrl("/graficos/viagens"), controller.signal),
    ]);

    const trips = viagensResponse.viagens || viagensResponse.items || [];
    const alerts = alertasResponse.alertas || alertasResponse.items || [];
    const checklists = checklistsResponse.checklists || checklistsResponse.items || [];
    const occurrences = ocorrenciasResponse.ocorrencias || ocorrenciasResponse.items || [];
    const vehiclesFromMap = mapaResponse.veiculos || mapaResponse.items || [];
    const drivers = motoristasResponse.motoristas || motoristasResponse.items || [];
    const vehicles = veiculosResponse.veiculos || veiculosResponse.items || [];
    const patients = pacientesResponse.pacientes || pacientesResponse.items || [];
    const passengers = passageirosResponse.passageiros || passageirosResponse.items || [];
    const destinations = destinosResponse.destinos || destinosResponse.items || [];

    operatorState = { drivers, vehicles, trips, alerts, checklists, occurrences, map: mapaResponse, patients, passengers, destinations };

    const kpis = indicadores.kpis || {};
    setText("#operatorSessionStatus", "Sessão ativa");
    setText("#kpiOngoing", kpis.viagensAtivas ?? trips.filter(isActiveTrip).length);
    setText("#kpiPending", trips.filter((item) => ["AGUARDANDO", "PROGRAMADA", "PENDENTE"].includes(String(item.status).toUpperCase())).length);
    setText("#kpiPassengers", vehiclesFromMap.reduce((total, item) => total + Number(item.passageiros || 0), 0));
    setText("#kpiDrivers", drivers.filter((item) => String(item.status).toLowerCase() === "ativo").length);
    setText("#kpiAlerts", alerts.filter(isOpenItem).length);
    setText("#kpiGps", mapaResponse.indicadores?.gpsSemAtualizacao || 0);
    setText("#checklistCount", checklists.length);
    setText("#occurrenceCount", occurrences.filter(isOpenItem).length);
    setText("#onlineVehicleCount", vehiclesFromMap.filter((item) => item.latitude != null && item.longitude != null).length);

    renderTrips(trips, drivers, vehicles);
    renderTripAgenda(trips, drivers, vehicles);
    renderTripOperationalInsights(trips, drivers, vehicles, vehiclesFromMap);
    renderAlerts(alerts);
    renderOperatorFeed(indicadores.feed?.ultimosEventos || []);
    renderDrivers(drivers);
    renderVehicles(vehicles);
    fillTripSelects(drivers, vehicles);
    fillPassengerSelects(trips, patients);
    fillDestinationOptions(destinations);
    renderPatients(patients);
    renderPassengers(passengers, trips);
    renderDestinations(destinations);
    fillOperatorAiTripSelect(trips);
    renderCharts(charts);
  } finally {
    window.clearTimeout(timeout);
  }
}

async function apiJson(path, signal) {
  const response = await window.authFetch(window.apiUrl(path), { headers: { Accept: "application/json" }, signal });
  let body = {};
  try {
    body = await response.json();
  } catch (error) {
    body = {};
  }
  if (response.status === 401 || response.status === 403 || /token|autentica/i.test(String(body.error || ""))) {
    redirectToLogin(body.error || "Token inválido ou expirado.");
    throw new Error(body.error || "Token inválido ou expirado.");
  }
  if (!response.ok || body.ok !== true) throw new Error(body.error || `Falha ao carregar ${path}.`);
  return body.data || {};
}

async function safeApiJson(path, fallback, signal) {
  try {
    return await apiJson(path, signal);
  } catch (error) {
    if (/Token inválido|Autentica|Acesso negado/i.test(error.message)) throw error;
    showSmallError(path, error.message);
    return fallback;
  }
}

async function safeCharts(url, signal) {
  try {
    return await fetchChartData(url, { signal });
  } catch (error) {
    showSmallError("/graficos/viagens", error.message);
    return [];
  }
}


function showKpiSkeleton() {
  document.querySelectorAll(".kpi-card strong").forEach((el) => {
    el.innerHTML = '<span class="skeleton" aria-hidden="true"></span>';
  });
}

function emptyTableRow(colspan, title, subtitle = "") {
  return `<tr class="empty-row"><td colspan="${colspan}"><div class="empty-state"><span class="empty-icon" aria-hidden="true"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M7 13h10"/></svg></span><p>${escapeText(title)}</p>${subtitle ? `<small>${escapeText(subtitle)}</small>` : ""}</div></td></tr>`;
}

function renderTrips(trips, drivers, vehicles) {
  const driverNames = new Map(drivers.map((driver) => [String(driver.id), driver.nome]));
  const vehicleNames = new Map(vehicles.map((vehicle) => [String(vehicle.id), vehicle.prefixo || vehicle.placa || vehicle.nome || vehicle.id]));
  const target = document.querySelector("#operatorTrips");
  if (!target) return;
  target.innerHTML = trips.length ? trips.slice(0, 50).map((trip) => `<tr>
    <td><strong>${escapeText(trip.codigo || trip.id)}</strong></td>
    <td>${escapeText(formatTripDate(trip.data_viagem || trip.dataViagem))}</td>
    <td>${escapeText(formatTripTime(getTripField(trip, 'hora_consulta') || getTripField(trip, 'horario_consulta') || trip.hora_saida || trip.hora_retorno))}</td>
    <td>${escapeText(trip.origem || "--")}</td><td>${escapeText(trip.destino || "--")}</td>
    <td>${escapeText(driverNames.get(String(trip.motorista_id)) || "A definir")}</td><td>${escapeText(vehicleNames.get(String(trip.veiculo_id)) || trip.veiculo_id || "A definir")}</td>
    <td><span class="status info">${escapeText(trip.status || "AGUARDANDO")}</span></td>
  </tr>`).join("") : emptyTableRow(8, "Nenhuma viagem cadastrada", "Crie uma viagem pela aba de cadastro.");
}

function renderTripAgenda(trips, drivers, vehicles) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const datedTrips = trips.map((trip) => ({ trip, date: parseTripDate(trip.data_viagem || trip.dataViagem) })).filter((item) => item.date);
  const todayTrips = datedTrips.filter((item) => item.date.getTime() === today.getTime()).map((item) => item.trip);
  const weekTrips = datedTrips.filter((item) => item.date > today && item.date <= weekEnd && !["CANCELADA", "CONCLUIDA", "FINALIZADA"].includes(String(item.trip.status || "").toUpperCase())).sort((a, b) => a.date - b.date).map((item) => item.trip);
  renderAgendaTable("#operatorTripsToday", "#todayTripsCount", todayTrips, drivers, vehicles, "Nenhuma viagem marcada para hoje.");
  renderAgendaTable("#operatorTripsWeek", "#weekTripsCount", weekTrips, drivers, vehicles, "Nenhuma viagem marcada para esta semana.");
}

function renderAgendaTable(tableSelector, countSelector, trips, drivers, vehicles, emptyMessage) {
  const target = document.querySelector(tableSelector);
  const driverNames = new Map(drivers.map((driver) => [String(driver.id), driver.nome]));
  const vehicleNames = new Map(vehicles.map((vehicle) => [String(vehicle.id), vehicle.placa || vehicle.prefixo || vehicle.nome]));
  setText(countSelector, `${trips.length} ${trips.length === 1 ? "viagem" : "viagens"}`);
  if (!target) return;
  target.innerHTML = trips.length ? trips.map((trip) => {
    const consulta = formatTripTime(getTripField(trip, 'hora_consulta') || getTripField(trip, 'horario_consulta') || trip.hora_saida || trip.hora_retorno);
    return `<tr>
      <td><strong>${escapeText(trip.codigo || trip.id)}</strong></td>
      <td>${escapeText(formatTripDate(trip.data_viagem || trip.dataViagem))}${consulta !== "--" ? `<br><small>Consulta: ${escapeText(consulta)}</small>` : ""}</td>
      <td>${escapeText(trip.origem || "--")} → ${escapeText(trip.destino || "--")}</td>
      <td>${escapeText(driverNames.get(String(trip.motorista_id)) || "A definir")}</td>
      <td>${escapeText(vehicleNames.get(String(trip.veiculo_id)) || "A definir")}</td>
      <td><span class="status info">${escapeText(trip.status || "AGUARDANDO")}</span></td>
    </tr>`;
  }).join("") : emptyTableRow(6, emptyMessage);
}

function renderTripOperationalInsights(trips, drivers, vehicles, vehiclesFromMap = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTrips = trips.filter((trip) => {
    const date = parseTripDate(trip.data_viagem || trip.dataViagem);
    return date && date.getTime() === today.getTime();
  });
  const ongoing = trips.filter(isActiveTrip);
  const withoutDriver = trips.filter((trip) => !trip.motorista_id && isActiveTrip(trip));
  const gpsSignals = Array.isArray(vehiclesFromMap) ? vehiclesFromMap.filter((item) => item.latitude != null && item.longitude != null).length : 0;
  const cards = document.querySelector("#tripOperationalCards");
  if (cards) {
    cards.innerHTML = [
      ["Hoje", todayTrips.length, "viagens marcadas"],
      ["Em andamento", ongoing.length, "ativas ou pendentes"],
      ["Sem motorista", withoutDriver.length, "precisam de definição"],
      ["GPS/rota", gpsSignals, "sinais ativos"],
    ].map(([label, value, note]) => `<article><span>${escapeText(label)}</span><strong>${escapeText(value)}</strong><small>${escapeText(note)}</small></article>`).join("");
  }
  const digest = document.querySelector("#tripDataDigest");
  if (digest) {
    const nextTrips = trips.slice(0, 6).map((trip) => {
      const driver = drivers.find((item) => String(item.id) === String(trip.motorista_id));
      const vehicle = vehicles.find((item) => String(item.id) === String(trip.veiculo_id));
      const consulta = formatTripTime(getTripField(trip, 'hora_consulta') || getTripField(trip, 'horario_consulta') || trip.hora_saida || trip.hora_retorno);
      return `<div class="trip-data-row"><strong>${escapeText(trip.codigo || trip.id)}</strong><span>${escapeText(formatTripDate(trip.data_viagem))} ${consulta !== "--" ? " às " + escapeText(consulta) : ""}</span><span>${escapeText(trip.origem || "--")} → ${escapeText(trip.destino || "--")}</span><small>${escapeText(driver?.nome || "Motorista a definir")} · ${escapeText(vehicle?.prefixo || vehicle?.placa || "Veículo a definir")}</small></div>`;
    }).join("");
    digest.innerHTML = nextTrips || `<div class="trip-data-row"><strong>Nenhuma viagem cadastrada</strong><span>Cadastre uma viagem para aparecer aqui.</span></div>`;
  }
  const routeDigest = document.querySelector("#operatorRouteDigest");
  if (routeDigest) {
    const active = ongoing.slice(0, 6).map((trip) => {
      const driver = drivers.find((item) => String(item.id) === String(trip.motorista_id));
      return `<div class="list-item"><span class="list-icon blue">↗</span><div><strong>${escapeText(trip.codigo || trip.id)}</strong><span>${escapeText(trip.origem || "--")} → ${escapeText(trip.destino || "--")}</span><small>${escapeText(driver?.nome || "Motorista a definir")} · ${escapeText(trip.status || "AGUARDANDO")}</small></div></div>`;
    }).join("");
    routeDigest.innerHTML = active || `<div class="list-item"><div><strong>Sem viagens ativas</strong><span>Quando houver viagem em andamento, os dados de rota aparecem aqui.</span></div></div>`;
  }
}

function parseTripDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTripDate(value) {
  const date = parseTripDate(value);
  return date ? date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }) : "--";
}



function getTripField(trip, key) {
  if (!trip || !key) return null;
  if (trip[key] != null && trip[key] !== "") return trip[key];
  const meta = parseTripMetadata(trip.metadados);
  return meta[key] ?? null;
}

function parseTripMetadata(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch (error) { return {}; }
}

function formatTripTime(value) {
  if (!value) return "--";
  const raw = String(value);
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  return raw.slice(0, 5) || "--";
}

function renderAlerts(alerts) {
  const target = document.querySelector("#operatorAlerts");
  if (!target) return;
  target.innerHTML = alerts.length ? alerts.slice(0, 10).map((item) => `<div class="list-item"><span class="list-icon red">!</span><div><strong>${escapeText(item.tipo || "ALERTA")}</strong><span>${escapeText(item.descricao || "")}</span></div><span class="time">${formatShortTime(item.criado_em)}</span></div>`).join("") : `<div class="list-item"><div><strong>Sem alertas reais</strong><span>Nenhum registro aberto.</span></div></div>`;
}

function renderCharts(charts) {
  const status = charts.find((item) => item.id === "status-viagens");
  const hourly = charts.find((item) => item.id === "movimentacao-hora");
  if (status) createDashboardChart("operatorStatusChart", status, { type: "doughnut" });
  if (hourly) createDashboardChart("operatorHourlyChart", hourly, { type: "line" });
}

async function loadDrivers() {
  const body = await apiJson("/motoristas");
  const drivers = body.motoristas || body.items || [];
  operatorState.drivers = drivers;
  renderDrivers(drivers);
  fillTripSelects(drivers, operatorState.vehicles || []);
}


function bindDriverSecretReveal() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-driver-secret-reveal]");
    if (!button || button.dataset.loading === "true") return;
    const driverId = button.dataset.driverSecretReveal;
    if (!driverId) return;
    const ok = window.confirm("Mostrar a senha do app deste motorista? Use apenas no momento do pareamento.");
    if (!ok) return;
    button.dataset.loading = "true";
    const oldText = button.textContent;
    button.textContent = "Carregando...";
    try {
      const body = await postJson(`/motoristas/${encodeURIComponent(driverId)}/reveal-app-password`, {});
      const secret = body.senha_app || body.codigo_ativacao || body.codigo || "";
      const target = document.querySelector(`[data-driver-secret-target="${cssEscape(driverId)}"]`);
      if (target && secret) target.textContent = secret;
      button.textContent = "Ocultar";
      button.onclick = () => {
        if (target) target.textContent = maskSecret(body.hint || secret);
        button.textContent = oldText || "Mostrar";
        button.onclick = null;
      };
    } catch (error) {
      showDriverError(error);
      button.textContent = oldText || "Mostrar";
    } finally {
      button.dataset.loading = "false";
    }
  });
}

function bindDriverForm() {
  const form = document.querySelector("#driverForm");
  const refresh = document.querySelector("#refreshDriversBtn");
  const generateQr = document.querySelector("#generateDriverQrBtn");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", (event) => submitDriverForm(event).catch(showDriverError));
  }
  if (refresh && !refresh.dataset.bound) {
    refresh.dataset.bound = "true";
    refresh.addEventListener("click", () => loadDrivers().catch(showDriverError));
  }
  if (generateQr && !generateQr.dataset.bound) {
    generateQr.dataset.bound = "true";
    generateQr.addEventListener("click", () => {
      const driverId = document.querySelector("#driverQrSelect")?.value;
      if (!driverId) {
        showFormError("#driverQrStatus", new Error("Selecione um motorista para gerar o código de ativação."));
        return;
      }
      generateDriverQr(driverId).catch(showQrError);
    });
  }
}

async function submitDriverForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("#driverFormStatus");
  const payload = Object.fromEntries(new FormData(form).entries());
  status.textContent = "Salvando...";
  const body = await postJson("/motoristas", payload);
  form.reset();
  status.textContent = "Motorista cadastrado. Senha do app salva no cadastro.";
  await loadDrivers();
  if (body.motorista?.id) {
    const select = document.querySelector("#driverQrSelect");
    if (select) select.value = String(body.motorista.id);
    showDriverTab("qr");
    const code = body.senha_app || body.codigo_ativacao || body.codigo || body.codigo_manual || payload.senha_app;
    const activation = body.ativacao || body.activation || {};
    if (code) {
      const payloadBox = document.querySelector("#driverQrPayload");
      const qrTarget = document.querySelector("#driverQrCanvas");
      const expiresAt = activation.expira_em || body.expira_em || null;
      if (payloadBox) payloadBox.value = JSON.stringify({ codigo_ativacao: code, endpoint: "/api/driver/activate", server_url: activation.server_url || window.location.origin + "/homologacao", expira_em: expiresAt }, null, 2);
      renderDriverActivationCode(qrTarget, code, expiresAt);
      const qrStatus = document.querySelector("#driverQrStatus");
      if (qrStatus) qrStatus.textContent = expiresAt ? `Senha válida até ${formatDateTime(expiresAt)}` : "Senha salva no cadastro.";
    } else {
      await generateDriverQr(body.motorista.id);
    }
  }
}

function bindTripForm() {
  const form = document.querySelector("#tripForm");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", (event) => submitGenericForm(event, "/viagens", "#tripFormStatus", "Viagem criada.").catch((error) => showFormError("#tripFormStatus", error)));
  }
}

function bindPatientForm() {
  const form = document.querySelector("#patientForm");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", (event) => submitGenericForm(event, "/pacientes", "#patientFormStatus", "Paciente cadastrado.").catch((error) => showFormError("#patientFormStatus", error)));
  }
}

function bindDestinationForm() {
  const form = document.querySelector("#destinationForm");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", (event) => submitGenericForm(event, "/destinos", "#destinationFormStatus", "Destino cadastrado.").catch((error) => showFormError("#destinationFormStatus", error)));
  }
}

function bindVehicleForm() {
  const form = document.querySelector("#vehicleForm");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", (event) => submitGenericForm(event, "/veiculos", "#vehicleFormStatus", "Veículo cadastrado.").catch((error) => showFormError("#vehicleFormStatus", error)));
  }
}

function bindPassengerForm() {
  const form = document.querySelector("#passengerForm");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", (event) => submitGenericForm(event, "/passageiros", "#passengerFormStatus", "Passageiro adicionado.").catch((error) => showFormError("#passengerFormStatus", error)));
  }
}

async function submitGenericForm(event, path, statusSelector, successMessage) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector(statusSelector);
  const payload = Object.fromEntries(new FormData(form).entries());
  Object.keys(payload).forEach((key) => {
    if (payload[key] === "") delete payload[key];
  });
  status.textContent = "Salvando...";
  await postJson(path, payload);
  form.reset();
  status.textContent = successMessage;
  await refreshOperatorData();
}

async function postJson(path, payload) {
  const response = await window.authFetch(window.apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  let body = {};
  try { body = await response.json(); } catch (error) { body = {}; }
  if (response.status === 401 || response.status === 403 || /token|autentica/i.test(String(body.error || ""))) {
    redirectToLogin(body.error || "Token inválido ou expirado.");
    throw new Error(body.error || "Token inválido ou expirado.");
  }
  if (!response.ok || !body.ok) throw new Error(body.error || "Falha ao salvar.");
  return body.data || {};
}

function fillTripSelects(drivers, vehicles) {
  const driverSelect = document.querySelector("#tripDriverSelect");
  const vehicleSelect = document.querySelector("#tripVehicleSelect");
  if (driverSelect) {
    const current = driverSelect.value;
    driverSelect.innerHTML = `<option value="">Motorista</option>` + drivers.map((driver) => `<option value="${escapeAttr(driver.id)}">${escapeText(driver.nome || driver.id)}</option>`).join("");
    driverSelect.value = current;
  }
  if (vehicleSelect) {
    const current = vehicleSelect.value;
    vehicleSelect.innerHTML = `<option value="">Veículo</option>` + vehicles.map((vehicle) => `<option value="${escapeAttr(vehicle.id)}">${escapeText(vehicle.prefixo || vehicle.placa || vehicle.nome || vehicle.id)}</option>`).join("");
    vehicleSelect.value = current;
  }
}

function fillPassengerSelects(trips, patients) {
  const tripSelect = document.querySelector("#passengerTripSelect");
  const patientSelect = document.querySelector("#passengerPatientSelect");
  if (tripSelect) {
    const current = tripSelect.value;
    tripSelect.innerHTML = `<option value="">Viagem</option>` + trips.map((trip) => `<option value="${escapeAttr(trip.id)}">${escapeText(trip.codigo || trip.id)} - ${escapeText(trip.data_viagem || "sem data")}</option>`).join("");
    tripSelect.value = current;
  }
  if (patientSelect) {
    const current = patientSelect.value;
    patientSelect.innerHTML = `<option value="">Paciente cadastrado</option>` + patients.map((patient) => `<option value="${escapeAttr(patient.id)}">${escapeText(patient.nome || patient.id)}</option>`).join("");
    patientSelect.value = current;
  }
}

function fillDestinationOptions(destinations) {
  const target = document.querySelector("#destinationOptions");
  if (!target) return;
  target.innerHTML = destinations.map((destination) => {
    const label = [destination.nome, destination.endereco, destination.cidade].filter(Boolean).join(" - ");
    return `<option value="${escapeAttr(label)}"></option>`;
  }).join("");
}

function renderPatients(patients) {
  const target = document.querySelector("#operatorPatients");
  const count = document.querySelector("#patientCount");
  if (count) count.textContent = `${patients.length} ${patients.length === 1 ? "cadastro" : "cadastros"}`;
  if (!target) return;
  target.innerHTML = patients.length ? patients.map((patient) => `<tr>
    <td>${escapeText(patient.nome || "--")}</td>
    <td>${escapeText(patient.tipo || "paciente")}</td>
    <td>${escapeText(patient.cpf || "--")}</td>
    <td>${escapeText(patient.telefone || "--")}</td>
    <td><button class="driver-action danger" type="button" data-patient-delete-id="${escapeAttr(patient.id)}" data-patient-name="${escapeAttr(patient.nome || patient.id)}">Excluir</button></td>
  </tr>`).join("") : emptyTableRow(5, "Nenhum paciente ou acompanhante cadastrado", "Cadastre pacientes/acompanhantes para montar viagens.");
  target.querySelectorAll("[data-patient-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deleteOperationalRecord("pacientes", button.dataset.patientDeleteId, button.dataset.patientName, "paciente/acompanhante").catch(showDeleteError));
  });
}

function renderPassengers(passengers, trips) {
  const target = document.querySelector("#operatorPassengers");
  const count = document.querySelector("#passengerCount");
  const tripNames = new Map(trips.map((trip) => [String(trip.id), trip.codigo || trip.id]));
  if (count) count.textContent = `${passengers.length} ${passengers.length === 1 ? "passageiro" : "passageiros"}`;
  if (!target) return;
  target.innerHTML = passengers.length ? passengers.map((passenger) => `<tr>
    <td>${escapeText(passenger.nome || "--")}</td>
    <td>${escapeText(passenger.tipo || "PACIENTE")}</td>
    <td>${escapeText(tripNames.get(String(passenger.viagem_id)) || passenger.viagem_id || "--")}</td>
    <td><span class="status info">${escapeText(passenger.status || "AGUARDANDO")}</span></td>
    <td><button class="driver-action danger" type="button" data-passenger-delete-id="${escapeAttr(passenger.id)}" data-passenger-name="${escapeAttr(passenger.nome || passenger.id)}">Excluir</button></td>
  </tr>`).join("") : emptyTableRow(5, "Nenhum passageiro vinculado", "Vincule passageiros depois de criar uma viagem.");
  target.querySelectorAll("[data-passenger-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deleteOperationalRecord("passageiros", button.dataset.passengerDeleteId, button.dataset.passengerName, "passageiro da viagem").catch(showDeleteError));
  });
}

function renderDestinations(destinations) {
  const target = document.querySelector("#operatorDestinations");
  const count = document.querySelector("#destinationCount");
  if (count) count.textContent = `${destinations.length} ${destinations.length === 1 ? "destino" : "destinos"}`;
  if (!target) return;
  target.innerHTML = destinations.length ? destinations.map((destination) => `<tr>
    <td>${escapeText(destination.nome || "--")}</td>
    <td>${escapeText(destination.tipo || "outro")}</td>
    <td>${escapeText(destination.endereco || "--")}</td>
    <td>${escapeText(destination.cidade || "--")}</td>
    <td>${escapeText(destination.telefone || "--")}</td>
    <td><button class="driver-action danger" type="button" data-destination-delete-id="${escapeAttr(destination.id)}" data-destination-name="${escapeAttr(destination.nome || destination.id)}">Excluir</button></td>
  </tr>`).join("") : emptyTableRow(6, "Nenhum destino cadastrado", "Cadastre hospitais e locais de destino.");
  target.querySelectorAll("[data-destination-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deleteOperationalRecord("destinos", button.dataset.destinationDeleteId, button.dataset.destinationName, "destino").catch(showDeleteError));
  });
}

async function deleteOperationalRecord(collection, id, name, label) {
  if (!collection || !id) return;
  const confirmed = window.confirm(`Excluir ${label} ${name || id}?

A exclusão remove o item da operação e não deve ser usada para dados reais sem conferência.`);
  if (!confirmed) return;
  const response = await window.authFetch(window.apiUrl(`/${collection}/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: { Accept: "application/json" }
  });
  let body = {};
  try { body = await response.json(); } catch (error) { body = {}; }
  if (!response.ok || body.ok !== true) throw new Error(body.error || "Falha ao excluir registro.");
  await refreshOperatorData();
}

function showDeleteError(error) {
  showSmallError("/excluir", error.message || String(error));
}

function renderDrivers(drivers) {
  const target = document.querySelector("#driversList");
  if (!target) return;
  target.innerHTML = drivers.length ? drivers.map((driver) => {
    const appPassword = driver.app_senha_atual || driver.senha_app_atual || driver.codigo_ativacao || "";
    const generatedAt = driver.app_senha_gerada_em ? `<br><small>Gerada em ${escapeText(formatDateTime(driver.app_senha_gerada_em))}</small>` : "";
    return `
    <div class="ranking-row driver-card-row">
      <strong>${escapeText(driver.status || "ativo")}</strong>
      <span>${escapeText(driver.nome || driver.id)}<br><small>${escapeText(driver.matricula || driver.cpf || "")}</small></span>
      <span>${driver.tem_senha_app || driver.app_senha_hint ? `<small>Senha app salva</small><br><strong class="activation-inline-code" data-driver-secret-target="${escapeAttr(driver.id)}">${escapeText(maskSecret(driver.app_senha_hint || appPassword))}</strong>${generatedAt}<br><button class="driver-action small-action" type="button" data-driver-secret-reveal="${escapeAttr(driver.id)}">Mostrar</button>` : `<small>Sem senha do app salva</small>`}</span>
      <span class="driver-actions-inline"><button class="driver-action" type="button" data-driver-id="${escapeAttr(driver.id)}">Gerar nova senha</button><button class="driver-action danger" type="button" data-driver-delete-id="${escapeAttr(driver.id)}" data-driver-name="${escapeAttr(driver.nome || driver.id)}">Excluir</button></span>
    </div>`;
  }).join("") : emptyDriverList();
  target.querySelectorAll("[data-driver-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const select = document.querySelector("#driverQrSelect");
      if (select) select.value = button.dataset.driverId;
      showDriverTab("qr");
      generateDriverQr(button.dataset.driverId).catch(showQrError);
    });
  });
  target.querySelectorAll("[data-driver-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deleteDriver(button.dataset.driverDeleteId, button.dataset.driverName).catch(showDriverError));
  });
  fillQrDriverSelect(drivers);
}

async function deleteDriver(driverId, driverName) {
  if (!driverId) return;
  const confirmed = window.confirm(`Excluir o motorista ${driverName || driverId}?

A exclusão é lógica: o registro sai da operação, QR e login deixam de funcionar. Motoristas com viagem ativa não serão excluídos.`);
  if (!confirmed) return;
  const response = await window.authFetch(window.apiUrl(`/motoristas/${encodeURIComponent(driverId)}`), {
    method: "DELETE",
    headers: { Accept: "application/json" }
  });
  let body = {};
  try { body = await response.json(); } catch (error) { body = {}; }
  if (!response.ok || body.ok !== true) throw new Error(body.error || "Falha ao excluir motorista.");
  await loadDrivers();
  await refreshOperatorData();
}

function fillQrDriverSelect(drivers) {
  const select = document.querySelector("#driverQrSelect");
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">Selecione o motorista</option>` + drivers.map((driver) => `<option value="${escapeAttr(driver.id)}">${escapeText(driver.nome || driver.id)}${driver.matricula ? ` - ${escapeText(driver.matricula)}` : ""}</option>`).join("");
  select.value = current;
}

function renderVehicles(vehicles) {
  const target = document.querySelector("#operatorVehicles");
  const count = document.querySelector("#vehicleCount");
  if (count) count.textContent = `${vehicles.length} ${vehicles.length === 1 ? "veículo" : "veículos"}`;
  if (!target) return;
  target.innerHTML = vehicles.length ? vehicles.map((vehicle) => `<tr>
    <td>${escapeText(vehicle.placa || "--")}</td>
    <td>${escapeText(vehicle.nome || "--")}</td>
    <td>${escapeText(vehicle.capacidade || "--")}</td>
    <td>${escapeText(vehicle.tipo || "--")}</td>
    <td><span class="status info">${escapeText(vehicle.status || "--")}</span></td>
  </tr>`).join("") : emptyTableRow(5, "Nenhum veículo cadastrado", "Cadastre veículos para vincular às viagens.");
}

async function generateDriverQr(driverId) {
  const status = document.querySelector("#driverQrStatus");
  const payloadBox = document.querySelector("#driverQrPayload");
  const qrTarget = document.querySelector("#driverQrCanvas");
  status.textContent = "Gerando código...";
  const body = await postJson(`/motoristas/${encodeURIComponent(driverId)}/activation-code`, { origem: "painel_operador" });
  const activation = body.ativacao || body.activation || body.data?.ativacao || body.data?.activation || {};
  const code = activation.codigo || activation.activation_code || body.codigo_manual || body.codigo || "";
  if (!code) throw new Error("Código de ativação não retornado pela API.");
  const payload = {
    codigo_ativacao: code,
    endpoint: activation.endpoint || "/api/driver/activate",
    server_url: activation.server_url || activation.api_base_url || activation.api || window.location.origin + "/homologacao",
    expira_em: activation.expira_em || body.expira_em || null
  };
  payloadBox.value = JSON.stringify(payload, null, 2);
  renderDriverActivationCode(qrTarget, code, payload.expira_em);
  status.textContent = payload.expira_em ? `Senha salva. Código válido até ${formatDateTime(payload.expira_em)}` : "Senha do app salva no cadastro do motorista.";
  await loadDrivers();
}

function renderDriverActivationCode(target, code, expiresAt) {
  if (!target) return;
  target.innerHTML = `
    <div class="activation-code-card">
      <span class="activation-code-label">Código de ativação</span>
      <strong class="activation-code-value">${escapeText(code)}</strong>
      <small>Digite este código no App Motorista.</small>
      ${expiresAt ? `<small>Validade: ${escapeText(formatDateTime(expiresAt))}</small>` : ""}
    </div>
  `;
}

function renderDriverQr(target, text) {
  renderDriverActivationCode(target, text, null);
}

function renderOperatorFeed(items) {
  const target = document.querySelector("#operatorFeed");
  if (!target) return;
  target.innerHTML = items.length ? items.slice(0, 5).map((item) => `
    <div class="list-item"><span class="dot"></span><div><strong>${escapeText(item.tipo || "EVENTO")}</strong><span>${escapeText(item.descricao || "")}</span></div><span class="time">${formatShortTime(item.dataHora || item.criado_em)}</span></div>
  `).join("") : `<div class="list-item"><span class="dot"></span><div><strong>Sem eventos</strong><span>Aguardando operação.</span></div></div>`;
}


// H4.20 AI - Assistente operacional
function bindOperatorAiActions() {
  const summary = document.querySelector("#operatorAiSummaryBtn");
  const risk = document.querySelector("#operatorAiRiskBtn");
  const trip = document.querySelector("#operatorAiTripBtn");
  const stats = document.querySelector("#operatorAiStatsBtn");
  const routes = document.querySelector("#operatorAiRoutesBtn");
  const weather = document.querySelector("#operatorAiWeatherBtn");
  const ask = document.querySelector("#operatorAiAskBtn");
  const copy = document.querySelector("#operatorAiCopyBtn");
  if (summary && !summary.dataset.bound) {
    summary.dataset.bound = "true";
    summary.addEventListener("click", () => runOperatorAi("summary").catch(showOperatorAiError));
  }
  if (risk && !risk.dataset.bound) {
    risk.dataset.bound = "true";
    risk.addEventListener("click", () => runOperatorAi("risk").catch(showOperatorAiError));
  }
  if (trip && !trip.dataset.bound) {
    trip.dataset.bound = "true";
    trip.addEventListener("click", () => runOperatorAi("trip").catch(showOperatorAiError));
  }
  if (stats && !stats.dataset.bound) {
    stats.dataset.bound = "true";
    stats.addEventListener("click", () => runOperatorAi("stats").catch(showOperatorAiError));
  }
  if (routes && !routes.dataset.bound) {
    routes.dataset.bound = "true";
    routes.addEventListener("click", () => runOperatorAi("routes").catch(showOperatorAiError));
  }
  if (weather && !weather.dataset.bound) {
    weather.dataset.bound = "true";
    weather.addEventListener("click", () => runOperatorAi("weather").catch(showOperatorAiError));
  }
  if (ask && !ask.dataset.bound) {
    ask.dataset.bound = "true";
    ask.addEventListener("click", () => runOperatorAi("question").catch(showOperatorAiError));
  }
  const promptBox = document.querySelector("#operatorAiPrompt");
  if (promptBox && !promptBox.dataset.enterBound) {
    promptBox.dataset.enterBound = "true";
    promptBox.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        runOperatorAi("question").catch(showOperatorAiError);
      }
    });
  }
  if (copy && !copy.dataset.bound) {
    copy.dataset.bound = "true";
    copy.addEventListener("click", async () => {
      const text = document.querySelector("#operatorAiResult")?.textContent || "";
      if (navigator.clipboard && text) await navigator.clipboard.writeText(text);
    });
  }
}

function fillOperatorAiTripSelect(trips) {
  const select = document.querySelector("#operatorAiTripSelect");
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">Selecione uma viagem</option>` + (trips || []).slice(0, 80).map((trip) => {
    const label = [trip.codigo || trip.id, trip.origem, trip.destino].filter(Boolean).join(" · ");
    return `<option value="${escapeAttr(trip.id)}">${escapeText(label)}</option>`;
  }).join("");
  select.value = current;
}

async function runOperatorAi(mode, overridePrompt = null) {
  const result = document.querySelector("#operatorAiResult");
  const status = document.querySelector("#operatorAiStatus");
  const prompt = overridePrompt ?? (document.querySelector("#operatorAiPrompt")?.value || "");
  if (result) {
    result.className = "ai-output loading";
    result.textContent = "Gerando análise com IA...";
  }
  if (status) status.textContent = "Processando";

  let path = "/ai/chat";
  let body = { modo: mode || "summary", pergunta: prompt || "Faça um resumo operacional direto para o operador." };
  if (mode === "question") {
    if (!String(prompt || "").trim()) throw new Error("Digite uma pergunta para enviar à IA.");
    body.pergunta = String(prompt).trim();
  }
  if (mode === "risk") {
    body.pergunta = prompt || "Liste riscos operacionais, viagens que exigem atenção, veículos sem GPS recente e próximas ações para o operador.";
  }
  if (mode === "trip") {
    const viagemId = document.querySelector("#operatorAiTripSelect")?.value || "";
    if (!viagemId) throw new Error("Selecione uma viagem para análise.");
    path = "/ai/trip-analysis";
    body = { modo: "trip", viagem_id: viagemId, pergunta: prompt || "Analise esta viagem, riscos, passageiros, GPS e próximas ações." };
  }
  if (mode === "stats") {
    body.modo = "statistics";
    body.pergunta = prompt || "Gere estatísticas operacionais claras para o operador, com totais, gargalos e próximos passos.";
  }
  if (mode === "routes" || mode === "weather") {
    body.modo = mode === "weather" ? "weather" : "routes";
    body.pergunta = prompt || (mode === "weather"
      ? "Apresente previsão do tempo operacional e impacto provável nas viagens e rotas dos motoristas."
      : "Analise as rotas de cada motorista, possíveis lentidões por GPS, riscos de atraso, clima e próximas ações.");
    const geo = await getOperatorGeolocation({ allowTimeout: true });
    if (geo) {
      body.latitude = geo.latitude;
      body.longitude = geo.longitude;
    }
  }
  const response = await postAiJson(path, body);
  if (result) {
    result.className = "ai-output";
    result.textContent = response.resposta || "A IA retornou sem texto.";
  }
  if (status) status.textContent = "Concluído";
  updateFloatingAiAnswer(response.resposta || "A IA retornou sem texto.");
}


async function postAiJson(path, payload) {
  const endpoints = [];
  const mode = String(payload?.modo || payload?.mode || "").toLowerCase();
  const add = (item) => { if (item && !endpoints.includes(item)) endpoints.push(item); };
  add(path);
  if (mode.includes("stat")) add("/ai/statistics");
  if (mode.includes("route") || mode.includes("rota") || mode.includes("clima") || mode.includes("weather")) add("/ai/route-intelligence");
  if (mode.includes("weather") || mode.includes("tempo")) add("/ai/weather");
  add("/ai/chat");
  add("/ai/operational-summary");

  let lastError = null;
  for (const endpoint of endpoints) {
    const response = await window.authFetch(window.apiUrl(endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...payload, endpoint_solicitado: path })
    });
    let body = {};
    try { body = await response.json(); } catch (error) { body = {}; }
    if (response.ok && body.ok === true) return body.data || {};
    let msg = body.error || `HTTP ${response.status}`;
    if (response.status === 429 || /quota|billing|limit|exceed/i.test(String(msg))) {
      msg = "OpenAI sem cota/crédito disponível. Verifique faturamento, limite de uso e projeto da chave na plataforma OpenAI.";
    }
    lastError = new Error(`Falha ao chamar IA em ${endpoint}: ${msg}`);
    if (![404, 405].includes(response.status)) break;
  }
  throw lastError || new Error("Falha ao acionar IA.");
}

function bindReportActions() {
  const button = document.querySelector("#generateTripsPdfBtn");
  if (!button || button.dataset.bound) return;
  button.dataset.bound = "true";
  button.addEventListener("click", () => generateTripsHistoryPdf().catch(showGlobalError));
}

async function generateTripsHistoryPdf() {
  let report = null;
  try {
    report = await apiJson("/relatorios/viagens-historico");
  } catch (error) {
    report = { resumo: null, viagens: operatorState.trips || [] };
  }
  const trips = report.viagens || operatorState.trips || [];
  const drivers = new Map((operatorState.drivers || []).map((item) => [String(item.id), item.nome]));
  const vehicles = new Map((operatorState.vehicles || []).map((item) => [String(item.id), item.prefixo || item.placa || item.nome]));
  const resumo = report.resumo || {
    total_viagens: trips.length,
    km_rodados: trips.reduce((sum, item) => sum + tripKm(item), 0),
    concluidas: trips.filter((item) => ["CONCLUIDA", "FINALIZADA"].includes(String(item.status || "").toUpperCase())).length,
    ativas_ou_pendentes: trips.filter((item) => !["CONCLUIDA", "FINALIZADA", "CANCELADA"].includes(String(item.status || "").toUpperCase())).length,
  };
  const rows = trips.map((trip) => {
    const motorista = trip.motorista || trip.motorista_nome || drivers.get(String(trip.motorista_id)) || "A definir";
    const veiculo = trip.veiculo || trip.prefixo || trip.placa || vehicles.get(String(trip.veiculo_id)) || "A definir";
    return `<tr><td>${escapeText(trip.codigo || trip.id || "")}</td><td>${escapeText(formatTripDate(trip.data_viagem))}<br>${escapeText(formatTripTime(trip))}</td><td>${escapeText(trip.origem || "--")} → ${escapeText(trip.destino || "--")}</td><td>${escapeText(motorista)}</td><td>${escapeText(veiculo)}</td><td>${escapeText(trip.status || "")}</td><td>${tripKm(trip).toFixed(1)} km</td></tr>`;
  }).join("") || emptyTableRow(7, "Sem viagens no histórico");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Histórico de Viagens</title><style>body{font-family:Arial,sans-serif;color:#1f2937;margin:24px}h1{color:#28324d} .brand{display:flex;align-items:center;gap:12px;border-bottom:3px solid #c9a64d;padding-bottom:12px;margin-bottom:18px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.card{border:1px solid #d6dbe6;border-radius:10px;padding:12px;background:#f8fafc}.card strong{display:block;font-size:22px;color:#28324d}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#505a76;color:white;text-align:left;padding:8px}td{border-bottom:1px solid #e5e7eb;padding:8px;vertical-align:top}.footer{margin-top:18px;font-size:11px;color:#64748b}@media print{button{display:none}body{margin:12mm}}</style></head><body><div class="brand"><strong>ANDRADE Gestão em Saúde</strong><span>Histórico de Viagens</span></div><h1>Relatório de Histórico de Viagens</h1><p>Gerado em ${new Date().toLocaleString("pt-BR")}</p><section class="cards"><div class="card"><span>Total</span><strong>${resumo.total_viagens || trips.length}</strong></div><div class="card"><span>Concluídas</span><strong>${resumo.concluidas || 0}</strong></div><div class="card"><span>Ativas/Pendentes</span><strong>${resumo.ativas_ou_pendentes || 0}</strong></div><div class="card"><span>KM rodados</span><strong>${Number(resumo.km_rodados || 0).toFixed(1)}</strong></div></section><table><thead><tr><th>Viagem</th><th>Data/Horário</th><th>Origem → Destino</th><th>Motorista</th><th>Veículo</th><th>Status</th><th>KM</th></tr></thead><tbody>${rows}</tbody></table><p class="footer">Relatório gerado pelo Painel Operador. Use a opção do navegador “Salvar como PDF”.</p></body></html>`;
  const win = window.open("", "_blank");
  if (!win) throw new Error("Pop-up bloqueado. Permita pop-ups para gerar o PDF.");
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  window.setTimeout(() => win.print(), 250);
}

function tripKm(trip) {
  const a = Number(trip.km_saida ?? 0);
  const b = Number(trip.km_retorno ?? 0);
  return Number.isFinite(a) && Number.isFinite(b) && b >= a ? b - a : 0;
}

function bindAiShortcuts() {
  const stats = document.querySelector("#operatorAiStatsShortcut");
  const routes = document.querySelector("#operatorAiRoutesShortcut");
  if (stats && !stats.dataset.bound) {
    stats.dataset.bound = "true";
    stats.addEventListener("click", () => {
      showOperatorScreen("ai");
      runOperatorAi("stats").catch(showOperatorAiError);
    });
  }
  if (routes && !routes.dataset.bound) {
    routes.dataset.bound = "true";
    routes.addEventListener("click", () => {
      showOperatorScreen("ai");
      runOperatorAi("routes").catch(showOperatorAiError);
    });
  }
}

function showOperatorScreen(name) {
  document.querySelectorAll("[data-screen-panel]").forEach((panel) => {
    const active = panel.dataset.screenPanel === name;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  document.querySelectorAll(".side-nav [data-screen]").forEach((link) => link.classList.toggle("active", link.dataset.screen === name));
  setText("#screenTitle", name === "ai" ? "IA Operacional" : "Painel Logístico");
  setText("#screenEyebrow", name === "ai" ? "Assistente inteligente" : "Operação");
}

function bindFloatingAiChat() {
  if (document.querySelector("#floatingAiChat")) return;
  const box = document.createElement("section");
  box.id = "floatingAiChat";
  box.className = "floating-ai-chat collapsed";
  box.innerHTML = `<button class="floating-ai-toggle" type="button">✦ IA</button>
    <div class="floating-ai-panel" aria-label="Chat com IA operacional">
      <div class="floating-ai-header"><strong>Assistente IA</strong><button type="button" data-close-chat>×</button></div>
      <div id="floatingAiMessages" class="floating-ai-messages"><div class="ai-bubble bot">Pergunte sobre viagens, motoristas, rotas, lentidão, clima ou pendências.</div></div>
      <form id="floatingAiForm" class="floating-ai-form"><textarea id="floatingAiPrompt" rows="2" placeholder="Digite sua pergunta..."></textarea><button id="floatingAiSend" type="submit">Enviar</button></form>
    </div>`;
  document.body.appendChild(box);
  box.querySelector(".floating-ai-toggle")?.addEventListener("click", () => box.classList.toggle("collapsed"));
  box.querySelector("[data-close-chat]")?.addEventListener("click", () => box.classList.add("collapsed"));
  const sendFloatingQuestion = async () => {
    const input = box.querySelector("#floatingAiPrompt");
    const text = String(input?.value || "").trim();
    if (!text) return;
    appendFloatingAiMessage(text, "user");
    if (input) input.value = "";
    appendFloatingAiMessage("Gerando resposta...", "bot", true);
    try {
      await runOperatorAi("question", text);
    } catch (error) {
      updateFloatingAiAnswer(error.message || String(error), true);
      showOperatorAiError(error);
    }
  };
  const form = box.querySelector("#floatingAiForm");
  const inputNode = box.querySelector("#floatingAiPrompt");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendFloatingQuestion();
  });
  box.querySelector("#floatingAiSend")?.addEventListener("click", (event) => {
    event.preventDefault();
    sendFloatingQuestion();
  });
  inputNode?.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.code === "Enter" || event.keyCode === 13) && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      sendFloatingQuestion();
    }
  });
  inputNode?.addEventListener("keyup", (event) => {
    if ((event.key === "Enter" || event.code === "Enter" || event.keyCode === 13) && !event.shiftKey) {
      event.preventDefault();
    }
  });
}

function appendFloatingAiMessage(text, type = "bot", loading = false) {
  const messages = document.querySelector("#floatingAiMessages");
  if (!messages) return;
  if (loading) {
    let node = messages.querySelector(".ai-bubble.loading");
    if (!node) {
      node = document.createElement("div");
      node.className = "ai-bubble bot loading";
      messages.appendChild(node);
    }
    node.textContent = text;
  } else {
    const node = document.createElement("div");
    node.className = `ai-bubble ${type}`;
    node.textContent = text;
    messages.appendChild(node);
  }
  messages.scrollTop = messages.scrollHeight;
}

function updateFloatingAiAnswer(text, isError = false) {
  const messages = document.querySelector("#floatingAiMessages");
  if (!messages) return;
  let node = messages.querySelector(".ai-bubble.loading");
  if (!node) {
    node = document.createElement("div");
    messages.appendChild(node);
  }
  node.className = `ai-bubble bot${isError ? " error" : ""}`;
  node.textContent = text;
  messages.scrollTop = messages.scrollHeight;
}

async function getOperatorGeolocation(options = {}) {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: options.allowTimeout ? 5000 : 10000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

function showOperatorAiError(error) {
  const result = document.querySelector("#operatorAiResult");
  const status = document.querySelector("#operatorAiStatus");
  if (result) {
    result.className = "ai-output error";
    result.textContent = error.message || String(error);
  }
  if (status) status.textContent = "Erro";
}

function isActiveTrip(item) {
  return !["CONCLUIDA", "FINALIZADA", "CANCELADA"].includes(String(item.status || "").toUpperCase());
}

function isOpenItem(item) {
  return !["fechado", "fechada", "resolvido", "resolvida", "cancelado", "cancelada", "finalizado", "finalizada"].includes(String(item.status || "").toLowerCase());
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value ?? 0;
}

function formatShortTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function emptyDriverList() {
  return `<div class="ranking-row"><strong>-</strong><span>Nenhum motorista cadastrado.</span><b>0</b></div>`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "\$&");
}

function maskSecret(value) {
  const text = String(value || "").trim();
  if (!text) return "••••";
  const hint = text.length > 4 ? text.slice(-4) : text;
  return `••••-${hint}`;
}

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeAttr(value) {
  return escapeText(value).replace(/`/g, "&#096;");
}

function showDriverError(error) {
  showFormError("#driverFormStatus", error);
}

function showQrError(error) {
  showFormError("#driverQrStatus", error);
}

function showFormError(selector, error) {
  const status = document.querySelector(selector);
  if (status) status.textContent = error.message || String(error);
}

function showSmallError(path, message) {
  const target = document.querySelector("#operatorFeed");
  if (!target) return;
  target.innerHTML = `<div class="list-item"><span class="dot" style="background:var(--yellow)"></span><div><strong>Aviso ao carregar ${escapeText(path)}</strong><span>${escapeText(message)}</span></div></div>`;
}

function showGlobalError(error) {
  const target = document.querySelector("#operatorFeed");
  if (target) target.innerHTML = `<div class="list-item"><span class="dot" style="background:var(--red)"></span><div><strong>Falha ao carregar</strong><span>${escapeText(error.message)}</span></div></div>`;
}

loadOperatorDashboard().catch(showGlobalError);
