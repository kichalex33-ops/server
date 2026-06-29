
function bindManagerMenu() {
  const button = document.querySelector('.menu-button');
  const sideNav = document.querySelector('.side-nav');
  if (!button || !sideNav || button.dataset.menuBound === '1') return;
  button.dataset.menuBound = '1';
  const closeMenu = () => document.body.classList.remove('operator-menu-open');
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    document.body.classList.toggle('operator-menu-open');
  });
  document.addEventListener('click', (event) => {
    if (!document.body.classList.contains('operator-menu-open')) return;
    if (sideNav.contains(event.target) || button.contains(event.target)) return;
    closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
  sideNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
}

const apiRoot = window.PAINEL_API_ROOT || "/homologacao/api";
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const managerSession = window.loadAuthSession ? window.loadAuthSession() : null;
const managerProfile = String(managerSession?.usuario?.perfil || "").toUpperCase();
if (!managerSession?.accessToken || !["GESTOR", "ADMIN"].includes(managerProfile)) {
  if (window.clearAuthSession) window.clearAuthSession();
  sessionStorage.setItem("painel-logistico-login-message", "Este acesso é exclusivo do Painel Gestor.");
  window.location.href = "/homologacao/";
  throw new Error("Acesso ao Painel Gestor negado para este perfil.");
}

async function apiGet(path) {
  const response = await window.authFetch(`${apiRoot}${path}`, { headers: { Accept: "application/json" } });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "Falha ao carregar dados.");
  return body.data;
}

async function loadGestao() {
  const [dashboard, frota, motoristas, passageiros, custos, auditoria, viagensChart, custosChart, frotaChart, ocorrenciasChart] = await Promise.all([
    apiGet("/gestao/dashboard"),
    apiGet("/gestao/frota"),
    apiGet("/gestao/motoristas"),
    apiGet("/gestao/passageiros"),
    apiGet("/gestao/custos"),
    apiGet("/gestao/auditoria"),
    fetchChartData(window.apiUrl("/graficos/viagens")),
    fetchChartData(window.apiUrl("/graficos/custos")),
    fetchChartData(window.apiUrl("/graficos/frota")),
    fetchChartData(window.apiUrl("/graficos/ocorrencias"))
  ]);

  fillDashboard(dashboard, custos);
  loadManagerOperationalSummary().catch(() => {});
  fillRankings(frota, motoristas);
  fillPassengers(passageiros);
  fillAttention(dashboard);
  fillAudit(auditoria.itens || []);
  fillManagerCharts({
    viagens: viagensChart,
    custos: custosChart,
    frota: frotaChart,
    ocorrencias: ocorrenciasChart
  });
  bindAuthenticatedExports();
  bindManagerAiActions();
  bindManagerFloatingAiChat();
  bindOperatorManager();
  loadOperatorsManager().catch(showOperatorsManagerError);
  if (window.bindLogoutButtons) window.bindLogoutButtons();
}


// H4.20 AI - Assistente gerencial
function bindManagerAiActions() {
  const report = document.querySelector("#managerAiReportBtn");
  const ops = document.querySelector("#managerAiOpsBtn");
  const homolog = document.querySelector("#managerAiHomologBtn");
  const stats = document.querySelector("#managerAiStatsBtn");
  const routes = document.querySelector("#managerAiRoutesBtn");
  const ask = document.querySelector("#managerAiAskBtn");
  const copy = document.querySelector("#managerAiCopyBtn");
  if (report && !report.dataset.bound) {
    report.dataset.bound = "true";
    report.addEventListener("click", () => runManagerAi("report").catch(showManagerAiError));
  }
  if (ops && !ops.dataset.bound) {
    ops.dataset.bound = "true";
    ops.addEventListener("click", () => runManagerAi("ops").catch(showManagerAiError));
  }
  if (homolog && !homolog.dataset.bound) {
    homolog.dataset.bound = "true";
    homolog.addEventListener("click", () => runManagerAi("homolog").catch(showManagerAiError));
  }
  if (stats && !stats.dataset.bound) {
    stats.dataset.bound = "true";
    stats.addEventListener("click", () => runManagerAi("stats").catch(showManagerAiError));
  }
  if (routes && !routes.dataset.bound) {
    routes.dataset.bound = "true";
    routes.addEventListener("click", () => runManagerAi("routes").catch(showManagerAiError));
  }
  if (ask && !ask.dataset.bound) {
    ask.dataset.bound = "true";
    ask.addEventListener("click", () => runManagerAi("question").catch(showManagerAiError));
  }
  const promptBox = document.querySelector("#managerAiPrompt");
  if (promptBox && !promptBox.dataset.enterBound) {
    promptBox.dataset.enterBound = "true";
    promptBox.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        runManagerAi("question").catch(showManagerAiError);
      }
    });
  }
  if (copy && !copy.dataset.bound) {
    copy.dataset.bound = "true";
    copy.addEventListener("click", async () => {
      const text = document.querySelector("#managerAiResult")?.textContent || "";
      if (navigator.clipboard && text) await navigator.clipboard.writeText(text);
    });
  }
}

async function runManagerAi(mode, overridePrompt = null) {
  const result = document.querySelector("#managerAiResult");
  const status = document.querySelector("#managerAiStatus");
  const customPrompt = overridePrompt ?? (document.querySelector("#managerAiPrompt")?.value || "");
  if (result) {
    result.className = "ai-output loading";
    result.textContent = "Gerando análise gerencial com IA...";
  }
  if (status) status.textContent = "Processando";
  let path = "/ai/chat";
  let pergunta = customPrompt || "Gere um relatório gerencial objetivo com situação atual, riscos, gargalos e próximas ações.";
  let payload = { modo: mode || "report", pergunta };
  if (mode === "question") {
    if (!String(customPrompt || "").trim()) throw new Error("Digite uma pergunta para enviar à IA.");
    pergunta = String(customPrompt).trim();
    payload = { modo: "question", pergunta };
  }
  if (mode === "ops") {
    pergunta = customPrompt || "Resuma a operação atual para o gestor, destacando frota, motoristas, viagens e alertas.";
    payload = { modo: "operational_summary", pergunta };
  }
  if (mode === "homolog") {
    pergunta = customPrompt || "Liste pendências de homologação e pontos de atenção para colocar a logística em produção com segurança.";
    payload = { modo: "homologacao", pergunta };
  }
  if (mode === "stats") {
    pergunta = customPrompt || "Gere estatísticas executivas da regulação/logística, com números, gargalos e recomendações de gestão.";
    payload = { modo: "statistics", pergunta };
  }
  if (mode === "routes") {
    pergunta = customPrompt || "Analise rotas, clima, possíveis lentidões, riscos de atraso e impacto operacional para a gestão.";
    payload = { modo: "routes", pergunta };
    const geo = await getManagerGeolocation();
    if (geo) {
      payload.latitude = geo.latitude;
      payload.longitude = geo.longitude;
    }
  }
  const response = await aiPost(path, payload);
  if (result) {
    result.className = "ai-output";
    result.textContent = response.resposta || "A IA retornou sem texto.";
  }
  if (status) status.textContent = "Concluído";
  updateManagerFloatingAnswer(response.resposta || "A IA retornou sem texto.");
}

async function getManagerGeolocation() {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10 * 60 * 1000 }
    );
  });
}


async function aiPost(path, payload) {
  const endpoints = [];
  const mode = String(payload?.modo || payload?.mode || "").toLowerCase();
  const add = (item) => { if (item && !endpoints.includes(item)) endpoints.push(item); };
  add(path);
  if (mode.includes("stat")) add("/ai/statistics");
  if (mode.includes("route") || mode.includes("rota") || mode.includes("clima") || mode.includes("weather")) add("/ai/route-intelligence");
  if (mode.includes("weather") || mode.includes("tempo")) add("/ai/weather");
  add("/ai/chat");
  add("/ai/manager-report");

  let lastError = null;
  for (const endpoint of endpoints) {
    const response = await window.authFetch(window.apiUrl ? window.apiUrl(endpoint) : `${apiRoot}${endpoint}`, {
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

function bindManagerFloatingAiChat() {
  if (document.querySelector("#floatingAiChat")) return;
  const box = document.createElement("section");
  box.id = "floatingAiChat";
  box.className = "floating-ai-chat collapsed";
  box.innerHTML = `<button class="floating-ai-toggle" type="button">✦ IA</button>
    <div class="floating-ai-panel" aria-label="Chat com IA gerencial">
      <div class="floating-ai-header"><strong>Assistente IA</strong><button type="button" data-close-chat>×</button></div>
      <div id="floatingAiMessages" class="floating-ai-messages"><div class="ai-bubble bot">Pergunte sobre estatísticas, viagens, motoristas, rotas, clima ou pendências.</div></div>
      <form id="floatingAiForm" class="floating-ai-form"><textarea id="floatingAiPrompt" rows="2" placeholder="Digite sua pergunta..."></textarea><button id="floatingAiSend" type="submit">Enviar</button></form>
    </div>`;
  document.body.appendChild(box);
  box.querySelector(".floating-ai-toggle")?.addEventListener("click", () => box.classList.toggle("collapsed"));
  box.querySelector("[data-close-chat]")?.addEventListener("click", () => box.classList.add("collapsed"));
  const sendFloatingQuestion = async () => {
    const input = box.querySelector("#floatingAiPrompt");
    const textValue = String(input?.value || "").trim();
    if (!textValue) return;
    appendManagerFloatingMessage(textValue, "user");
    if (input) input.value = "";
    appendManagerFloatingMessage("Gerando resposta...", "bot", true);
    try {
      await runManagerAi("question", textValue);
    } catch (error) {
      updateManagerFloatingAnswer(error.message || String(error), true);
      showManagerAiError(error);
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

function appendManagerFloatingMessage(message, type = "bot", loading = false) {
  const messages = document.querySelector("#floatingAiMessages");
  if (!messages) return;
  if (loading) {
    let node = messages.querySelector(".ai-bubble.loading");
    if (!node) {
      node = document.createElement("div");
      node.className = "ai-bubble bot loading";
      messages.appendChild(node);
    }
    node.textContent = message;
  } else {
    const node = document.createElement("div");
    node.className = `ai-bubble ${type}`;
    node.textContent = message;
    messages.appendChild(node);
  }
  messages.scrollTop = messages.scrollHeight;
}

function updateManagerFloatingAnswer(message, isError = false) {
  const messages = document.querySelector("#floatingAiMessages");
  if (!messages) return;
  let node = messages.querySelector(".ai-bubble.loading");
  if (!node) {
    node = document.createElement("div");
    messages.appendChild(node);
  }
  node.className = `ai-bubble bot${isError ? " error" : ""}`;
  node.textContent = message;
  messages.scrollTop = messages.scrollHeight;
}


async function loadManagerOperationalSummary() {
  const report = await apiGet("/relatorios/viagens-historico");
  const viagens = report.viagens || [];
  const resumo = report.resumo || {};
  const veiculos = new Set(viagens.map((item) => item.veiculo_id || item.placa || item.prefixo).filter(Boolean));
  const motoristas = new Set(viagens.map((item) => item.motorista || item.motorista_id).filter(Boolean));
  text("#managerVehiclesTotal", document.querySelector("#vehicleFilter")?.options.length ? Math.max(0, document.querySelector("#vehicleFilter").options.length - 1) : veiculos.size);
  text("#managerDriversTotal", document.querySelector("#driverFilter")?.options.length ? Math.max(0, document.querySelector("#driverFilter").options.length - 1) : motoristas.size);
  text("#managerKmMonth", `${Number(resumo.km_rodados || 0).toFixed(1)} km`);
  text("#managerTripsMonth", resumo.total_viagens || viagens.length || 0);
}

function showManagerAiError(error) {
  const result = document.querySelector("#managerAiResult");
  const status = document.querySelector("#managerAiStatus");
  if (result) {
    result.className = "ai-output error";
    result.textContent = error.message || String(error);
  }
  if (status) status.textContent = "Erro";
}

function fillDashboard(dashboard, custos) {
  text("#kpiCostKm", brl.format(custos.custoPorKm || 0));
  text("#kpiCostPatient", brl.format(custos.custoPorPaciente || 0));
  text("#kpiTrips", dashboard.viagensPeriodo);
  text("#kpiPatients", dashboard.pacientesTransportados);
  text("#kpiOccupation", `${dashboard.taxaOcupacao}%`);
  text("#kpiAbsence", `${dashboard.absenteismo}%`);
}

function fillRankings(frota, motoristas) {
  document.querySelector("#driverRanking").innerHTML = (motoristas.ranking || []).slice(0, 5).map((item, index) => `
    <div class="ranking-row"><strong>${index + 1}</strong><span>${escapeHtml(item.nome)}</span><b>${item.viagens}</b></div>
  `).join("") || empty("Sem motoristas no periodo");
  document.querySelector("#fleetRanking").innerHTML = (frota.ranking || []).slice(0, 5).map((item, index) => `
    <div class="ranking-row"><strong>${index + 1}</strong><span>${escapeHtml(item.prefixo || item.placa)}</span><b>${item.kmRodados} km</b></div>
  `).join("") || empty("Sem frota no periodo");
}

function fillPassengers(passageiros) {
  document.querySelector("#passengerSummary").innerHTML = [
    ["Previstos", passageiros.passageirosPrevistos],
    ["Pacientes transportados", passageiros.pacientesTransportados],
    ["Acompanhantes transportados", passageiros.acompanhantesTransportados],
    ["Ausentes", passageiros.pacientesAusentes],
    ["Comparecimento", `${passageiros.taxaComparecimento}%`]
  ].map(([label, value]) => `<div class="ranking-row"><strong>*</strong><span>${label}</span><b>${value}</b></div>`).join("");
}

function fillManagerCharts(charts) {
  const datasets = {
    viagensMes: findDataset(charts.viagens, "viagens-mes"),
    custosCategoria: findDataset(charts.custos, "custos-categoria"),
    frotaUtilizada: findDataset(charts.frota, "veiculos-mais-utilizados"),
    ocorrenciasTipo: findDataset(charts.ocorrencias, "ocorrencias-tipo"),
    absenteismo: findDataset(charts.ocorrencias, "absenteismo")
  };

  createDashboardChart("managerTripsMonthChart", datasets.viagensMes, { type: "bar" });
  createDashboardChart("managerCostsChart", datasets.custosCategoria, { type: "doughnut" });
  createDashboardChart("managerFleetChart", datasets.frotaUtilizada, {
    type: "bar",
    chartOptions: { indexAxis: "y" }
  });
  createDashboardChart("managerOccurrencesChart", datasets.ocorrenciasTipo, { type: "doughnut" });
  createDashboardChart("managerAbsenceChart", datasets.absenteismo, { type: "line" });
}

function fillAttention(dashboard) {
  document.querySelector("#attentionList").innerHTML = [
    ["Excesso de Velocidade", `${dashboard.alertasVelocidade} ocorrencias`, "red"],
    ["Ocorrencias", `${dashboard.ocorrencias} registros`, "yellow"],
    ["Veiculos Ativos", `${dashboard.veiculosAtivos} veiculos`, "green"],
    ["Motoristas Ativos", `${dashboard.motoristasAtivos} online`, "blue"]
  ].map(([title, detail, color]) => `
    <div class="list-item"><span class="list-icon ${color}">!</span><div><strong>${title}</strong><span>${detail}</span></div></div>
  `).join("");
}

function fillAudit(items) {
  document.querySelector("#auditTable").innerHTML = items.slice(0, 20).map((item) => `
    <tr>
      <td>${escapeHtml(item.origem || "")}</td>
      <td>${escapeHtml(item.tipo || "")}</td>
      <td>${escapeHtml(item.viagem_id || "")}</td>
      <td>${escapeHtml(item.descricao || "")}</td>
      <td>${formatDate(item.dataHora)}</td>
    </tr>
  `).join("") || `<tr><td colspan="5">Sem itens de auditoria no periodo.</td></tr>`;
}

function findDataset(collection, id) {
  return (collection || []).find((item) => item.id === id);
}

function text(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function empty(message) {
  return `<div class="ranking-row"><strong>*</strong><span>${message}</span><b>0</b></div>`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function bindAuthenticatedExports() {
  document.querySelectorAll('a[href*="/api/export/"]').forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const href = new URL(link.href, window.location.origin);
      const apiPath = href.pathname.replace(/^\/homologacao\/api/, "").replace(/^\/api/, "");
      const response = await window.authFetch(window.apiUrl(`${apiPath}${href.search}`), { headers: { Accept: "text/csv" } });
      if (!response.ok) throw new Error("Falha ao exportar CSV.");
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = new URL(link.href).searchParams.get("tipo") || "export";
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
    });
  });
}

loadGestao().catch((error) => {
  document.querySelector("#auditTable").innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
});


async function loadOperatorsManager() {
  const table = document.querySelector("#operatorsTable");
  if (!table) return;
  const data = await apiGet("/gestao/operadores");
  const items = data.operadores || data.items || [];
  table.innerHTML = items.length ? items.map((item) => `
    <tr>
      <td>${escapeHtml(item.nome || "--")}</td>
      <td>${escapeHtml(item.cpf || item.login || "--")}</td>
      <td><span class="status info">${escapeHtml(item.status || "ativo")}</span></td>
      <td>${item.app_codigo_hint ? `senha termina em **${escapeHtml(item.app_codigo_hint)}` : "gerada no cadastro"}</td>
      <td>${formatDate(item.criado_em)}</td>
      <td><button class="danger small-action" type="button" data-delete-operator="${escapeHtml(item.id)}" data-operator-name="${escapeHtml(item.nome || item.login || item.id)}">Excluir</button></td>
    </tr>`).join("") : `<tr><td colspan="6">Nenhum operador cadastrado.</td></tr>`;
  table.querySelectorAll("[data-delete-operator]").forEach((button) => {
    button.addEventListener("click", () => deleteOperatorManager(button.dataset.deleteOperator, button.dataset.operatorName).catch(showOperatorsManagerError));
  });
}

function bindOperatorManager() {
  const form = document.querySelector("#operatorManagerForm");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "true";
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.querySelector("#operatorManagerStatus");
    const result = document.querySelector("#lastOperatorAppPassword");
    const payload = Object.fromEntries(new FormData(form).entries());
    Object.keys(payload).forEach((key) => { if (payload[key] === "") delete payload[key]; });
    if (status) status.textContent = "Salvando operador...";
    try {
      const response = await window.authFetch(window.apiUrl("/gestao/operadores"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok || body.ok !== true) throw new Error(body.error || "Falha ao cadastrar operador.");
      const data = body.data || {};
      if (result) {
        result.innerHTML = `<span>Senha do app</span><strong class="activation-code-value">${escapeHtml(data.senha_app || data.codigo_app || "--")}</strong><small>Login do painel: ${escapeHtml(data.login_painel || payload.login || payload.cpf || "")}</small>`;
      }
      form.reset();
      if (status) status.textContent = "Operador cadastrado.";
      await loadOperatorsManager();
    } catch (error) {
      if (status) status.textContent = error.message || "Erro ao cadastrar operador.";
    }
  });
}

async function deleteOperatorManager(id, name) {
  if (!id) return;
  if (!window.confirm(`Excluir o operador ${name || id}?\n\nEle perderá acesso ao painel imediatamente.`)) return;
  const response = await window.authFetch(window.apiUrl(`/gestao/operadores/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: { Accept: "application/json" }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok !== true) throw new Error(body.error || "Falha ao excluir operador.");
  await loadOperatorsManager();
}

function showOperatorsManagerError(error) {
  const status = document.querySelector("#operatorManagerStatus");
  if (status) status.textContent = error.message || String(error);
}
