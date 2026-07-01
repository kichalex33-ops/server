(function () {
  "use strict";

  var App = window.App = window.App || {};
  var currentConfirm = null;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  function svg(name) {
    var icons = {
      sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
      moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
      clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
      user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
      radio: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/></svg>',
      alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
      menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
      refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.5 6.3"/><path d="M3 12A9 9 0 0 1 18.5 5.7"/><path d="M3 18h6v-6"/><path d="M21 6h-6v6"/></svg>',
      bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>'
    };
    return icons[name] || icons.alert;
  }

  function setIcon(button, name, label) {
    if (!button || button.dataset.h545Icon === "1") return;
    button.dataset.h545Icon = "1";
    button.innerHTML = svg(name);
    button.setAttribute("aria-label", label || button.getAttribute("aria-label") || "Ação");
  }

  function addSkipLink() {
    if (document.querySelector(".skip-link")) return;
    var main = document.querySelector(".main-dashboard, main, .access-shell");
    if (!main) return;
    if (!main.id) main.id = "main-content";
    var link = document.createElement("a");
    link.className = "skip-link";
    link.href = "#" + main.id;
    link.textContent = "Pular para o conteúdo";
    document.body.insertBefore(link, document.body.firstChild);
  }

  function replaceSystemGlyphs() {
    var theme = document.querySelector("#themeToggle");
    if (theme) setIcon(theme, (document.body.dataset.theme || document.documentElement.dataset.theme) === "dark" ? "moon" : "sun", "Alternar tema");
    var refresh = document.querySelector("#refreshAllBtn");
    if (refresh) setIcon(refresh, "refresh", "Atualizar dados");
    var menu = document.querySelector(".menu-button");
    if (menu) setIcon(menu, "menu", "Abrir menu");
    document.querySelectorAll(".kpi-symbol").forEach(function (el) {
      if (el.dataset.h545Icon === "1") return;
      var text = (el.textContent || "").trim();
      var name = text === "➜" ? "arrow" : (text === "◷" ? "clock" : (text === "☻" ? "user" : (text === "◉" ? "radio" : (text === "!" ? "alert" : "menu"))));
      el.dataset.h545Icon = "1";
      el.innerHTML = svg(name);
    });
  }

  function improvePortalLogin() {
    document.querySelectorAll(".login-form").forEach(function (form) {
      if (form.dataset.h545Portal === "1") return;
      form.dataset.h545Portal = "1";
      var feedback = form.querySelector(".login-feedback");
      if (feedback) {
        feedback.setAttribute("role", "alert");
        feedback.setAttribute("aria-live", "assertive");
      }
      form.querySelectorAll("input").forEach(function (input) {
        input.addEventListener("input", function () {
          form.dataset.error = "0";
          if (feedback) feedback.textContent = "";
        });
      });
      form.addEventListener("submit", function () {
        var button = form.querySelector('button[type="submit"]');
        form.dataset.loading = "1";
        form.dataset.error = "0";
        if (button) button.setAttribute("aria-busy", "true");
        window.setTimeout(function () {
          if (button) button.removeAttribute("aria-busy");
          form.dataset.loading = "0";
          if (feedback && feedback.textContent.trim()) form.dataset.error = "1";
        }, 900);
      }, true);
    });
  }

  function normalizeCopy() {
    var map = {
      "Viagens do Dia": "Viagens Agendadas",
      "Viagens Programadas": "Viagens Agendadas",
      "Viagens cadastradas": "Viagens Agendadas",
      "Status": "Status da Viagem",
      "KM": "KM Rodados",
      "Ocupação": "Taxa de Ocupação do Veículo",
      "Taxa de Ocupacao": "Taxa de Ocupação do Veículo"
    };
    document.querySelectorAll("h1,h2,th,button,a,span").forEach(function (el) {
      if (el.children.length > 0 && !el.matches("button,a")) return;
      var text = (el.textContent || "").trim();
      if (map[text]) el.textContent = map[text];
    });
  }

  function showOperatorScreen(name) {
    document.querySelectorAll("[data-screen-panel]").forEach(function (panel) {
      var active = panel.dataset.screenPanel === name;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    document.querySelectorAll(".side-nav [data-screen], .h545-operator-tabs [data-screen]").forEach(function (link) {
      var active = link.dataset.screen === name;
      link.classList.toggle("active", active);
      if (link.matches("button")) link.setAttribute("aria-selected", active ? "true" : "false");
    });
    var titles = {
      agenda: ["Viagens Agendadas", "Agenda operacional"],
      trips: ["Viagens Agendadas", "Planejamento e acompanhamento"],
      monitoring: ["Mapa e Monitoramento", "Frota e alertas em tempo real"],
      registrations: ["Cadastros Operacionais", "Pacientes, destinos e passageiros"],
      ai: ["IA Operacional", "Resumo, riscos e apoio à decisão"],
      drivers: ["Motoristas e Pareamento", "Equipe e aplicativo móvel"]
    };
    var title = titles[name] || titles.agenda;
    var h = document.querySelector("#screenTitle");
    var e = document.querySelector("#screenEyebrow");
    if (h) h.textContent = title[0];
    if (e) e.textContent = title[1];
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addOperatorTabs() {
    if (!document.querySelector(".operator-app") || document.querySelector(".h545-operator-tabs")) return;
    var topbar = document.querySelector(".topbar") || document.querySelector(".main-dashboard");
    if (!topbar) return;
    var tabs = [
      ["agenda", "Agenda", "hoje/semana"],
      ["trips", "Viagens", "cadastro e status"],
      ["monitoring", "Mapa", "rastreamento"],
      ["registrations", "Cadastros", "pacientes/destinos"],
      ["ai", "IA", "resumos"],
      ["drivers", "Motoristas", "frota/app"]
    ];
    var nav = document.createElement("nav");
    nav.className = "h545-operator-tabs";
    nav.setAttribute("aria-label", "Abas principais do operador");
    nav.setAttribute("role", "tablist");
    tabs.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.dataset.screen = item[0];
      button.setAttribute("role", "tab");
      button.innerHTML = item[1] + "<small>" + item[2] + "</small>";
      button.addEventListener("click", function () { showOperatorScreen(item[0]); });
      nav.appendChild(button);
    });
    topbar.insertAdjacentElement("afterend", nav);
    showOperatorScreen(document.body.dataset.initialScreen || "agenda");
  }

  function confirmDialog(options) {
    options = options || {};
    if (currentConfirm) currentConfirm.remove();
    return new Promise(function (resolve) {
      var backdrop = document.createElement("div");
      currentConfirm = backdrop;
      backdrop.className = "h545-modal-backdrop";
      backdrop.innerHTML = '<section class="h545-modal" role="dialog" aria-modal="true" aria-labelledby="h545ConfirmTitle"><h2 id="h545ConfirmTitle"></h2><p></p><footer><button type="button" data-cancel>Voltar</button><button type="button" class="danger" data-ok>Confirmar</button></footer></section>';
      backdrop.querySelector("h2").textContent = options.title || "Confirmar ação";
      backdrop.querySelector("p").textContent = options.message || "Esta ação exige confirmação.";
      backdrop.querySelector("[data-ok]").textContent = options.okLabel || "Confirmar";
      backdrop.querySelector("[data-cancel]").textContent = options.cancelLabel || "Cancelar";
      function done(value) {
        backdrop.remove();
        currentConfirm = null;
        resolve(value);
      }
      backdrop.addEventListener("click", function (event) { if (event.target === backdrop) done(false); });
      backdrop.querySelector("[data-cancel]").addEventListener("click", function () { done(false); });
      backdrop.querySelector("[data-ok]").addEventListener("click", function () { done(true); });
      document.addEventListener("keydown", function esc(event) {
        if (event.key === "Escape") { document.removeEventListener("keydown", esc); done(false); }
      });
      document.body.appendChild(backdrop);
      backdrop.querySelector("[data-cancel]").focus();
    });
  }

  function bindDestructiveConfirmation() {
    document.addEventListener("click", function (event) {
      var button = event.target.closest("button,a");
      if (!button || button.dataset.h545Confirmed === "1") return;
      var label = (button.textContent || button.getAttribute("aria-label") || "").toLowerCase();
      var destructive = /excluir|cancelar|remover|apagar|revogar/.test(label) || button.matches(".danger,[data-trip-cancel-id],[data-patient-delete-id],[data-passenger-delete-id],[data-destination-delete-id]");
      if (!destructive) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      confirmDialog({ title: "Confirmar alteração", message: "Confira antes de continuar. Ação destrutiva pode afetar registros da operação.", okLabel: "Confirmar" }).then(function (ok) {
        if (!ok) return;
        button.dataset.h545Confirmed = "1";
        button.click();
        window.setTimeout(function () { delete button.dataset.h545Confirmed; }, 600);
      });
    }, true);
  }

  function toastUndo(message, undo) {
    var item = App.UI && App.UI.toast ? App.UI.toast(message || "Ação registrada.", "success", 6500) : null;
    if (item && typeof undo === "function") {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Desfazer";
      btn.addEventListener("click", function () { undo(); item.remove(); });
      item.appendChild(btn);
    }
    return item;
  }

  function openTripDrawerFromRow(row) {
    var cells = Array.prototype.map.call(row.cells || [], function (td) { return td.textContent.trim(); });
    var drawer = document.querySelector(".h545-trip-drawer");
    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.className = "h545-trip-drawer";
      drawer.setAttribute("aria-hidden", "true");
      drawer.innerHTML = '<header><div><strong>Detalhes da viagem</strong><span>Atualização rápida sem sair da lista</span></div><button type="button" data-close aria-label="Fechar">×</button></header><div class="h545-drawer-body"></div><footer><button type="button" data-close>Fechar</button></footer>';
      drawer.querySelectorAll("[data-close]").forEach(function (btn) { btn.addEventListener("click", function () { drawer.setAttribute("aria-hidden", "true"); }); });
      document.body.appendChild(drawer);
    }
    var labels = ["Viagem", "Data", "Consulta", "Origem", "Destino", "Motorista", "Veículo", "Status"];
    var body = drawer.querySelector(".h545-drawer-body");
    body.innerHTML = "";
    var dl = document.createElement("dl");
    labels.forEach(function (label, index) {
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = cells[index] || "--";
      dl.append(dt, dd);
    });
    body.appendChild(dl);
    drawer.setAttribute("aria-hidden", "false");
  }

  function enhanceTripTables() {
    document.querySelectorAll("#operatorTrips tr").forEach(function (row) {
      if (row.dataset.h545TripEnhanced === "1" || row.classList.contains("empty-row")) return;
      row.dataset.h545TripEnhanced = "1";
      row.tabIndex = 0;
      var actionCell = row.cells[row.cells.length - 1];
      if (!actionCell) return;
      var wrap = document.createElement("div");
      wrap.className = "h545-inline-actions";
      var details = document.createElement("button");
      details.type = "button";
      details.className = "neutral";
      details.textContent = "Ver";
      details.addEventListener("click", function () { openTripDrawerFromRow(row); });
      wrap.appendChild(details);
      Array.prototype.slice.call(actionCell.childNodes).forEach(function (node) { wrap.appendChild(node); });
      actionCell.replaceChildren(wrap);
      row.addEventListener("keydown", function (event) {
        if (event.key === "Enter") openTripDrawerFromRow(row);
      });
    });
  }

  function addManagerHierarchy() {
    var grid = document.querySelector(".manager-grid");
    if (!grid || grid.dataset.h545Kpi === "1") return;
    grid.dataset.h545Kpi = "1";
    grid.classList.add("h545-kpi-prioritized");
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".kpi-card"));
    cards.forEach(function (card, index) {
      card.classList.add(index < 3 ? "h545-hero-kpi" : "h545-secondary-kpi");
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "Abrir detalhe do indicador " + (card.querySelector("span")?.textContent || ""));
      card.addEventListener("click", function () {
        var target = index < 2 ? "#custos" : (index === 2 ? "#relatorios" : "#dashboard");
        document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    var panel = document.createElement("section");
    panel.className = "h545-action-panel";
    panel.setAttribute("aria-label", "Ações gerenciais prioritárias");
    panel.innerHTML = '<article class="h545-action-card"><span class="h545-semaphore ok">● Dentro da meta</span><strong>Ação prioritária</strong><span>Revise viagens sem motorista e rotas com maior custo antes de aprovar novas agendas.</span></article><article class="h545-action-card"><span class="h545-semaphore warn">● Atenção</span><strong>Custos e absenteísmo</strong><span>Clique nos KPIs para abrir os detalhes e comparar com o período anterior.</span></article><article class="h545-action-card"><span class="h545-semaphore crit">● Crítico se passar da meta</span><strong>Operação pública</strong><span>Use exportações e auditoria para prestação de contas e rastreabilidade LGPD.</span></article>';
    grid.appendChild(panel);
    addNotificationsButton();
  }

  function addNotificationsButton() {
    var actions = document.querySelector(".top-actions");
    if (!actions || document.querySelector(".h545-notification-btn")) return;
    var btn = document.createElement("button");
    btn.className = "icon-button h545-notification-btn";
    btn.type = "button";
    btn.innerHTML = svg("bell") + '<span class="badge">3</span>';
    btn.setAttribute("aria-label", "Abrir central de notificações");
    btn.addEventListener("click", function () {
      if (App.UI && App.UI.toast) App.UI.toast("Central de notificações preparada. Alertas críticos aparecerão aqui.", "info");
    });
    actions.insertBefore(btn, actions.firstChild);
  }

  function paginateTables() {
    document.querySelectorAll("table").forEach(function (table) {
      var tbody = table.tBodies && table.tBodies[0];
      if (!tbody || tbody.dataset.h545Pagination === "1") return;
      var rows = Array.prototype.slice.call(tbody.rows || []);
      if (rows.length <= 25 || rows[0]?.classList.contains("empty-row")) return;
      tbody.dataset.h545Pagination = "1";
      var pageSize = 25;
      var page = 1;
      var wrapper = document.createElement("div");
      wrapper.className = "h545-pagination";
      var info = document.createElement("span");
      var pages = document.createElement("div");
      pages.className = "pages";
      wrapper.append(info, pages);
      table.closest(".table-wrap")?.insertAdjacentElement("afterend", wrapper);
      function render() {
        rows = Array.prototype.slice.call(tbody.rows || []);
        var totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
        page = Math.min(page, totalPages);
        rows.forEach(function (row, index) {
          row.hidden = index < (page - 1) * pageSize || index >= page * pageSize;
        });
        info.textContent = rows.length + " registros · página " + page + " de " + totalPages;
        pages.innerHTML = "";
        var prev = document.createElement("button");
        prev.type = "button"; prev.textContent = "Anterior"; prev.disabled = page === 1;
        prev.addEventListener("click", function () { page -= 1; render(); });
        var next = document.createElement("button");
        next.type = "button"; next.textContent = "Próxima"; next.disabled = page === totalPages;
        next.addEventListener("click", function () { page += 1; render(); });
        pages.append(prev, next);
      }
      render();
    });
  }

  function validateInline() {
    document.querySelectorAll("form").forEach(function (form) {
      if (form.dataset.h545Validate === "1") return;
      form.dataset.h545Validate = "1";
      form.querySelectorAll("input[required],select[required],textarea[required]").forEach(function (field) {
        field.addEventListener("blur", function () {
          var holder = field.closest("label") || field.parentElement;
          if (!holder) return;
          var msg = holder.querySelector(".h545-field-error");
          if (!field.value.trim()) {
            holder.classList.add("has-inline-error");
            if (!msg) {
              msg = document.createElement("small");
              msg.className = "h545-field-error";
              msg.textContent = "Preencha este campo antes de salvar.";
              holder.appendChild(msg);
            }
          } else {
            holder.classList.remove("has-inline-error");
            if (msg) msg.remove();
          }
        });
      });
    });
  }

  function enhanceEmptyStates() {
    document.querySelectorAll(".empty-state").forEach(function (box) {
      if (box.dataset.h545Empty === "1") return;
      box.dataset.h545Empty = "1";
      var text = (box.textContent || "").toLowerCase();
      if (/viagem/.test(text) && !box.querySelector(".cta")) {
        var a = document.createElement("a");
        a.href = "#nova-viagem";
        a.className = "cta";
        a.textContent = "Criar viagem";
        a.addEventListener("click", function () { showOperatorScreen("trips"); });
        box.appendChild(a);
      }
    });
  }

  function boot() {
    addSkipLink();
    replaceSystemGlyphs();
    improvePortalLogin();
    normalizeCopy();
    addOperatorTabs();
    addManagerHierarchy();
    bindDestructiveConfirmation();
    validateInline();
    enhanceTripTables();
    enhanceEmptyStates();
    paginateTables();
  }

  App.UX = {
    boot: boot,
    confirm: confirmDialog,
    toastUndo: toastUndo,
    showOperatorScreen: showOperatorScreen,
    paginateTables: paginateTables
  };

  ready(boot);
  window.addEventListener("app:ready", function () {
    boot();
    window.setInterval(function () {
      enhanceTripTables();
      enhanceEmptyStates();
      paginateTables();
    }, 2500);
  });
})();
