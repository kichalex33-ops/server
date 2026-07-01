(function () {
  const store = window.DriverOfflineStore;
  const state = {
    config: null,
    trips: [],
    selectedTrip: null,
    passengers: [],
    syncing: false,
    gpsTimer: null,
    lastGps: null
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindEvents();
    await registerServiceWorker();
    state.config = await store.getConfig();
    updateConnectionBadge();
    window.addEventListener("online", () => { updateConnectionBadge(); syncNow(); });
    window.addEventListener("offline", updateConnectionBadge);

    if (state.config?.pairing_status === "CONFIRMADO") {
      showDashboard();
      await loadLocalData();
      await fetchTrips();
    } else {
      showPairing();
    }
    renderAll();
  }

  function bindEvents() {
    $("#confirmPairingBtn")?.addEventListener("click", confirmarPareamento);
    $("#syncNowBtn")?.addEventListener("click", syncNow);
    $("#refreshTripsBtn")?.addEventListener("click", fetchTrips);
    $("#saveChecklistBtn")?.addEventListener("click", saveChecklist);
    $("#saveInitialKmBtn")?.addEventListener("click", saveInitialKm);
    $("#finishTripBtn")?.addEventListener("click", finishTrip);
    $("#panicBtn")?.addEventListener("click", triggerPanic);
    $("#saveOccurrenceBtn")?.addEventListener("click", saveOccurrence);
    $("#sendMessageBtn")?.addEventListener("click", saveMessageReply);
    $$(".tab").forEach((button) => button.addEventListener("click", () => selectTab(button.dataset.tab)));
    document.addEventListener("click", handleDocumentClick);
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    try {
      await navigator.serviceWorker.register("service-worker.js", { scope: "./" });
    } catch {
      // A instalacao do PWA e melhoria progressiva; o app segue funcionando no navegador.
    }
  }

  function apiData(body) {
    return body && body.ok === true && body.data ? body.data : body;
  }

  function authHeaders(extra = {}) {
    const headers = { ...extra };
    const token = state.config?.access_token || state.config?.token || state.config?.sessao?.token;
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function motoristaFetch(url, options = {}) {
    return fetch(url, {
      ...options,
      headers: authHeaders(options.headers || {})
    });
  }

  async function readJsonResponse(response, fallbackMessage) {
    const text = await response.text();
    let body = {};
    if (text) {
      try { body = JSON.parse(text); } catch (_) { throw new Error('Resposta invalida do servidor.'); }
    }
    if (!response.ok || body.ok === false) throw new Error(body.error || body.message || fallbackMessage || `HTTP ${response.status}`);
    return apiData(body);
  }

  async function confirmarPareamento() {
    const message = $('#pairingMessage');
    try {
      const payload = JSON.parse($('#pairingPayload').value.trim());
      const device = buildDeviceInfo();
      const serverUrl = normalizeServerUrl(payload.server_url || payload.api_base_url || payload.api || '');
      if (!serverUrl) throw new Error('Payload sem server_url. Gere novamente no painel.');

      let data;
      if (isPairingPayload(payload)) {
        validatePairingPayload(payload);
        const response = await fetch(`${serverUrl}/api/driver/pairing/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            pairing_id: payload.pairing_id,
            pairing_token: payload.pairing_token,
            motorista_id: payload.motorista_id,
            device
          })
        });
        data = await readJsonResponse(response, 'Falha ao confirmar pareamento.');
      } else {
        const code = activationCodeFromPayload(payload);
        if (!code) throw new Error('Payload sem pairing_token ou codigo de ativacao.');
        const response = await fetch(`${serverUrl}/api/driver/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            codigo: code,
            activation_code: code,
            senha_app: code,
            nome: payload.motorista_nome || payload.nome || '',
            device
          })
        });
        data = await readJsonResponse(response, 'Falha ao ativar motorista.');
      }

      const accessToken = data.access_token || data.token || data.sessao?.token || '';
      if (!accessToken) throw new Error('Token do motorista nao retornado pelo servidor.');

      state.config = {
        id: 'current',
        server_url: serverUrl,
        api_base_url: data.api?.base_url || payload.api_base_url || serverUrl,
        motorista_id: data.motorista?.id || data.usuario?.id || payload.motorista_id,
        motorista_nome: data.motorista?.nome || data.usuario?.nome || payload.motorista_nome || 'Motorista',
        device_id: data.device?.id || device.device_id,
        device_name: device.device_name,
        access_token: accessToken,
        token: accessToken,
        pairing_status: 'CONFIRMADO',
        paired_at: new Date().toISOString()
      };
      await store.setConfig(state.config);
      setMessage(message, 'Pareamento confirmado. Carregando viagens...', 'ok');
      showDashboard();
      await fetchTrips();
      renderAll();
    } catch (error) {
      setMessage(message, error.message, 'error');
    }
  }

  function isPairingPayload(payload) {
    return Boolean(payload?.pairing_id || payload?.pairing_token || payload?.type === 'PAINEL_LOGISTICO_DRIVER_PAIRING');
  }

  function validatePairingPayload(payload) {
    if (payload.type && payload.type !== 'PAINEL_LOGISTICO_DRIVER_PAIRING') throw new Error('Payload de QR invalido.');
    if (payload.version && Number(payload.version) !== 1) throw new Error('Versao de QR nao suportada.');
    if (!payload.server_url || !payload.pairing_id || !payload.pairing_token) throw new Error('Payload incompleto.');
  }

  function activationCodeFromPayload(payload) {
    return String(payload.codigo_ativacao || payload.activation_code || payload.codigo || payload.code || payload.senha_app || '').trim();
  }

  function normalizeServerUrl(value) {
    const raw = String(value || '').trim().replace(/\/+$/, '');
    if (!raw) return '';
    return raw.replace(/\/api$/, '');
  }

  function buildDeviceInfo() {
    const existingId = localStorage.getItem("motorista_device_id") || `web-${cryptoRandom()}`;
    localStorage.setItem("motorista_device_id", existingId);
    return {
      device_id: existingId,
      device_name: navigator.userAgent.includes("Android") ? "Chrome Android" : "Navegador Mobile",
      platform: navigator.platform || "web",
      app_version: "1.0.0-pwa"
    };
  }

  async function loadLocalData() {
    state.trips = await store.getAll("viagens");
    state.passengers = await store.getAll("passageiros");
  }

  async function fetchTrips() {
    if (!state.config) return;
    try {
      updateConnectionBadge("Sincronizando");
      const response = await motoristaFetch(`${state.config.api_base_url}/api/driver/trips?motorista_id=${encodeURIComponent(state.config.motorista_id)}`, { headers: { Accept: "application/json" } });
      const data = await readJsonResponse(response, "Falha ao buscar viagens.");
      const trips = (data.viagens || data.trips || []).map(normalizeTrip);
      const passengers = trips.flatMap((trip) => (trip.passageiros || []).map((passenger) => normalizePassenger(passenger, trip.id)));
      await store.putMany("viagens", trips);
      await store.putMany("passageiros", passengers);
      await store.setConfig({ ...state.config, last_sync_at: new Date().toISOString() });
      state.config = await store.getConfig();
      state.trips = trips;
      state.passengers = passengers;
      ensureSelectedTripAfterFetch();
    } catch {
      await loadLocalData();
    } finally {
      updateConnectionBadge();
      renderAll();
    }
  }

  function normalizeTrip(trip) {
    return {
      ...trip,
      id: trip.id,
      origem: trip.origem || "--",
      destino: trip.destino || "--",
      status: trip.status || "AGUARDANDO",
      motorista_id: trip.motorista_id || trip.motoristaId || state.config?.motorista_id,
      updated_at: new Date().toISOString()
    };
  }

  function normalizePassenger(passenger, viagemId) {
    return {
      ...passenger,
      id: passenger.id || `${viagemId}-${passenger.paciente_id || cryptoRandom()}`,
      viagem_id: passenger.viagem_id || passenger.viagemId || viagemId,
      nome: passenger.nome || passenger.paciente_nome || "Passageiro",
      status: passenger.status || "AGUARDANDO"
    };
  }

  async function selectTrip(tripId) {
    state.selectedTrip = state.trips.find((trip) => String(trip.id) === String(tripId)) || null;
    startGpsLoop();
    renderAll();
    selectTab("detalhes");
  }

  function ensureSelectedTripAfterFetch() {
    if (!state.trips.length) {
      state.selectedTrip = null;
      if (state.gpsTimer) window.clearInterval(state.gpsTimer);
      state.gpsTimer = null;
      return;
    }
    const current = state.selectedTrip
      ? state.trips.find((trip) => String(trip.id) === String(state.selectedTrip.id))
      : null;
    const active = state.trips.find((trip) => !isTripFinished(trip.status));
    state.selectedTrip = current || active || state.trips[0];
    if (state.selectedTrip && !isTripFinished(state.selectedTrip.status)) startGpsLoop();
  }

  function isTripFinished(status) {
    const value = String(status || "").toUpperCase();
    return ["CONCLUIDA", "FINALIZADA", "CANCELADA"].some((done) => value.includes(done));
  }

  async function saveChecklist() {
    const trip = requireSelectedTrip();
    const fields = {};
    $$("[data-checklist]").forEach((item) => { fields[item.dataset.checklist] = item.checked; });
    const requiredOk = ["pneus", "combustivel", "iluminacao", "freios", "documentacao", "limpeza"].every((key) => fields[key]);
    const payload = {
      id: `checklist-${trip.id}`,
      viagem_id: trip.id,
      motorista_id: state.config.motorista_id,
      ...fields,
      observacoes: $("#checklistObs").value.trim(),
      status: requiredOk ? "APROVADO" : "PENDENTE",
      created_at: new Date().toISOString()
    };
    await store.put("checklists", payload);
    await store.addPending("eventosPendentes", {
      tipo: "checklist",
      endpoint: `/api/driver/trips/${trip.id}/checklist`,
      method: "POST",
      payload
    });
    await syncNow();
    alert(requiredOk ? "Checklist salvo." : "Checklist salvo como pendente.");
    renderAll();
  }

  async function saveInitialKm() {
    const trip = requireSelectedTrip();
    const km = Number($("#kmInicialInput").value);
    if (!Number.isFinite(km) || km <= 0) {
      alert("Informe o KM inicial antes da saida.");
      return;
    }
    trip.km_saida = km;
    trip.status = "SAIDA_REGISTRADA";
    await store.put("viagens", trip);
    await store.addPending("eventosPendentes", {
      tipo: "km_inicial",
      endpoint: `/api/driver/trips/${trip.id}/km-inicial`,
      method: "POST",
      payload: { motorista_id: state.config.motorista_id, km_saida: km, device_id: state.config.device_id }
    });
    await syncNow();
    renderAll();
  }

  async function finishTrip() {
    const trip = requireSelectedTrip();
    const kmFinal = Number($("#kmFinalInput").value);
    const kmInicial = Number(trip.km_saida || $("#kmInicialInput").value);
    if (!Number.isFinite(kmFinal) || kmFinal <= 0) {
      alert("Informe o KM final para concluir.");
      return;
    }
    if (Number.isFinite(kmInicial) && kmFinal <= kmInicial) {
      alert("KM final deve ser maior que KM inicial.");
      return;
    }
    trip.km_retorno = kmFinal;
    trip.status = kmFinal - kmInicial > 800 ? "PENDENTE_REVISAO" : "CONCLUIDA";
    await store.put("viagens", trip);
    await store.addPending("eventosPendentes", {
      tipo: "finalizacao",
      endpoint: `/api/driver/trips/${trip.id}/finalizar`,
      method: "POST",
      payload: { motorista_id: state.config.motorista_id, km_final: kmFinal, device_id: state.config.device_id }
    });
    await syncNow();
    renderAll();
  }

  async function passengerAction(passengerId, action) {
    const passenger = state.passengers.find((item) => String(item.id) === String(passengerId));
    if (!passenger) return;
    const statusMap = { boarding: "EMBARCADO", dropoff: "DESEMBARCADO", absent: "AUSENTE", desistiu: "DESISTIU" };
    const endpointMap = { boarding: "boarding", dropoff: "dropoff", absent: "absent", desistiu: "absent" };
    passenger.status = statusMap[action] || passenger.status;
    await store.put("passageiros", passenger);
    await store.addPending("eventosPendentes", {
      tipo: `passageiro_${action}`,
      endpoint: `/api/driver/passengers/${passenger.id}/${endpointMap[action]}`,
      method: "POST",
      payload: { motorista_id: state.config.motorista_id, viagem_id: passenger.viagem_id, device_id: state.config.device_id }
    });
    if (action === "absent" || action === "desistiu") {
      await createOccurrence(action === "absent" ? "paciente_ausente" : "paciente_desistiu", `Passageiro ${passenger.nome} marcado como ${passenger.status}.`);
    }
    await syncNow();
    renderAll();
  }

  async function flowAction(action) {
    const trip = requireSelectedTrip();
    await store.addPending("eventosPendentes", {
      tipo: `fluxo_${action}`,
      endpoint: `/api/driver/trips/${trip.id}/flow`,
      method: "POST",
      payload: { action, motorista_id: state.config.motorista_id, device_id: state.config.device_id }
    });
    trip.status = action.toUpperCase();
    await store.put("viagens", trip);
    await syncNow();
    renderAll();
  }

  async function saveOccurrence() {
    const type = $("#occurrenceType").value;
    const description = $("#occurrenceDescription").value.trim() || "Ocorrencia registrada pelo motorista.";
    await createOccurrence(type, description);
    await syncNow();
    $("#occurrenceDescription").value = "";
    alert("Ocorrencia registrada.");
    renderAll();
  }

  async function triggerPanic() {
    await createOccurrence("PANICO", "Botao de panico acionado pelo motorista.");
    await syncNow();
    alert("Ocorrencia registrada. A central sera notificada assim que houver conexao.");
  }

  async function createOccurrence(type, description) {
    const trip = state.selectedTrip;
    const gps = await capturePosition();
    const payload = {
      id: `oco-${Date.now()}-${cryptoRandom()}`,
      tipo: type,
      descricao: description,
      viagem_id: trip?.id || null,
      motorista_id: state.config.motorista_id,
      device_id: state.config.device_id,
      latitude: gps?.latitude || null,
      longitude: gps?.longitude || null,
      created_at: new Date().toISOString()
    };
    await store.put("ocorrencias", payload);
    await store.addPending("eventosPendentes", {
      tipo: type === "PANICO" ? "panico" : "ocorrencia",
      endpoint: type === "PANICO" ? "/api/driver/panic" : "/api/driver/occurrences",
      method: "POST",
      payload
    });
  }

  async function saveMessageReply() {
    const text = $("#messageReplyInput").value.trim();
    if (!text) return;
    const payload = {
      id: `msg-${Date.now()}-${cryptoRandom()}`,
      texto: text,
      author: "Motorista",
      motorista_id: state.config.motorista_id,
      device_id: state.config.device_id,
      created_at: new Date().toISOString()
    };
    await store.put("mensagens", payload);
    await store.addPending("eventosPendentes", {
      tipo: "mensagem",
      endpoint: "/api/mensagens",
      method: "POST",
      payload
    });
    $("#messageReplyInput").value = "";
    await syncNow();
    renderAll();
  }

  async function syncNow() {
    if (!state.config || state.syncing) return;
    if (!navigator.onLine) {
      updateConnectionBadge();
      renderAll();
      return;
    }
    state.syncing = true;
    updateConnectionBadge("Sincronizando");
    try {
      await syncStore("localizacoesPendentes");
      await syncStore("eventosPendentes");
      await store.setConfig({ ...state.config, last_sync_at: new Date().toISOString() });
      state.config = await store.getConfig();
    } finally {
      state.syncing = false;
      updateConnectionBadge();
      renderAll();
    }
  }

  async function syncStore(storeName) {
    const items = await store.getAll(storeName);
    for (const item of items.filter((entry) => entry.status !== "confirmado")) {
      try {
        item.status = "enviando";
        item.tentativas = Number(item.tentativas || 0) + 1;
        item.updated_at = new Date().toISOString();
        await store.put(storeName, item);
        const response = await motoristaFetch(`${state.config.api_base_url}${item.endpoint}`, {
          method: item.method || "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(item.payload)
        });
        await readJsonResponse(response, `HTTP ${response.status}`);
        await store.remove(storeName, item.id);
      } catch (error) {
        item.status = "erro";
        item.erro = error.message;
        item.updated_at = new Date().toISOString();
        await store.put(storeName, item);
      }
    }
  }

  function startGpsLoop() {
    if (state.gpsTimer) window.clearInterval(state.gpsTimer);
    captureAndQueueGps();
    state.gpsTimer = window.setInterval(captureAndQueueGps, currentGpsInterval());
  }

  function currentGpsInterval() {
    const status = String(state.selectedTrip?.status || "").toUpperCase();
    return status.includes("ESPERA") ? 120000 : 30000;
  }

  async function captureAndQueueGps() {
    if (!state.config || !state.selectedTrip || isTripFinished(state.selectedTrip.status)) return;
    const position = await capturePosition();
    if (!position) return;
    await store.addPending("localizacoesPendentes", {
      tipo: "gps",
      endpoint: "/api/gps",
      method: "POST",
      payload: {
        viagem_id: state.selectedTrip.id,
        veiculo_id: state.selectedTrip.veiculo_id || state.selectedTrip.veiculoId || null,
        motorista_id: state.config.motorista_id,
        device_id: state.config.device_id,
        latitude: position.latitude,
        longitude: position.longitude,
        velocidade: position.velocidade,
        precisao: position.precisao,
        direcao: position.direcao,
        status_viagem: state.selectedTrip.status,
        timestamp_dispositivo: new Date().toISOString()
      }
    });
    await syncNow();
  }

  function capturePosition() {
    if (!("geolocation" in navigator)) return Promise.resolve(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = pos.coords || {};
          const latitude = Number(coords.latitude);
          const longitude = Number(coords.longitude);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            resolve(null);
            return;
          }
          const now = Date.now();
          let velocidade = Number.isFinite(coords.speed) && coords.speed !== null ? Math.max(0, Math.round(coords.speed * 3.6)) : null;
          if (velocidade === null && state.lastGps) {
            const elapsedSeconds = Math.max(1, (now - state.lastGps.timestamp) / 1000);
            const meters = distanceMeters(state.lastGps.latitude, state.lastGps.longitude, latitude, longitude);
            const computed = Math.round((meters / elapsedSeconds) * 3.6);
            if (Number.isFinite(computed) && computed >= 0 && computed < 180) velocidade = computed;
          }
          state.lastGps = { latitude, longitude, timestamp: now };
          resolve({
            latitude,
            longitude,
            velocidade,
            precisao: Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : null,
            direcao: Number.isFinite(coords.heading) ? Math.round(coords.heading) : null
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 20000 }
      );
    });
  }

  function distanceMeters(lat1, lon1, lat2, lon2) {
    const toRad = (value) => Number(value) * Math.PI / 180;
    const radius = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function handleDocumentClick(event) {
    const tripButton = event.target.closest("[data-trip-id]");
    if (tripButton) selectTrip(tripButton.dataset.tripId);
    const passengerButton = event.target.closest("[data-passenger-id][data-action]");
    if (passengerButton) passengerAction(passengerButton.dataset.passengerId, passengerButton.dataset.action);
    const flowButton = event.target.closest("[data-flow]");
    if (flowButton) flowAction(flowButton.dataset.flow);
  }

  function showDashboard() {
    $("#pairingSection").hidden = true;
    $("#dashboardSection").hidden = false;
  }

  function showPairing() {
    $("#pairingSection").hidden = false;
    $("#dashboardSection").hidden = true;
  }

  function renderAll() {
    renderDriver();
    renderTrips();
    renderTripDetail();
    renderPending();
  }

  function renderDriver() {
    if (!state.config) return;
    $("#driverName").textContent = state.config.motorista_nome || "Motorista";
    $("#driverDevice").textContent = `${state.config.device_name || "Dispositivo"} - ${state.config.device_id || "--"}`;
    $("#lastSync").textContent = state.config.last_sync_at ? formatTime(state.config.last_sync_at) : "Nunca";
    $("#statusConnection").textContent = navigator.onLine ? "Online" : "Offline";
  }

  async function renderPending() {
    const eventItems = await store.getAll("eventosPendentes");
    const gpsItems = await store.getAll("localizacoesPendentes");
    const pending = [...eventItems, ...gpsItems];
    $("#pendingCount").textContent = String(pending.length);
    const target = $("#pendingList");
    if (!target) return;
    target.classList.toggle("empty", pending.length === 0);
    target.innerHTML = pending.length ? pending.map((item) => `
      <article class="pending-card"><strong>${escapeText(item.tipo || "pendencia")}</strong><span>${escapeText(item.status || "pendente")} - tentativas: ${Number(item.tentativas || 0)}</span></article>
    `).join("") : "Sem pendencias.";
  }

  function renderTrips() {
    const target = $("#tripsList");
    if (!target) return;
    target.classList.toggle("empty", state.trips.length === 0);
    target.innerHTML = state.trips.length ? state.trips.map((trip) => `
      <article class="trip-card">
        <strong>${escapeText(trip.codigo || trip.id)}</strong>
        <span>${escapeText(trip.origem)} -> ${escapeText(trip.destino)}</span>
        <span>Status: ${escapeText(trip.status)} | Passageiros: ${passengersForTrip(trip.id).length}</span>
        <div class="trip-actions"><button class="ghost-button" data-trip-id="${escapeText(trip.id)}" type="button">Abrir viagem</button></div>
      </article>
    `).join("") : "Nenhuma viagem carregada.";
  }

  function renderTripDetail() {
    const section = $("#tripDetailSection");
    if (!section) return;
    section.hidden = !state.selectedTrip;
    if (!state.selectedTrip) return;
    const trip = state.selectedTrip;
    $("#tripTitle").textContent = trip.codigo || trip.id;
    $("#tripStatus").textContent = trip.status || "--";
    $("#kmInicialInput").value = trip.km_saida || "";
    $("#kmFinalInput").value = trip.km_retorno || "";
    $("#tripSummary").innerHTML = [
      ["Origem", trip.origem],
      ["Destino", trip.destino],
      ["Prioridade", trip.prioridade || "NORMAL"],
      ["Data", trip.data_viagem || trip.dataViagem || "--"]
    ].map(([label, value]) => `<div><span>${label}</span><strong>${escapeText(value || "--")}</strong></div>`).join("");
    renderPassengers();
  }

  function renderPassengers() {
    const passengers = passengersForTrip(state.selectedTrip.id);
    const target = $("#passengersList");
    target.innerHTML = passengers.length ? passengers.map((passenger) => `
      <article class="passenger-card">
        <strong>${escapeText(passenger.nome)}</strong>
        <span>Status: ${escapeText(passenger.status || "AGUARDANDO")}</span>
        <div class="passenger-actions">
          <button class="ghost-button" data-passenger-id="${escapeText(passenger.id)}" data-action="boarding" type="button">Embarcou</button>
          <button class="ghost-button" data-passenger-id="${escapeText(passenger.id)}" data-action="dropoff" type="button">Desembarcou</button>
          <button class="ghost-button" data-passenger-id="${escapeText(passenger.id)}" data-action="absent" type="button">Ausente</button>
          <button class="ghost-button" data-passenger-id="${escapeText(passenger.id)}" data-action="desistiu" type="button">Desistiu</button>
        </div>
      </article>
    `).join("") : `<div class="list empty">Sem passageiros nesta viagem.</div>`;
  }

  function passengersForTrip(tripId) {
    return state.passengers.filter((passenger) => String(passenger.viagem_id || passenger.viagemId) === String(tripId));
  }

  function selectTab(name) {
    $$(".tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === name));
    $$(".tab-panel").forEach((panel) => { panel.hidden = panel.id !== `tab-${name}`; });
  }

  function updateConnectionBadge(forcedText) {
    const badge = $("#connectionBadge");
    if (!badge) return;
    badge.classList.remove("online", "offline", "syncing");
    if (forcedText) {
      badge.textContent = forcedText;
      badge.classList.add("syncing");
    } else {
      badge.textContent = navigator.onLine ? "Online" : "Offline";
      badge.classList.add(navigator.onLine ? "online" : "offline");
    }
  }

  function requireSelectedTrip() {
    if (!state.selectedTrip) throw new Error("Selecione uma viagem.");
    return state.selectedTrip;
  }

  function setMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = `message ${type || ""}`;
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Nunca";
    return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function cryptoRandom() {
    const array = new Uint32Array(2);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(array);
      return Array.from(array).map((value) => value.toString(16)).join("");
    }
    return Math.random().toString(16).slice(2);
  }

  function escapeText(value) {
    if (window.App?.Sanitize?.escapeHtml) return window.App.Sanitize.escapeHtml(value);
    return String(value ?? "").replace(/[&<>"'`]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;", "`": "&#096;" }[char]));
  }

  window.AppMotorista = { confirmarPareamento, syncNow, fetchTrips };
})();
