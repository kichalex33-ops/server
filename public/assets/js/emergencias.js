let selectedEmergencyId = null;
let soundEnabled = true;

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...options,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "Falha operacional.");
  return body.data;
}

async function loadEmergencies() {
  const data = await api("/api/emergencias");
  const list = document.querySelector("#emergencyList");
  list.innerHTML = (data.emergencias || []).map((item) => `
    <article class="emergency-card ${item.id === selectedEmergencyId ? "active" : ""}" data-id="${escapeHtml(item.id)}">
      <h3>${escapeHtml(item.tipo)} - ${escapeHtml(item.status)}</h3>
      <div class="meta">
        <div><span>Veiculo</span><strong>${escapeHtml(item.veiculo.prefixo || item.veiculo.placa || "-")}</strong></div>
        <div><span>Motorista</span><strong>${escapeHtml(item.motorista.nome || "-")}</strong></div>
        <div><span>Telefone</span><strong>${escapeHtml(item.motorista.telefone || "-")}</strong></div>
        <div><span>Cronometro</span><strong>${formatTimer(item.cronometro_segundos)}</strong></div>
      </div>
    </article>
  `).join("") || "<p>Nenhuma emergencia aberta.</p>";
  document.querySelectorAll(".emergency-card").forEach((card) => card.addEventListener("click", () => selectEmergency(data.emergencias.find((item) => item.id === card.dataset.id))));
  if (!selectedEmergencyId && data.emergencias && data.emergencias[0]) selectEmergency(data.emergencias[0]);
}

function selectEmergency(item) {
  if (!item) return;
  selectedEmergencyId = item.id;
  document.querySelector("#selectedStatus").textContent = item.status;
  document.querySelector("#emergencyDetail").innerHTML = `
    <div class="meta">
      <div><span>Tipo</span><strong>${escapeHtml(item.tipo)}</strong></div>
      <div><span>Responsavel</span><strong>${escapeHtml(item.responsavel || "-")}</strong></div>
      <div><span>GPS</span><strong>${item.gps ? `${item.gps.latitude}, ${item.gps.longitude}` : "-"}</strong></div>
      <div><span>Viagem</span><strong>${escapeHtml(item.viagem.id || "-")}</strong></div>
    </div>
    <p>${escapeHtml(item.observacoes || "Sem observacoes.")}</p>
    <strong>Protocolo: ${(item.protocolo || []).length} registros</strong>
  `;
  loadEmergencies().catch(() => {});
}

document.querySelector("#refreshButton").addEventListener("click", () => loadEmergencies().catch(showError));
document.querySelector("#soundToggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  document.querySelector("#soundToggle").textContent = soundEnabled ? "Som configuravel" : "Som desligado";
});
document.querySelector("#protocolForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedEmergencyId) return;
  const form = new FormData(event.currentTarget);
  await api(`/api/emergencias/${selectedEmergencyId}/atender`, {
    method: "POST",
    body: Object.fromEntries(form.entries())
  });
  await loadEmergencies();
});
document.querySelector("#finishButton").addEventListener("click", async () => {
  if (!selectedEmergencyId) return;
  await api(`/api/emergencias/${selectedEmergencyId}/finalizar`, {
    method: "POST",
    body: { responsavel: document.querySelector("[name='responsavel']").value || "Operador", observacoes: "Encerramento pela central" }
  });
  await loadEmergencies();
});

function formatTimer(seconds) {
  const value = Number(seconds || 0);
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function showError(error) {
  document.querySelector("#emergencyList").innerHTML = `<p>${escapeHtml(error.message)}</p>`;
}

loadEmergencies().catch(showError);
setInterval(() => loadEmergencies().catch(() => {}), 15000);
