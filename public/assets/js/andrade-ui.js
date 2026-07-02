/* ============================================================
   ANDRADE UI — experiência dos painéis (gestor e operador)
   - Menu lateral retrátil (persistido por usuário)
   - Cartão de boas-vindas: saudação por horário + nome do usuário
     + clima atual (Open-Meteo, sem chave) + viagens do dia
   - Leitura em voz alta (Web Speech API, pt-BR)
   - Configurações: mensagem personalizada, voz on/off, tema
   Carregado por último via legacy.js. Sem dependências externas.
   ============================================================ */
(function () {
  "use strict";
  var App = window.App = window.App || {};

  var PREFS_KEY = "andrade-prefs";
  var NAV_KEY = "andrade-nav-collapsed";
  // Centro operacional padrão (São José do Sul/RS) — mesmo do live-map.
  var CITY = { lat: -29.5448, lon: -51.4826, nome: "São José do Sul" };

  var DEFAULT_TEMPLATE = "{saudacao}, {nome}! Hoje está {clima}, no momento faz {temperatura} graus. " +
    "Há {programadas} viagens programadas para hoje e {andamento} já estão em andamento.";

  function prefs() {
    try { return Object.assign({ voz: true, template: DEFAULT_TEMPLATE }, JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")); }
    catch (_) { return { voz: true, template: DEFAULT_TEMPLATE }; }
  }
  function savePrefs(next) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch (_) {}
  }

  /* ---------------- Saudação ---------------- */
  function saudacao() {
    var h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }
  function firstName() {
    var nome = "";
    try {
      var s = App.State && App.State.get ? App.State.get("usuario") : null;
      nome = (s && (s.nome || s.name || s.login)) || "";
      if (!nome) {
        var raw = sessionStorage.getItem("painel-logistico-auth");
        if (raw) { var sess = JSON.parse(raw); nome = (sess.usuario && (sess.usuario.nome || sess.usuario.login)) || ""; }
      }
    } catch (_) {}
    return String(nome).trim().split(/\s+/)[0] || "";
  }

  /* ---------------- Clima (Open-Meteo, gratuito, sem chave) ---------------- */
  var WMO = {
    0:"ensolarado",1:"predominantemente ensolarado",2:"parcialmente nublado",3:"nublado",
    45:"com neblina",48:"com neblina",51:"com garoa",53:"com garoa",55:"com garoa",
    61:"chuvoso",63:"chuvoso",65:"com chuva forte",66:"com chuva congelante",67:"com chuva congelante",
    71:"com neve",73:"com neve",75:"com neve forte",80:"com pancadas de chuva",81:"com pancadas de chuva",
    82:"com pancadas fortes",95:"com trovoadas",96:"com trovoadas e granizo",99:"com trovoadas e granizo"
  };
  function fetchClima() {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + CITY.lat + "&longitude=" + CITY.lon +
      "&current=temperature_2m,weather_code&timezone=America/Sao_Paulo";
    return fetch(url).then(function (r) { return r.json(); }).then(function (b) {
      var c = b && b.current;
      if (!c) return null;
      return { temp: Math.round(c.temperature_2m), desc: WMO[c.weather_code] || "estável" };
    }).catch(function () { return null; });
  }

  /* ---------------- Viagens do dia (API própria) ---------------- */
  function fetchViagens() {
    var request = window.authFetch || window.fetch;
    if (!window.apiUrl) return Promise.resolve(null);
    return request(window.apiUrl("/live-map"), { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (b) {
        var data = (b && b.data) || {};
        var items = Array.isArray(data.items) ? data.items : (Array.isArray(data.veiculos) ? data.veiculos : []);
        var andamento = items.filter(function (i) {
          var s = String(i.status_viagem || i.status || "").toLowerCase();
          return s.indexOf("rota") >= 0 || s.indexOf("andamento") >= 0 || s.indexOf("iniciad") >= 0;
        }).length;
        var ind = data.indicadores || {};
        var programadas = Number(ind.viagensHoje || ind.viagens_hoje || ind.programadas || items.length) || items.length;
        return { programadas: programadas, andamento: andamento };
      }).catch(function () { return null; });
  }

  /* ---------------- Texto final ---------------- */
  function buildMessage(parts) {
    var p = prefs();
    return String(p.template || DEFAULT_TEMPLATE)
      .replace(/\{saudacao\}/gi, parts.saudacao)
      .replace(/\{nome\}/gi, parts.nome || "")
      .replace(/\{clima\}/gi, parts.clima || "sem dados do tempo")
      .replace(/\{temperatura\}/gi, parts.temp != null ? String(parts.temp) : "--")
      .replace(/\{cidade\}/gi, CITY.nome)
      .replace(/\{programadas\}/gi, parts.programadas != null ? String(parts.programadas) : "algumas")
      .replace(/\{andamento\}/gi, parts.andamento != null ? String(parts.andamento) : "algumas")
      .replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").trim();
  }

  /* ---------------- Voz (Web Speech API) ---------------- */
  function speak(text, button) {
    if (!("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR"; u.rate = 1; u.pitch = 1;
      var voices = window.speechSynthesis.getVoices() || [];
      var br = voices.find(function (v) { return /pt[-_]BR/i.test(v.lang); });
      if (br) u.voice = br;
      if (button) {
        button.classList.add("speaking");
        u.onend = u.onerror = function () { button.classList.remove("speaking"); };
      }
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  /* ---------------- Cartão de boas-vindas ---------------- */
  function icon(name) {
    var d = {
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      route: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
      truck: '<path d="M3 13h13l3 4v3H3z"/><path d="M5 13V7h8v6"/><circle cx="7.5" cy="20" r="1.8"/><circle cx="17" cy="20" r="1.8"/>',
      speaker: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' + (d[name] || "") + "</svg>";
  }

  function mountWelcome() {
    var main = document.querySelector(".main-dashboard");
    if (!main || document.querySelector(".andrade-welcome")) return;

    var card = document.createElement("section");
    card.className = "andrade-welcome";
    card.innerHTML =
      '<div class="aw-txt"><h2 id="awTitle"></h2><p id="awSub">Carregando informações do dia…</p></div>' +
      '<div class="aw-meta">' +
        '<span class="aw-chip" id="awClima" hidden>' + icon("sun") + '<span></span></span>' +
        '<span class="aw-chip" id="awProg" hidden>' + icon("route") + '<span></span></span>' +
        '<span class="aw-chip" id="awAnd" hidden>' + icon("truck") + '<span></span></span>' +
        '<button type="button" class="aw-speak" id="awSpeak" title="Ouvir resumo do dia" aria-label="Ouvir resumo do dia">' + icon("speaker") + "</button>" +
      "</div>";

    var topbar = main.querySelector(".topbar");
    if (topbar && topbar.nextSibling) main.insertBefore(card, topbar.nextSibling);
    else main.insertBefore(card, main.firstChild);

    var nome = firstName();
    var titleEl = card.querySelector("#awTitle");
    titleEl.innerHTML = saudacao() + (nome ? ", <em>" + nome + "</em>!" : "!");

    var parts = { saudacao: saudacao(), nome: nome, clima: null, temp: null, programadas: null, andamento: null };

    // Nunca deixa o cartão preso em "carregando": exceções síncronas viram null
    // e clima/API têm 4s para responder.
    function seguro(fn) {
      var p = Promise.resolve().then(fn).catch(function () { return null; });
      return Promise.race([p, new Promise(function (res) { setTimeout(function () { res(null); }, 4000); })]);
    }

    Promise.all([seguro(fetchClima), seguro(fetchViagens)]).then(function (res) {
      var clima = res[0], viagens = res[1];
      if (clima) {
        parts.clima = clima.desc; parts.temp = clima.temp;
        var c = card.querySelector("#awClima"); c.hidden = false;
        c.querySelector("span").textContent = clima.temp + "°C · " + clima.desc;
      }
      if (viagens) {
        parts.programadas = viagens.programadas; parts.andamento = viagens.andamento;
        var p1 = card.querySelector("#awProg"); p1.hidden = false;
        p1.querySelector("span").textContent = viagens.programadas + " programadas hoje";
        var p2 = card.querySelector("#awAnd"); p2.hidden = false;
        p2.querySelector("span").textContent = viagens.andamento + " em andamento";
      }
      var msg = buildMessage(parts);
      card.querySelector("#awSub").textContent = msg;

      var btn = card.querySelector("#awSpeak");
      btn.addEventListener("click", function () { speak(buildMessage(parts), btn); });

      // Fala automática uma vez por sessão (se permitido nas Configurações).
      if (prefs().voz && !sessionStorage.getItem("andrade-welcome-spoken")) {
        sessionStorage.setItem("andrade-welcome-spoken", "1");
        speak(msg, btn);
      }
    });
  }

  /* ---------------- Menu retrátil ---------------- */
  function mountNavToggle() {
    var side = document.querySelector(".side-nav");
    if (!side || side.querySelector(".andrade-nav-toggle")) return;
    if (localStorage.getItem(NAV_KEY) === "1") document.body.classList.add("andrade-nav-collapsed");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "andrade-nav-toggle";
    btn.title = "Recolher menu";
    btn.setAttribute("aria-label", "Recolher ou expandir o menu lateral");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
    btn.addEventListener("click", function () {
      var collapsed = document.body.classList.toggle("andrade-nav-collapsed");
      try { localStorage.setItem(NAV_KEY, collapsed ? "1" : "0"); } catch (_) {}
      window.dispatchEvent(new Event("resize")); // mapas Leaflet reajustam
    });
    side.appendChild(btn);
  }

  /* ---------------- Configurações ---------------- */
  function openSettings() {
    if (document.querySelector(".andrade-settings-overlay")) return;
    var p = prefs();
    var overlay = document.createElement("div");
    overlay.className = "andrade-settings-overlay";
    overlay.innerHTML =
      '<div class="andrade-settings" role="dialog" aria-label="Configurações">' +
        "<header><h3>Configurações</h3><button type=\"button\" data-close aria-label=\"Fechar\">✕</button></header>" +
        '<div class="as-group"><label>Mensagem de boas-vindas</label>' +
          '<textarea id="asTemplate"></textarea>' +
          '<div class="as-hint">Variáveis disponíveis: <code>{saudacao}</code> <code>{nome}</code> <code>{clima}</code> <code>{temperatura}</code> <code>{cidade}</code> <code>{programadas}</code> <code>{andamento}</code></div>' +
        "</div>" +
        '<div class="as-row"><div><strong>Leitura em voz alta</strong><small>Falar o resumo ao abrir o painel</small></div>' +
          '<label class="andrade-switch"><input type="checkbox" id="asVoz"><span></span></label></div>' +
        '<div class="as-row"><div><strong>Modo escuro</strong><small>Alternar o tema da plataforma</small></div>' +
          '<label class="andrade-switch"><input type="checkbox" id="asDark"><span></span></label></div>' +
        '<footer><button type="button" class="as-cancel" data-close>Cancelar</button>' +
        '<button type="button" class="as-save" id="asSave">Salvar</button></footer>' +
      "</div>";
    document.body.appendChild(overlay);

    overlay.querySelector("#asTemplate").value = p.template || DEFAULT_TEMPLATE;
    overlay.querySelector("#asVoz").checked = p.voz !== false;
    overlay.querySelector("#asDark").checked =
      (document.body.dataset.theme || document.documentElement.dataset.theme) === "dark";

    function close() { overlay.remove(); }
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    overlay.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", close); });

    overlay.querySelector("#asSave").addEventListener("click", function () {
      var next = prefs();
      next.template = overlay.querySelector("#asTemplate").value.trim() || DEFAULT_TEMPLATE;
      next.voz = overlay.querySelector("#asVoz").checked;
      savePrefs(next);
      var dark = overlay.querySelector("#asDark").checked;
      if (window.setPainelTheme) window.setPainelTheme(dark ? "dark" : "light");
      close();
      var old = document.querySelector(".andrade-welcome");
      if (old) { old.remove(); mountWelcome(); }
    });
  }

  // Item "Configurações" no menu lateral (para ambos os perfis), sem duplicar.
  function mountSettingsMenuItem() {
    var sections = document.querySelectorAll(".side-nav .nav-section");
    if (!sections.length || document.querySelector("[data-andrade-settings]")) return;
    var last = sections[sections.length - 1];
    var a = document.createElement("a");
    a.href = "#";
    a.setAttribute("data-andrade-settings", "1");
    a.innerHTML = '<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6V20a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6V4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.36.4.68.6 1H20a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-.51 1Z"/></svg></span> Configurações';
    a.addEventListener("click", function (e) { e.preventDefault(); openSettings(); });
    var logout = last.querySelector(".nav-logout, [data-logout]");
    if (logout) last.insertBefore(a, logout); else last.appendChild(a);
  }

  /* ---------------- Boot ---------------- */
  function init() {
    mountNavToggle();
    mountSettingsMenuItem();
    mountWelcome();
    // O menu é montado pelo menu.js depois do DOMContentLoaded; re-tenta rápido.
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      mountNavToggle(); mountSettingsMenuItem(); mountWelcome();
      if (tries > 60 || (document.querySelector(".andrade-nav-toggle") && document.querySelector("[data-andrade-settings]") && document.querySelector(".andrade-welcome"))) clearInterval(t);
    }, 250);
  }

  App.AndradeUI = { openSettings: openSettings, speak: speak, prefs: prefs };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
