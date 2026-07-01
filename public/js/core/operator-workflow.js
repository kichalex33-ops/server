(function () {
  "use strict";

  var App = window.App = window.App || {};
  var TAB_KEY = "operador_tab";
  var FILTER_KEY = "operador_trip_filter";
  var VALID_TABS = ["agenda", "trips", "monitoring", "registrations", "ai", "drivers"];
  var observer = null;
  var filterState = null;
  var debounceTimers = Object.create(null);

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  function isOperator() {
    var ctx = window.__APP_CONTEXT__ || {};
    return Boolean(ctx.isOperador || document.querySelector(".operator-app"));
  }

  function icon(name) {
    var icons = {
      view: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
      check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 6-11 11-5-5"/></svg>',
      cancel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
      edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>',
      eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
      eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6"/><path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.1 4.1"/><path d="M6.6 6.6C3.6 8.6 2 12 2 12a18.5 18.5 0 0 0 6.1 6.1"/></svg>'
    };
    return icons[name] || "";
  }

  function notify(message, type) {
    if (App.UI && typeof App.UI.toast === "function") return App.UI.toast(message, type || "info");
    console.log(message);
    return null;
  }

  function apiRequest(path, options) {
    if (App.Http && typeof App.Http.request === "function") return App.Http.request(path, options || {});
    var url = window.apiUrl ? window.apiUrl(path) : path;
    var request = window.authFetch || window.fetch;
    return request(url, options || {}).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok || body.ok === false) throw new Error(body.error || "Falha na requisição.");
        return body.data || body;
      });
    });
  }

  function persistOperatorTabs() {
    if (!isOperator() || !App.UX || typeof App.UX.showOperatorScreen !== "function" || App.UX.__h546Wrapped) return;
    var original = App.UX.showOperatorScreen;
    App.UX.showOperatorScreen = function (name, options) {
      name = VALID_TABS.indexOf(name) !== -1 ? name : "trips";
      if (!options || options.persist !== false) {
        try { localStorage.setItem(TAB_KEY, name); } catch (_) {}
      }
      return original(name);
    };
    App.UX.__h546Wrapped = true;

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-screen]");
      if (!trigger || !document.querySelector(".operator-app")) return;
      var screen = trigger.dataset.screen;
      if (VALID_TABS.indexOf(screen) === -1) return;
      var href = trigger.getAttribute("href") || "";
      if (href && !/operador/i.test(href) && href !== "#") return;
      event.preventDefault();
      App.UX.showOperatorScreen(screen);
      if (trigger.dataset.driverTab) activateDriverSubtab(trigger.dataset.driverTab);
    }, true);
  }

  function restoreOperatorTab() {
    if (!isOperator() || !App.UX || typeof App.UX.showOperatorScreen !== "function") return;
    var saved = "";
    try { saved = localStorage.getItem(TAB_KEY) || ""; } catch (_) {}
    var initial = document.body.dataset.initialScreen || "trips";
    var target = VALID_TABS.indexOf(saved) !== -1 ? saved : initial;
    App.UX.showOperatorScreen(target, { persist: false });
  }

  function activateDriverSubtab(name) {
    if (!name) return;
    document.querySelectorAll("[data-driver-panel]").forEach(function (btn) {
      var active = btn.dataset.driverPanel === name;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll("[data-driver-content]").forEach(function (panel) {
      var active = panel.dataset.driverContent === name;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
  }

  function getRows() {
    var body = document.querySelector("#operatorTrips");
    if (!body) return [];
    return Array.prototype.filter.call(body.rows || [], function (row) {
      return !row.classList.contains("empty-row") && row.cells.length > 1 && !/nenhuma viagem/i.test(row.textContent || "");
    });
  }

  function rowData(row) {
    var cells = row.cells || [];
    var rawDate = (cells[1] && cells[1].textContent || "").trim();
    var status = (row.dataset.tripStatus || (cells[7] && cells[7].textContent || "")).trim().toUpperCase();
    var driver = (cells[5] && cells[5].textContent || "").trim().toUpperCase();
    var today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return {
      id: row.dataset.tripId || (cells[0] && cells[0].textContent || "").trim(),
      date: rawDate,
      isToday: rawDate.indexOf(today) !== -1,
      status: status,
      withoutDriver: !driver || /A DEFINIR|SEM MOTORISTA|--/.test(driver),
      pending: /AGUARDANDO|PENDENTE|PROGRAMADA/.test(status),
      ongoing: /TRANSITO|TRÂNSITO|EM_ANDAMENTO|ANDAMENTO|ATIVA/.test(status),
      finished: /CONCLUIDA|FINALIZADA|CANCELADA/.test(status)
    };
  }

  function matchFilter(row, filter) {
    var data = rowData(row);
    if (filter === "hoje") return data.isToday;
    if (filter === "semana") return !data.finished;
    if (filter === "pendentes") return data.pending;
    if (filter === "sem_motorista") return data.withoutDriver;
    if (filter === "em_andamento") return data.ongoing;
    return true;
  }

  function countRows(rows, filter) {
    return rows.filter(function (row) { return matchFilter(row, filter); }).length;
  }

  function ensureTripFilters() {
    if (!isOperator()) return;
    var panel = document.querySelector("#viagens");
    if (!panel || panel.querySelector(".h546-trip-filter-bar")) return;
    var filters = [
      ["todas", "Todas"],
      ["hoje", "Hoje"],
      ["semana", "Ativas"],
      ["pendentes", "Pendentes"],
      ["sem_motorista", "Sem motorista"],
      ["em_andamento", "Em andamento"]
    ];
    var bar = document.createElement("div");
    bar.className = "h546-trip-filter-bar";
    bar.innerHTML = '<div class="filter-group" role="toolbar" aria-label="Filtros de viagens"></div><span class="filter-note">Fonte única: Viagens Agendadas</span>';
    var group = bar.querySelector(".filter-group");
    filters.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.h546Filter = item[0];
      btn.innerHTML = item[1] + ' <small>0</small>';
      btn.addEventListener("click", function () { applyTripFilter(item[0]); });
      group.appendChild(btn);
    });
    var tableWrap = panel.querySelector(".table-wrap");
    if (tableWrap) tableWrap.insertAdjacentElement("beforebegin", bar);
    var saved = "";
    try { saved = localStorage.getItem(FILTER_KEY) || ""; } catch (_) {}
    applyTripFilter(saved || "todas");
  }

  function applyTripFilter(filter) {
    filter = filter || "todas";
    var rows = getRows();
    try { localStorage.setItem(FILTER_KEY, filter); } catch (_) {}
    filterState = filter;
    rows.forEach(function (row) { row.hidden = !matchFilter(row, filter); });
    document.querySelectorAll("[data-h546-filter]").forEach(function (btn) {
      var active = btn.dataset.h546Filter === filter;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      var small = btn.querySelector("small");
      if (small) small.textContent = countRows(rows, btn.dataset.h546Filter);
    });
    renderNoRowsMessage(rows, filter);
  }

  function renderNoRowsMessage(rows, filter) {
    var panel = document.querySelector("#viagens");
    if (!panel) return;
    var existing = panel.querySelector(".h546-empty-inline");
    var visible = rows.some(function (row) { return !row.hidden; });
    if (visible || !rows.length) { if (existing) existing.remove(); return; }
    if (!existing) {
      existing = document.createElement("div");
      existing.className = "h546-empty-inline";
      existing.innerHTML = '<strong>Nenhuma viagem neste filtro</strong><span>Troque o filtro ou crie uma nova viagem agendada.</span><button type="button">Criar viagem</button>';
      existing.querySelector("button").addEventListener("click", function () {
        var form = document.querySelector("#tripForm");
        if (form) form.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      panel.appendChild(existing);
    }
    var label = document.querySelector('[data-h546-filter="' + filter + '"]');
    existing.querySelector("strong").textContent = "Nenhuma viagem em " + (label ? label.childNodes[0].textContent.trim().toLowerCase() : "este filtro");
  }

  function ensureMasterDetail() {
    var panel = document.querySelector("#viagens");
    if (!panel || panel.querySelector(".h546-trip-master-detail")) return;
    var wrap = panel.querySelector(".table-wrap");
    if (!wrap) return;
    var grid = document.createElement("div");
    grid.className = "h546-trip-master-detail";
    wrap.insertAdjacentElement("beforebegin", grid);
    grid.appendChild(wrap);
    var detail = document.createElement("aside");
    detail.className = "h546-trip-detail";
    detail.setAttribute("aria-live", "polite");
    detail.innerHTML = '<header><div><h3>Selecione uma viagem</h3><p>A edição rápida aparece aqui sem perder a lista de vista.</p></div></header><div class="h546-empty-inline"><strong>Nenhuma viagem selecionada</strong><span>Clique em Ver, Editar, Concluir ou Cancelar na tabela.</span></div>';
    grid.appendChild(detail);
  }

  function ensureActionColumn() {
    var table = document.querySelector("#operatorTrips")?.closest("table");
    if (!table) return;
    var header = table.tHead && table.tHead.rows[0];
    if (header && !/ações|acoes/i.test(header.cells[header.cells.length - 1]?.textContent || "")) {
      var th = document.createElement("th");
      th.textContent = "Ações";
      header.appendChild(th);
    }
    getRows().forEach(enhanceTripRow);
    applyTripFilter(filterState || safeGet(FILTER_KEY) || "todas");
  }

  function safeGet(key) { try { return localStorage.getItem(key); } catch (_) { return ""; } }

  function enhanceTripRow(row) {
    if (row.dataset.h546Enhanced === "1") return;
    row.dataset.h546Enhanced = "1";
    row.dataset.h545TripEnhanced = "1";
    row.tabIndex = 0;
    row.setAttribute("aria-label", "Viagem " + (row.cells[0]?.textContent || ""));
    row.dataset.tripId = row.dataset.tripId || (row.querySelector("[data-trip-cancel-id]")?.dataset.tripCancelId || (row.cells[0]?.textContent || "").trim());
    row.dataset.tripStatus = row.dataset.tripStatus || (row.cells[7]?.textContent || "").trim();
    var actionCell = row.cells[row.cells.length - 1];
    if (!actionCell || !actionCell.classList.contains("h546-actions")) {
      actionCell = document.createElement("td");
      actionCell.className = "h546-actions";
      row.appendChild(actionCell);
    }
    if (!actionCell.querySelector(".h546-inline-actions")) {
      var id = row.dataset.tripId || "";
      actionCell.replaceChildren(actionButton("view", "Ver", id), actionButton("complete", "Concluir", id), actionButton("cancel", "Cancelar", id), actionButton("edit", "Editar", id));
      var wrap = document.createElement("div");
      wrap.className = "h546-inline-actions";
      Array.prototype.slice.call(actionCell.childNodes).forEach(function (node) { wrap.appendChild(node); });
      actionCell.replaceChildren(wrap);
    }
    row.addEventListener("click", function (event) {
      if (event.target.closest("button,a,input,select,textarea")) return;
      openTripDetail(row);
    });
    row.addEventListener("keydown", function (event) {
      if (event.key === "Enter") openTripDetail(row);
    });
  }

  function actionButton(action, label, id) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.h546Action = action;
    btn.dataset.tripId = id;
    if (action === "cancel") btn.dataset.h545Confirmed = "1";
    btn.innerHTML = icon(action === "complete" ? "check" : action === "cancel" ? "cancel" : action === "edit" ? "edit" : "view") + " <span>" + label + "</span>";
    btn.setAttribute("aria-label", label + " viagem " + id);
    return btn;
  }

  function tripValuesFromRow(row) {
    var cells = row.cells || [];
    return {
      id: row.dataset.tripId || (cells[0]?.textContent || "").trim(),
      codigo: (cells[0]?.textContent || "").trim(),
      data: (cells[1]?.textContent || "").trim(),
      consulta: (cells[2]?.textContent || "").trim(),
      origem: (cells[3]?.textContent || "").trim(),
      destino: (cells[4]?.textContent || "").trim(),
      motorista: (cells[5]?.textContent || "").trim(),
      veiculo: (cells[6]?.textContent || "").trim(),
      status: (cells[7]?.textContent || row.dataset.tripStatus || "").trim()
    };
  }

  function openTripDetail(row) {
    var detail = document.querySelector(".h546-trip-detail");
    if (!detail || !row) return;
    document.querySelectorAll("#operatorTrips tr").forEach(function (r) { r.classList.remove("h546-selected-row"); });
    row.classList.add("h546-selected-row");
    var v = tripValuesFromRow(row);
    detail.innerHTML = "";
    var header = document.createElement("header");
    header.innerHTML = '<div><h3></h3><p>Detalhe operacional com ações rápidas.</p></div>';
    header.querySelector("h3").textContent = "Viagem " + (v.codigo || v.id || "selecionada");
    var dl = document.createElement("dl");
    [["Data", v.data], ["Consulta", v.consulta], ["Origem", v.origem], ["Destino", v.destino], ["Motorista", v.motorista], ["Veículo", v.veiculo], ["Status da Viagem", v.status]].forEach(function (item) {
      var dt = document.createElement("dt"); var dd = document.createElement("dd");
      dt.textContent = item[0]; dd.textContent = item[1] || "--"; dl.append(dt, dd);
    });
    var actions = document.createElement("div");
    actions.className = "detail-actions";
    actions.append(actionButton("edit", "Editar", v.id), actionButton("complete", "Concluir", v.id), actionButton("cancel", "Cancelar", v.id));
    detail.append(header, dl, actions);
  }

  function findTripRow(id) {
    id = String(id || "").trim();
    return getRows().find(function (row) {
      var values = tripValuesFromRow(row);
      return String(values.id) === id || String(values.codigo) === id;
    });
  }

  function openTripById(id) {
    if (App.UX && typeof App.UX.showOperatorScreen === "function") App.UX.showOperatorScreen("trips");
    window.setTimeout(function () {
      var row = findTripRow(id);
      if (row) {
        openTripDetail(row);
        row.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        notify("Viagem " + id + " não está na página atual da lista.", "warning");
      }
    }, 120);
  }

  function bindTripActions() {
    document.addEventListener("click", function (event) {
      var button = event.target.closest("[data-h546-action]");
      if (!button || !isOperator()) return;
      event.preventDefault();
      event.stopPropagation();
      var action = button.dataset.h546Action;
      var id = button.dataset.tripId;
      var row = button.closest("tr") || findTripRow(id);
      if (action === "view") return openTripDetail(row);
      if (action === "edit") return editTrip(row);
      if (action === "complete") return updateTripStatus(id, "CONCLUIDA", row);
      if (action === "cancel") return cancelTrip(id, row);
    }, true);
  }

  function editTrip(row) {
    if (!row) return;
    if (App.UX && typeof App.UX.showOperatorScreen === "function") App.UX.showOperatorScreen("trips");
    var v = tripValuesFromRow(row);
    var form = document.querySelector("#tripForm");
    if (!form) return;
    setFormValue(form, "codigo", v.codigo);
    setFormValue(form, "origem", v.origem);
    setFormValue(form, "destino", v.destino);
    setFormValue(form, "status", v.status.toUpperCase().replace(/\s+/g, "_"));
    form.dataset.editingTripId = v.id;
    var note = form.querySelector(".h546-autosave-note");
    if (note) { note.textContent = "Editando viagem " + (v.codigo || v.id); note.dataset.state = "restored"; }
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    notify("Dados básicos carregados no formulário. Revise antes de salvar.", "info");
  }

  function setFormValue(form, name, value) {
    var field = form.elements[name];
    if (!field || value == null || value === "--") return;
    field.value = String(value).trim();
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function updateTripStatus(id, status, row) {
    if (!id) return notify("Não identifiquei o ID da viagem.", "error");
    return apiRequest("/viagens/" + encodeURIComponent(id) + "/status", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ status: status })
    }).then(function (body) {
      var targetRow = row || findTripRow(id);
      if (targetRow && targetRow.cells[7]) {
        targetRow.cells[7].textContent = status;
        targetRow.dataset.tripStatus = status;
      }
      notify(status === "CONCLUIDA" ? "Viagem marcada como concluída." : "Status da viagem atualizado.", "success");
      applyTripFilter(filterState || "todas");
      window.dispatchEvent(new CustomEvent("operator:trip-status-updated", { detail: { id: id, status: status, response: body } }));
    }).catch(function (error) {
      notify(error.message || "Falha ao atualizar viagem.", "error");
    });
  }

  function cancelTrip(id, row) {
    if (!id) return notify("Não identifiquei o ID da viagem.", "error");
    var reason = window.prompt("Informe o motivo do cancelamento da viagem:", "Cancelamento operacional");
    if (reason == null) return;
    reason = reason.trim();
    if (!reason) return notify("Cancelamento exige motivo.", "warning");
    return apiRequest("/viagens/" + encodeURIComponent(id) + "/cancelar", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ motivo: reason })
    }).then(function () {
      var targetRow = row || findTripRow(id);
      if (targetRow && targetRow.cells[7]) {
        targetRow.cells[7].textContent = "CANCELADA";
        targetRow.dataset.tripStatus = "CANCELADA";
      }
      notify("Viagem cancelada com registro de motivo.", "success");
      applyTripFilter(filterState || "todas");
    }).catch(function (error) { notify(error.message || "Falha ao cancelar viagem.", "error"); });
  }

  function bindAutosave() {
    document.querySelectorAll(".operator-app form").forEach(function (form) {
      if (form.dataset.h546Autosave === "1" || !form.id) return;
      form.dataset.h546Autosave = "1";
      var key = "autosave_operador_" + form.id;
      var note = document.createElement("small");
      note.className = "h546-autosave-note";
      note.textContent = "Rascunho local ativo";
      form.appendChild(note);
      try {
        var saved = JSON.parse(localStorage.getItem(key) || "null");
        if (saved && saved.fields && Object.keys(saved.fields).length) {
          Object.keys(saved.fields).forEach(function (name) { setFormValue(form, name, saved.fields[name]); });
          note.textContent = "Rascunho restaurado deste navegador";
          note.dataset.state = "restored";
        }
      } catch (_) {}
      form.addEventListener("input", function () {
        clearTimeout(debounceTimers[key]);
        debounceTimers[key] = window.setTimeout(function () {
          var fields = Object.fromEntries(new FormData(form).entries());
          try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), fields: fields })); } catch (_) {}
          note.textContent = "Rascunho salvo localmente";
          note.dataset.state = "saved";
        }, 250);
      });
      form.addEventListener("submit", function () {
        window.setTimeout(function () {
          try { localStorage.removeItem(key); } catch (_) {}
          note.textContent = "Rascunho limpo após envio";
          note.dataset.state = "saved";
        }, 800);
      });
    });
  }

  function bindSensitiveToggle() {
    if (!isOperator() || document.querySelector(".h546-sensitive-toggle")) return;
    var actions = document.querySelector(".top-actions");
    if (!actions) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "h546-sensitive-toggle";
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = icon("eye") + " <span>Exibir dados</span>";
    button.addEventListener("click", function () {
      document.body.classList.toggle("h546-sensitive-visible");
      var isVisible = document.body.classList.contains("h546-sensitive-visible");
      button.setAttribute("aria-pressed", isVisible ? "true" : "false");
      button.innerHTML = icon(isVisible ? "eyeOff" : "eye") + " <span>" + (isVisible ? "Ocultar dados" : "Exibir dados") + "</span>";
    });
    actions.insertBefore(button, actions.firstChild);
    markSensitiveCells();
  }

  function markSensitiveCells() {
    document.querySelectorAll("#operatorPatients tr,#operatorPassengers tr").forEach(function (row) {
      Array.prototype.forEach.call(row.cells || [], function (cell, index) {
        if (row.parentElement && row.parentElement.id === "operatorPatients" && (index === 0 || index === 2 || index === 3)) cell.classList.add("h546-sensitive");
        if (row.parentElement && row.parentElement.id === "operatorPassengers" && index === 0) cell.classList.add("h546-sensitive");
      });
    });
  }

  function bindDebouncedInputs() {
    document.querySelectorAll('input[type="search"],input[id*="search" i],input[id*="busca" i],input[name*="search" i],input[name*="busca" i]').forEach(function (input) {
      if (input.dataset.h546Debounce === "1") return;
      input.dataset.h546Debounce = "1";
      input.addEventListener("input", function () {
        clearTimeout(debounceTimers[input.id || input.name || "search"]);
        debounceTimers[input.id || input.name || "search"] = window.setTimeout(function () {
          input.dispatchEvent(new CustomEvent("input:debounced", { bubbles: true, detail: { value: input.value } }));
        }, 300);
      });
    });
  }

  function installObserver() {
    if (observer || !isOperator()) return;
    observer = new MutationObserver(function () {
      window.clearTimeout(debounceTimers.__observer);
      debounceTimers.__observer = window.setTimeout(function () {
        ensureActionColumn();
        applyTripFilter(filterState || safeGet(FILTER_KEY) || "todas");
        markSensitiveCells();
      }, 80);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function exposeMapBridge() {
    App.OperatorWorkflow = App.OperatorWorkflow || {};
    App.OperatorWorkflow.openTripById = openTripById;
    App.OperatorWorkflow.applyTripFilter = applyTripFilter;
    App.OperatorWorkflow.updateTripStatus = updateTripStatus;
  }

  function boot() {
    if (!isOperator()) return;
    persistOperatorTabs();
    ensureTripFilters();
    ensureMasterDetail();
    ensureActionColumn();
    bindTripActions();
    bindAutosave();
    bindSensitiveToggle();
    bindDebouncedInputs();
    installObserver();
    exposeMapBridge();
    restoreOperatorTab();
  }

  ready(boot);
  window.addEventListener("app:ready", boot);
})();
