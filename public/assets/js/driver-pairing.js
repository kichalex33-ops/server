let activePairingId = null;
let activePairingPolling = null;
let activeQr = null;

async function loadOperatorDrivers() {
  const target = document.querySelector("#operatorDrivers");
  if (!target) return;
  target.innerHTML = `<tr><td colspan="5">Carregando motoristas...</td></tr>`;
  try {
    const response = await fetch("/api/motoristas");
    const body = await response.json();
    const drivers = body.data || [];
    target.innerHTML = drivers.length ? drivers.map((driver) => `
      <tr>
        <td>${escapePairingText(driver.nome || driver.id)}</td>
        <td>${escapePairingText(driver.telefone || "--")}</td>
        <td><span class="status ${String(driver.status || "").toLowerCase() === "ativo" ? "ok" : "info"}">${escapePairingText(driver.status || "ativo")}</span></td>
        <td>Disponivel para pareamento</td>
        <td><button class="qr-button" type="button" data-driver-id="${escapePairingText(driver.id)}" data-driver-name="${escapePairingText(driver.nome || driver.id)}">Gerar QR do App</button></td>
      </tr>
    `).join("") : `<tr><td colspan="5">Nenhum motorista cadastrado.</td></tr>`;
  } catch (error) {
    target.innerHTML = `<tr><td colspan="5">Falha ao carregar motoristas: ${escapePairingText(error.message)}</td></tr>`;
  }
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
    const button = event.target.closest("[data-driver-id]");
    if (!button) return;
    openDriverPairingModal(button.dataset.driverId, button.dataset.driverName);
  });
  document.querySelector("#refreshDriversBtn")?.addEventListener("click", loadOperatorDrivers);
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

function escapePairingText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

bindDriverPairingUi();
