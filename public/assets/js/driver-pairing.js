let activePairingId = null;
let activePairingPolling = null;
let activeQr = null;

function pairingFetch(url, options = {}) {
  return (window.authFetch || window.fetch)(url, options);
}

function pairingApiUrl(path) {
  return window.apiUrl ? window.apiUrl(path) : `/api${path.startsWith('/') ? path : `/${path}`}`;
}

function pairingServerUrl() {
  if (window.appUrl) return new URL(window.appUrl('/'), window.location.origin).toString().replace(/\/$/, '');
  return window.location.origin;
}

async function readPairingJson(response) {
  const text = await response.text();
  let body = {};
  if (text) {
    try { body = JSON.parse(text); } catch (_) { throw new Error('Resposta invalida do servidor.'); }
  }
  if (!response.ok || body.ok === false) throw new Error(body.error || body.message || `HTTP ${response.status}`);
  return body.data || body;
}

async function loadOperatorDrivers() {
  const target = document.querySelector('#operatorDrivers');
  if (!target) return;
  target.innerHTML = '<tr><td colspan="5">Carregando motoristas...</td></tr>';
  try {
    const response = await pairingFetch(pairingApiUrl('/motoristas'), { headers: { Accept: 'application/json' } });
    const data = await readPairingJson(response);
    const drivers = Array.isArray(data) ? data : (data.motoristas || data.data || []);
    target.innerHTML = drivers.length ? drivers.map((driver) => `
      <tr>
        <td>${escapePairingText(driver.nome || driver.id)}</td>
        <td>${escapePairingText(driver.telefone || '--')}</td>
        <td><span class="status ${String(driver.status || '').toLowerCase() === 'ativo' ? 'ok' : 'info'}">${escapePairingText(driver.status || 'ativo')}</span></td>
        <td>Disponivel para pareamento</td>
        <td><button class="qr-button" type="button" data-driver-id="${escapePairingText(driver.id)}" data-driver-name="${escapePairingText(driver.nome || driver.id)}">Gerar QR do App</button></td>
      </tr>
    `).join('') : '<tr><td colspan="5">Nenhum motorista cadastrado.</td></tr>';
  } catch (error) {
    target.innerHTML = `<tr><td colspan="5">Falha ao carregar motoristas: ${escapePairingText(error.message)}</td></tr>`;
  }
}

function openDriverPairingModal(motoristaId, motoristaNome) {
  const modal = document.querySelector('#driverPairingModal');
  if (!modal) return;
  setPairingText('#driverPairingDriver', motoristaNome || motoristaId);
  setPairingText('#driverPairingStatus', 'Gerando QR seguro...');
  setPairingText('#driverPairingExpires', '--');
  setPairingText('#driverPairingPayload', '{}');
  const qrTarget = document.querySelector('#driverPairingQr');
  if (qrTarget) qrTarget.innerHTML = '';
  modal.hidden = false;
  createDriverPairing(motoristaId).catch((error) => {
    setPairingText('#driverPairingStatus', `Falha ao gerar QR: ${error.message}`);
  });
}

async function createDriverPairing(motoristaId) {
  const response = await pairingFetch(pairingApiUrl(`/operator/drivers/${encodeURIComponent(motoristaId)}/pairing`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ server_url: pairingServerUrl(), origem: 'painel_operador' })
  });
  const pairing = await readPairingJson(response);
  const qrPayload = pairing.qrPayload || pairing.qr_payload || pairing.qr?.payload;
  if (!qrPayload?.pairing_id || !qrPayload?.pairing_token) throw new Error('Resposta de pareamento incompleta.');
  activePairingId = qrPayload.pairing_id;
  renderDriverPairingQRCode(qrPayload);
  setPairingText('#driverPairingStatus', 'Aguardando leitura do app');
  setPairingText('#driverPairingExpires', `Expira em: ${formatPairingDate(qrPayload.expires_at || qrPayload.expira_em)}`);
  setPairingText('#driverPairingPayload', JSON.stringify(qrPayload, null, 2));
  startPairingStatusPolling(activePairingId);
  return pairing;
}

function renderDriverPairingQRCode(qrPayload) {
  const target = document.querySelector('#driverPairingQr');
  if (!target) return;
  const text = JSON.stringify(qrPayload);
  target.innerHTML = '';
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
      const response = await pairingFetch(pairingApiUrl(`/operator/pairings/${encodeURIComponent(pairingId)}/status`), { headers: { Accept: 'application/json' } });
      const data = await readPairingJson(response);
      const status = String(data.status || '').toUpperCase();
      if (status === 'CONFIRMADO' || status === 'USADO') {
        setPairingText('#driverPairingStatus', 'App pareado com sucesso');
        stopPairingStatusPolling();
      } else if (status === 'EXPIRADO') {
        setPairingText('#driverPairingStatus', 'QR expirado. Gere um novo pareamento.');
        stopPairingStatusPolling();
      } else if (status === 'CANCELADO') {
        setPairingText('#driverPairingStatus', 'Pareamento cancelado.');
        stopPairingStatusPolling();
      } else {
        setPairingText('#driverPairingStatus', 'Aguardando leitura do app');
      }
    } catch (error) {
      setPairingText('#driverPairingStatus', `Falha ao atualizar status: ${error.message}`);
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
  const response = await pairingFetch(pairingApiUrl(`/operator/pairings/${encodeURIComponent(pairingId)}/cancel`), {
    method: 'POST',
    headers: { Accept: 'application/json' }
  });
  await readPairingJson(response);
  setPairingText('#driverPairingStatus', 'Pareamento cancelado.');
  stopPairingStatusPolling();
}

function closeDriverPairingModal() {
  stopPairingStatusPolling();
  activePairingId = null;
  activeQr = null;
  const modal = document.querySelector('#driverPairingModal');
  if (modal) modal.hidden = true;
}

function bindDriverPairingUi() {
  document.querySelector('#operatorDrivers')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-driver-id]');
    if (!button) return;
    openDriverPairingModal(button.dataset.driverId, button.dataset.driverName);
  });
  document.querySelector('#refreshDriversBtn')?.addEventListener('click', loadOperatorDrivers);
  document.querySelector('#driverPairingCloseBtn')?.addEventListener('click', closeDriverPairingModal);
  document.querySelector('#driverPairingCancelBtn')?.addEventListener('click', () => {
    cancelPairing(activePairingId).catch((error) => {
      setPairingText('#driverPairingStatus', `Falha ao cancelar: ${error.message}`);
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
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function escapePairingText(value) {
  if (window.App?.Sanitize?.escapeHtml) return window.App.Sanitize.escapeHtml(value);
  return String(value ?? '').replace(/[&<>"'`]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;', '`': '&#096;' }[char]));
}

bindDriverPairingUi();
