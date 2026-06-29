    const summary = document.getElementById("summary");
    const rows = document.getElementById("rows");
    const retry = document.getElementById("retry");

    function card(label, value) {
      return `<article class="card"><div class="label">${label}</div><div class="value">${value}</div></article>`;
    }

    async function loadSync() {
      const response = await fetch("/homologacao/api/sync/painel");
      const body = await response.json();
      const data = body.data || {};
      summary.innerHTML = [
        card("Pendentes", data.pendentes || 0),
        card("Erros", data.erros || 0),
        card("Enviando", data.enviando || 0),
        card("Confirmados", data.confirmados || 0)
      ].join("");
      const events = [...(data.eventosErro || []), ...(data.eventosPendentes || [])];
      rows.innerHTML = events.length ? events.map((item) => `
        <tr>
          <td>${item.tipo || "-"}</td>
          <td>${item.status || "-"}</td>
          <td>${item.viagem_id || "-"}</td>
          <td>${item.created_at || "-"}</td>
        </tr>
      `).join("") : `<tr><td colspan="4">Nenhum evento pendente ou com erro.</td></tr>`;
    }

    retry.addEventListener("click", async () => {
      await fetch("/homologacao/api/sync/reenvio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      await loadSync();
    });

    loadSync().catch((error) => {
      rows.innerHTML = `<tr><td colspan="4">${error.message}</td></tr>`;
    });