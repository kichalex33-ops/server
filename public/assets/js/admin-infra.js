async function getJson(path, options = {}) {
  const response = await window.authFetch(window.apiUrl(path), {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...options,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "Falha ao carregar infraestrutura.");
  return body.data;
}

async function loadInfra() {
  const infra = await getJson("/infra/status");
  renderCards(infra);
  renderServer(infra);
  renderBackups(infra.backups || []);
}

function renderCards(infra) {
  const cards = [
    ["Runtime", String(infra.servidor.runtime || "php").toUpperCase()],
    ["PHP", infra.servidor.php || "-"],
    ["GPS recebidos", infra.indicadores.gpsRecebidos],
    ["Alertas abertos", infra.indicadores.alertasAbertos],
    ["Sync pendentes", infra.indicadores.sincronizacoesPendentes],
    ["Emergencias", infra.indicadores.emergenciasAbertas],
    ["Backups", infra.storage.backupCount],
    ["Ultimo backup", infra.storage.lastBackup ? formatDate(infra.storage.lastBackup.created_at) : "-"]
  ];
  document.querySelector("#infraCards").innerHTML = cards.map(([label, value]) => `
    <article class="infra-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>
  `).join("");
}

function renderServer(infra) {
  const details = [
    ["Ambiente", infra.servidor.ambiente],
    ["Runtime", infra.servidor.runtime || "php"],
    ["PHP", infra.servidor.php || "-"],
    ["APP_URL", infra.servidor.appUrl || "-"],
    ["Logs", infra.storage.logsDir || "-"],
    ["Uploads", infra.storage.uploadDir || "-"],
    ["Backup dir", infra.storage.backupDir]
  ];
  document.querySelector("#serverDetails").innerHTML = details.map(([key, value]) => `
    <dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>
  `).join("");
}

function renderBackups(backups) {
  document.querySelector("#backupList").innerHTML = backups.map((backup) => `
    <article class="backup-item">
      <strong>${escapeHtml(backup.file)}</strong>
      <span>${formatBytes(backup.sizeBytes)} - ${formatDate(backup.created_at)}</span>
    </article>
  `).join("") || "<p>Nenhum backup encontrado.</p>";
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("pt-BR") : "-";
}

function escapeHtml(value) {
  if (window.App?.Sanitize?.escapeHtml) return window.App.Sanitize.escapeHtml(value);
  return String(value ?? "").replace(/[&<>"'`]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;", "`": "&#096;" }[char]));
}

loadInfra().catch((error) => {
  document.querySelector("#infraCards").innerHTML = `<article class="infra-card"><span>Erro</span><strong>${escapeHtml(error.message)}</strong></article>`;
});
