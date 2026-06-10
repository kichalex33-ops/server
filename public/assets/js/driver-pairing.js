let activePairingId = null;
let activePairingPolling = null;
let activeQr = null;
let operatorDriversCache = [];

async function loadOperatorDrivers() {
  const target = document.querySelector("#operatorDrivers");
  if (!target) return;
  target.innerHTML = `<tr><td colspan="8">Carregando motoristas...</td></tr>`;
  try {
    const response = await fetch("/api/motoristas");
    const body = await response.json();
    const drivers = normalizeDriversResponse(body);
    operatorDriversCache = drivers;
    target.innerHTML = drivers.length ? drivers.map((driver) => `
      <tr>
        <td>${escapePairingText(driver.nome || driver.id)}</td>
        <td>${escapePairingText(driver.telefone || "--")}</td>
        <td>${escapePairingText(driver.cnh || "--")}</td>
        <td>${escapePairingText(driver.categoria_cnh || "--")}</td>
        <td>${escapePairingText(formatDriverDate(driver.validade_cnh))}</td>
        <td><span class="status ${String(driver.status || "").toLowerCase() === "ativo" ? "ok" : "info"}">${escapePairingText(driver.status || "ativo")}</span></td>
        <td>${driver.app_pareado ? '<span class="status ok">Sim</span>' : '<span class="status info">Não</span>'}</td>
        <td>
          <div class="row-actions">
            <button class="qr-button" type="button" data-driver-id="${escapePairingText(driver.id)}" data-driver-name="${escapePairingText(driver.nome || driver.id)}">Gerar QR do App</button>
            <button class="edit-driver-button" type="button" data-edit-driver-id="${escapePairingText(driver.id)}">Editar</button>
          </div>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="8">Nenhum motorista cadastrado.</td></tr>`;
  } catch (error) {
    target.innerHTML = `<tr><td colspan="8">Falha ao carregar motoristas: ${escapePairingText(error.message)}</td></tr>`;
  }
}

function normalizeDriversResponse(body) {
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.data?.motoristas)) return body.data.motoristas;
  if (Array.isArray(body.motoristas)) return body.motoristas;
  return [];
}

function openDriverForm(driver = null) {
  const modal = document.querySelector("#driverFormModal");
  const form = document.querySelector("#driverForm");
  if (!modal || !form) return;
  form.reset();
  setPairingText("#driverFormError", "");
  setPairingText("#driverFormTitle", driver ? "Editar Motorista" : "Novo Motorista");
  setInputValue("#driverId", driver?.id || "");
  setInputValue("#driverName", driver?.nome || "");
  setInputValue("#driverCpf", driver?.cpf || "");
  setInputValue("#driverPhone", driver?.telefone || "");
  setInputValue("#driverCnh", driver?.cnh || "");
  setInputValue("#driverCnhCategory", driver?.categoria_cnh || "");
  setInputValue("#driverCnhValidity", normalizeInputDate(driver?.validade_cnh || ""));
  setInputValue("#driverStatus", driver?.status || "ativo");
  setInputValue("#driverNotes", driver?.observacoes || "");
  modal.hidden = false;
}

function closeDriverForm() {
  const modal = document.querySelector("#driverFormModal");
  if (modal) modal.hidden = true;
}

async function saveDriver(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    nome: form.elements.nome.value.trim(),
    cpf: form.elements.cpf.value.trim(),
    telefone: form.elements.telefone.value.trim(),
    cnh: form.elements.cnh.value.trim(),
    categoria_cnh: form.elements.categoria_cnh.value.trim(),
    validade_cnh: form.elements.validade_cnh.value,
    status: form.elements.status.value,
    observacoes: form.elements.observacoes.value.trim()
  };
  const validationError = validateDriverForm(payload);
  if (validationError) {
    setPairingText("#driverFormError", validationError);
    return;
  }

  const id = form.elements.id.value;
  const url = id ? `/api/motoristas/${encodeURIComponent(id)}` : "/api/motoristas";
  const method = id ? "PUT" : "POST";
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  if (!response.ok || !body.ok) {
    setPairingText("#driverFormError", body.error || "Nao foi possivel salvar o motorista.");
    return;
  }

  closeDriverForm();
  showDriverMessage(id ? "Motorista atualizado com sucesso." : "Motorista cadastrado com sucesso.");
  await loadOperatorDrivers();
}

function validateDriverForm(payload) {
  if (!payload.nome) return "Nome e obrigatorio.";
  if (!payload.telefone) return "Telefone e obrigatorio.";
  if (!payload.status) return "Status e obrigatorio.";
  return "";
}

function showDriverMessage(message) {
  const target = document.querySelector("#driverFormMessage");
  if (!target) return;
  target.textContent = message;
  target.hidden = false;
  window.setTimeout(() => {
    target.hidden = true;
  }, 4000);
}

function openDriverPairingModal(motoristaId, motoristaNome) {
  const modal = document.querySelector("#driverPairingModal");
  if (!modal) return;
  setPairingText("#driverPairingDriver", motoristaNome || motoristaId);
  setPairingText("#driverPairingStatus", "Gerando QR seguro...");
  setPairingText("#driverPairingExpires", "--");
  setPairingText("#driverPairingPayload", "{}");
  const qrTarget = document.querySelector("#driverPairingQr");
  if (qrTarget) qrTarget.innerHTML = "";
  modal.hidden = false;
  createDriverPairing(motoristaId).catch((error) => {
    setPairingText("#driverPairingStatus", `Falha ao gerar QR: ${error.message}`);
  });
}

async function createDriverPairing(motoristaId) {
  const response = await fetch(`/api/operator/drivers/${encodeURIComponent(motoristaId)}/pairing`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ server_url: window.location.origin })
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "Nao foi possivel gerar o QR.");
  const pairing = body.data;
  activePairingId = pairing.qrPayload.pairing_id;
  renderDriverPairingQRCode(pairing.qrPayload);
  setPairingText("#driverPairingStatus", "Aguardando leitura do app");
  setPairingText("#driverPairingExpires", `Expira em: ${formatPairingDate(pairing.qrPayload.expires_at)}`);
  setPairingText("#driverPairingPayload", JSON.stringify(pairing.qrPayload, null, 2));
  startPairingStatusPolling(activePairingId);
  return pairing;
}

function renderDriverPairingQRCode(qrPayload) {
  const target = document.querySelector("#driverPairingQr");
  if (!target) return;
  const text = JSON.stringify(qrPayload);
  target.innerHTML = "";
  activeQr = new QRCode(target, {
    text,
    width: 256,
    height: 256,
    correctLevel: QRCode.CorrectLevel.M
  });
}

function startPairingStatusPolling(pairingId) {
  stopPairingStatusPolling();
  activePairingPolling = window.setInterval(async () => {
    try {
      const response = await fetch(`/api/operator/pairings/${encodeURIComponent(pairingId)}/status`);
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Falha ao consultar status.");
      const status = body.data.status;
      if (status === "CONFIRMADO") {
        setPairingText("#driverPairingStatus", "App pareado com sucesso");
        stopPairingStatusPolling();
      } else if (status === "EXPIRADO") {
        setPairingText("#driverPairingStatus", "QR expirado. Gere um novo pareamento.");
        stopPairingStatusPolling();
      } else if (status === "CANCELADO") {
        setPairingText("#driverPairingStatus", "Pareamento cancelado.");
        stopPairingStatusPolling();
      } else {
        setPairingText("#driverPairingStatus", "Aguardando leitura do app");
      }
    } catch (error) {
      setPairingText("#driverPairingStatus", `Falha ao atualizar status: ${error.message}`);
    }
  }, 3000);
}

function stopPairingStatusPolling() {
  if (activePairingPolling) {
    window.clearInterval(activePairingPolling);
    activePairingPolling = null;
  }
}

async function cancelPairing(pairingId) {
  if (!pairingId) return;
  const response = await fetch(`/api/operator/pairings/${encodeURIComponent(pairingId)}/cancel`, {
    method: "POST",
    headers: { Accept: "application/json" }
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "Nao foi possivel cancelar.");
  setPairingText("#driverPairingStatus", "Pareamento cancelado.");
  stopPairingStatusPolling();
}

function closeDriverPairingModal() {
  stopPairingStatusPolling();
  activePairingId = null;
  activeQr = null;
  const modal = document.querySelector("#driverPairingModal");
  if (modal) modal.hidden = true;
}

function bindDriverPairingUi() {
  document.querySelector("#operatorDrivers")?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-driver-id]");
    if (editButton) {
      const driver = operatorDriversCache.find((item) => String(item.id) === String(editButton.dataset.editDriverId));
      openDriverForm(driver);
      return;
    }
    const button = event.target.closest("[data-driver-id]");
    if (!button) return;
    openDriverPairingModal(button.dataset.driverId, button.dataset.driverName);
  });
  document.querySelector("#refreshDriversBtn")?.addEventListener("click", loadOperatorDrivers);
  document.querySelector("#newDriverBtn")?.addEventListener("click", () => openDriverForm());
  document.querySelector("#driverFormCloseBtn")?.addEventListener("click", closeDriverForm);
  document.querySelector("#driverFormCancelBtn")?.addEventListener("click", closeDriverForm);
  document.querySelector("#driverForm")?.addEventListener("submit", (event) => {
    saveDriver(event).catch((error) => setPairingText("#driverFormError", error.message));
  });
  document.querySelector("#driverPairingCloseBtn")?.addEventListener("click", closeDriverPairingModal);
  document.querySelector("#driverPairingCancelBtn")?.addEventListener("click", () => {
    cancelPairing(activePairingId).catch((error) => {
      setPairingText("#driverPairingStatus", `Falha ao cancelar: ${error.message}`);
    });
  });
  loadOperatorDrivers();
}

function setPairingText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function formatPairingDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDriverDate(value) {
  if (!value) return "--";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function normalizeInputDate(value) {
  return String(value || "").slice(0, 10);
}

function setInputValue(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.value = value;
}

function escapePairingText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

bindDriverPairingUi();
