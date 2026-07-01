(function () {
  const target = ["operatorLiveMap", "managementLiveMap", "liveMap"]
    .map((id) => document.getElementById(id))
    .find(Boolean);
  if (!target || !window.L || !window.apiUrl) return;

  const refreshMs = 20000;
  const defaultCenter = getConfiguredCenter();
  const defaultZoom = Number(window.PAINEL_DEFAULT_CITY_ZOOM || 13);
  const map = L.map(target, { zoomControl: true, scrollWheelZoom: true }).setView(defaultCenter, defaultZoom);
  const markers = new Map();
  let fitted = false;
  let operatorLocationKnown = false;
  let operatorMarker = null;
  let operatorAccuracyCircle = null;

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const message = document.createElement("div");
  message.className = "mapa-mensagem mapa-vazio";
  message.textContent = "Aguardando localizações reais dos veículos.";
  target.parentElement.appendChild(message);

  addLocateControl();
  restoreSavedOperatorLocation();
  bindMapResizeFixes();
  locateOperator({ initial: true, silent: true });

  async function update() {
    try {
      const request = window.authFetch || window.fetch;
      const response = await request(window.apiUrl("/live-map"), { headers: { Accept: "application/json" } });
      const body = await response.json();
      if (response.status === 401 || response.status === 403) throw new Error(body.error || "Token inválido ou expirado.");
      if (!response.ok || body.ok !== true) throw new Error(body.error || "Mapa indisponível.");
      const data = body.data || {};
      const source = Array.isArray(data.items) ? data.items : (Array.isArray(data.veiculos) ? data.veiculos : []);
      const items = source.map(normalizeItem).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
      render(items);
      updateStats(items, data);
      showMessage(items.length ? "" : "Nenhum veículo possui localização registrada.", "empty");
    } catch (error) {
      showMessage(error.message || "Não foi possível atualizar o mapa.", "error");
      setStat("updated", "Erro");
    }
  }

  function normalizeItem(item) {
    return {
      id: String(item.id || item.veiculo_id || item.viagem_id || ""),
      nome: item.nome || item.prefixo || item.placa || item.veiculo_nome || "Veículo",
      motorista: item.motorista || item.motorista_nome || "Motorista não informado",
      status: item.status || item.status_viagem || "sem_status",
      viagemId: item.viagem_id || "",
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      atualizadoEm: item.atualizado_em || item.ultima_atualizacao || item.ultima_localizacao?.criado_em || null,
      velocidade: item.velocidade ?? null,
      estadoRota: item.estado_rota || item.status_rota || item.status || item.status_viagem || "sem_status",
      tipoAlerta: item.tipo_alerta || null,
      gpsSemAtualizacao: Boolean(item.gps_sem_atualizacao),
      wazeUrl: item.waze_url || wazeUrl(item.latitude, item.longitude),
      alerta: Boolean(item.alerta ?? item.alerta_ativo),
      cor: item.cor_status || "CINZA"
    };
  }

  function render(items) {
    const visible = new Set();
    const bounds = [];
    items.forEach((item) => {
      visible.add(item.id);
      const position = [item.latitude, item.longitude];
      bounds.push(position);
      let marker = markers.get(item.id);
      if (!marker) {
        marker = L.marker(position, { icon: markerIcon(item) }).addTo(map);
        markers.set(item.id, marker);
      }
      marker.setLatLng(position).setIcon(markerIcon(item)).bindPopup(popupContent(item));
    });
    for (const [id, marker] of markers.entries()) {
      if (!visible.has(id)) {
        map.removeLayer(marker);
        markers.delete(id);
      }
    }

    // Se o operador permitiu localização, o mapa abre na cidade/local dele e
    // não é deslocado automaticamente para a frota. O botão de zoom do Leaflet
    // continua disponível para o operador ajustar manualmente.
    if (!fitted && !operatorLocationKnown && bounds.length) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 15 });
      fitted = true;
    }
    invalidateSoon();
  }

  function markerIcon(item) {
    const status = item.alerta ? "VERMELHO" : item.cor;
    const label = String(item.nome).slice(0, 8);
    return L.divIcon({
      className: "mapa-marker-wrap",
      html: `<span class="mapa-marker status-${escapeHtml(status)}">${escapeHtml(label)}</span>`,
      iconSize: [54, 34],
      iconAnchor: [27, 17],
      popupAnchor: [0, -20]
    });
  }

  function popupContent(item) {
    const content = document.createElement("div");
    content.className = "mapa-popup";
    appendLine(content, item.nome, "strong");
    appendLine(content, `Motorista: ${item.motorista}`);
    appendLine(content, `Status: ${formatStatus(item.status)}`);
    appendLine(content, `Estado da rota: ${formatStatus(item.estadoRota)}`);
    appendLine(content, `Velocidade: ${formatVelocity(item.velocidade)}`);
    if (item.viagemId) appendLine(content, `Viagem: ${item.viagemId}`);
    if (item.tipoAlerta) appendLine(content, `Alerta: ${formatStatus(item.tipoAlerta)}`);
    appendLine(content, `Último GPS: ${formatDate(item.atualizadoEm)}`);
    appendWazeLink(content, item.wazeUrl);
    appendTripDetailsButton(content, item.viagemId);
    return content;
  }

  function appendLine(parent, text, tag = "span") {
    const line = document.createElement(tag);
    line.textContent = text;
    parent.appendChild(line);
  }

  function appendWazeLink(parent, url) {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "mapa-popup-link";
    link.textContent = "Abrir no Waze";
    parent.appendChild(link);
  }

  function appendTripDetailsButton(parent, viagemId) {
    if (!viagemId || !window.App || !window.App.OperatorWorkflow) return;
    const actions = document.createElement("div");
    actions.className = "h546-map-popup-actions";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Ver detalhes da viagem";
    button.addEventListener("click", () => window.App.OperatorWorkflow.openTripById(String(viagemId)));
    actions.appendChild(button);
    parent.appendChild(actions);
  }

  function addLocateControl() {
    const LocateControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd() {
        const container = L.DomUtil.create("div", "leaflet-bar leaflet-control mapa-localizacao-control");
        const button = L.DomUtil.create("button", "mapa-localizacao-botao", container);
        button.type = "button";
        button.title = "Usar minha localização";
        button.setAttribute("aria-label", "Centralizar mapa na minha localização");
        button.innerHTML = "⌖";
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(button, "click", (event) => {
          L.DomEvent.preventDefault(event);
          locateOperator({ initial: false, silent: false });
        });
        return container;
      }
    });
    map.addControl(new LocateControl());
  }

  function locateOperator({ initial = false, silent = false } = {}) {
    if (!navigator.geolocation) {
      if (!silent) showMessage("Este navegador nao permite localizar o operador.", "error");
      return;
    }

    if (!silent) showMessage("Obtendo sua localizacao...", "empty");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = position.coords || {};
        const lat = Number(coords.latitude);
        const lng = Number(coords.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          if (!silent) showMessage("Localizacao recebida sem coordenadas validas.", "error");
          return;
        }
        const accuracy = Number(coords.accuracy || 0);
        setOperatorLocation([lat, lng], accuracy, !initial);
        try {
          window.localStorage.setItem("painel-logistico-operador-location", JSON.stringify({ lat, lng, accuracy, savedAt: Date.now() }));
        } catch (_) {}
        if (!silent) showMessage("Mapa centralizado na sua localizacao.", "empty");
        window.setTimeout(() => showMessage("", "empty"), 1800);
      },
      (error) => {
        if (!silent) {
          const reason = error && error.code === 1
            ? "Permissao de localizacao negada. Ative a localizacao do navegador para abrir no seu municipio."
            : "Nao foi possivel obter sua localizacao agora.";
          showMessage(reason, "error");
        }
      },
      { enableHighAccuracy: false, maximumAge: 30 * 60 * 1000, timeout: 7000 }
    );
  }

  function setOperatorLocation(center, accuracy = 0, forceZoom = false) {
    operatorLocationKnown = true;
    fitted = true;
    map.setView(center, forceZoom ? 15 : Math.max(map.getZoom(), defaultZoom));

    if (!operatorMarker) {
      operatorMarker = L.marker(center, { icon: operatorIcon(), zIndexOffset: 1000 }).addTo(map).bindPopup("Minha localizacao / operador");
    } else {
      operatorMarker.setLatLng(center);
    }

    if (operatorAccuracyCircle) {
      operatorAccuracyCircle.setLatLng(center).setRadius(Number.isFinite(accuracy) ? accuracy : 0);
    } else {
      operatorAccuracyCircle = L.circle(center, {
        radius: Number.isFinite(accuracy) ? accuracy : 0,
        className: "mapa-localizacao-precisao"
      }).addTo(map);
    }

    invalidateSoon();
  }

  function operatorIcon() {
    return L.divIcon({
      className: "mapa-operador-wrap",
      html: `<span class="mapa-operador-marker" title="Minha localizacao">⌖</span>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18]
    });
  }

  function restoreSavedOperatorLocation() {
    try {
      const raw = window.localStorage.getItem("painel-logistico-operador-location");
      if (!raw) return;
      const saved = JSON.parse(raw);
      const lat = Number(saved.lat);
      const lng = Number(saved.lng);
      const accuracy = Number(saved.accuracy || 0);
      const savedAt = Number(saved.savedAt || 0);
      const isFresh = savedAt && (Date.now() - savedAt) < 12 * 60 * 60 * 1000;
      if (Number.isFinite(lat) && Number.isFinite(lng) && isFresh) setOperatorLocation([lat, lng], accuracy, false);
    } catch (_) {}
  }

  function getConfiguredCenter() {
    const configured = window.PAINEL_DEFAULT_CITY_CENTER;
    if (Array.isArray(configured) && configured.length >= 2) {
      const lat = Number(configured[0]);
      const lng = Number(configured[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }
    // Centro operacional padrão: São José do Sul / região de Montenegro - RS.
    return [-29.5448, -51.4826];
  }

  function bindMapResizeFixes() {
    invalidateSoon();
    window.addEventListener("resize", invalidateSoon);
    document.addEventListener("visibilitychange", invalidateSoon);
    document.querySelectorAll("[data-screen], .nav-section a, .menu-button, #refreshAllBtn").forEach((element) => {
      element.addEventListener("click", () => window.setTimeout(invalidateSoon, 250));
    });
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(invalidateSoon);
      observer.observe(target);
      observer.observe(target.parentElement || target);
    }
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(invalidateSoon);
      observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ["class", "style", "hidden"] });
    }
  }

  function invalidateSoon() {
    window.setTimeout(() => map.invalidateSize(), 80);
    window.setTimeout(() => map.invalidateSize(), 350);
  }

  function updateStats(items, data) {
    setStat("vehicles", items.length);
    setStat("drivers", new Set(items.map((item) => item.motorista).filter((name) => name !== "Motorista nao informado")).size);
    setStat("alerts", items.filter((item) => item.alerta).length || Number(data.indicadores?.alertasAtivos || 0));
    updateTime(data.atualizado_em || new Date().toISOString());
  }

  function updateTime(value) {
    setStat("updated", value ? formatDate(value) : "Sem atualização");
  }

  function setStat(name, value) {
    document.querySelectorAll(`[data-live-map-stat="${name}"]`).forEach((element) => { element.textContent = String(value); });
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.hidden = !text;
    message.className = `mapa-mensagem ${type === "error" ? "mapa-erro" : "mapa-vazio"}`;
  }

  function formatStatus(value) { return String(value || "sem status").replace(/_/g, " ").toLowerCase(); }
  function formatVelocity(value) { const speed = Number(value); return Number.isFinite(speed) ? `${speed.toFixed(speed % 1 ? 1 : 0)} km/h` : "-- km/h"; }
  function formatDate(value) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("pt-BR") : "Sem atualização"; }
  function wazeUrl(latitude, longitude) { const lat = Number(latitude); const lon = Number(longitude); return Number.isFinite(lat) && Number.isFinite(lon) ? `https://www.waze.com/ul?ll=${encodeURIComponent(`${lat},${lon}`)}&navigate=yes&zoom=17` : null; }
  function escapeHtml(value) { if (window.App?.Sanitize?.escapeHtml) return window.App.Sanitize.escapeHtml(value); return String(value ?? "").replace(/[&<>"'`]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;", "`": "&#096;" })[char]); }

  update();
  window.setInterval(update, refreshMs);
})();
