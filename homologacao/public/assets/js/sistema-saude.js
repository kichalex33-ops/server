    const cards = document.getElementById("cards");
    const alerts = document.getElementById("alerts");

    function card(label, value, extraClass = "") {
      return `<article class="card"><div class="label">${label}</div><div class="value ${extraClass}">${value}</div></article>`;
    }

    async function loadHealth() {
      const [healthResponse, watchdogResponse] = await Promise.all([
        fetch(window.apiUrl ? window.apiUrl("/system/health") : "/api/system/health"),
        fetch(window.apiUrl ? window.apiUrl("/watchdog") : "/api/watchdog")
      ]);
      const health = await healthResponse.json();
      const watchdog = await watchdogResponse.json();
      const data = health.data || health;
      const watchdogData = watchdog.data || {};
      const memoryMb = Math.round((data.memory?.rss || 0) / 1024 / 1024);
      cards.innerHTML = [
        card("Servidor online", data.status || "indisponível", data.status === "ok" ? "ok" : "warn"),
        card("Memória utilizada", `${memoryMb} MB`),
        card("Espaço/dados", `${data.storage?.dataSizeBytes || 0} bytes`),
        card("GPS recebidos hoje", data.gps_today || 0),
        card("Eventos pendentes", data.pending_sync_events || 0),
        card("Uptime", `${data.uptime || 0}s`)
      ].join("");
      alerts.textContent = JSON.stringify(watchdogData.alertas || [], null, 2);
    }

    loadHealth().catch((error) => {
      cards.innerHTML = card("Servidor", "erro", "warn");
      alerts.textContent = error.message;
    });