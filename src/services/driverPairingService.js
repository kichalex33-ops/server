const crypto = require("node:crypto");
const httpError = require("../utils/httpError");

const PAIRING_TYPE = "PAINEL_LOGISTICO_DRIVER_PAIRING";
const PAIRING_VERSION = 1;
const PAIRING_TTL_MS = 10 * 60 * 1000;

const STATUS = {
  PENDENTE: "PENDENTE",
  CONFIRMADO: "CONFIRMADO",
  EXPIRADO: "EXPIRADO",
  CANCELADO: "CANCELADO"
};

function createDriverPairingService(repository) {
  function createPairing({ motoristaId, serverUrl }) {
    if (!motoristaId) throw httpError(400, "Motorista obrigatorio.");
    const data = repository.loadData();
    const motorista = data.motoristas.find((item) => String(item.id) === String(motoristaId));
    if (!motorista) throw httpError(404, "Motorista nao encontrado.");

    cleanupExpiredPairings(data);

    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + PAIRING_TTL_MS).toISOString();
    const pairingToken = createToken();
    const pairingId = `pair_${crypto.randomUUID()}`;
    const normalizedServerUrl = normalizeServerUrl(serverUrl);
    const pairing = {
      id: pairingId,
      motorista_id: motorista.id,
      pairing_token_hash: hashToken(pairingToken),
      server_url: normalizedServerUrl,
      status: STATUS.PENDENTE,
      expires_at: expiresAt,
      created_at: createdAt,
      confirmed_at: null,
      device_id: null
    };

    data.driverPairings.push(pairing);
    addAudit(data, "DRIVER_APP_PAIRING_CREATED", `QR criado para motorista ${motorista.id}`, {
      motorista_id: motorista.id,
      pairing_id: pairingId
    });
    repository.saveData(data);
    console.info(`[PAIRING] QR criado para motorista ${motorista.id}`);

    return {
      pairing: sanitizePairing(pairing),
      motorista: sanitizeMotorista(motorista),
      qrPayload: {
        type: PAIRING_TYPE,
        version: PAIRING_VERSION,
        server_url: normalizedServerUrl,
        pairing_id: pairingId,
        pairing_token: pairingToken,
        expires_at: expiresAt
      }
    };
  }

  function confirmPairing({ pairingId, pairingToken, device }) {
    if (!pairingId || !pairingToken) throw httpError(400, "Pareamento e token sao obrigatorios.");
    if (!device || typeof device !== "object") throw httpError(400, "Dados do dispositivo sao obrigatorios.");

    const data = repository.loadData();
    cleanupExpiredPairings(data);
    const pairing = data.driverPairings.find((item) => String(item.id) === String(pairingId));
    if (!pairing) throw httpError(404, "Pareamento nao encontrado.");
    if (pairing.status === STATUS.EXPIRADO) {
      repository.saveData(data);
      throw httpError(410, "Pareamento expirado.");
    }
    assertPairingCanConfirm(pairing);
    if (pairing.pairing_token_hash !== hashToken(pairingToken)) {
      throw httpError(401, "Token de pareamento invalido.");
    }

    const motorista = data.motoristas.find((item) => String(item.id) === String(pairing.motorista_id));
    if (!motorista) throw httpError(404, "Motorista nao encontrado.");

    const confirmedAt = nowIso();
    const deviceId = String(device.device_id || device.id || `dev_${crypto.randomUUID()}`);
    const existingDeviceIndex = data.driverDevices.findIndex((item) => String(item.device_id || item.id) === deviceId);
    const deviceRecord = {
      id: deviceId,
      motorista_id: motorista.id,
      device_id: deviceId,
      device_name: String(device.device_name || device.nome || "Dispositivo do motorista").slice(0, 120),
      platform: String(device.platform || "desconhecido").slice(0, 40),
      app_version: String(device.app_version || "").slice(0, 40),
      last_seen_at: confirmedAt,
      status: "ATIVO",
      created_at: existingDeviceIndex >= 0 ? data.driverDevices[existingDeviceIndex].created_at : confirmedAt
    };

    if (existingDeviceIndex >= 0) {
      data.driverDevices[existingDeviceIndex] = { ...data.driverDevices[existingDeviceIndex], ...deviceRecord };
    } else {
      data.driverDevices.push(deviceRecord);
    }

    pairing.status = STATUS.CONFIRMADO;
    pairing.confirmed_at = confirmedAt;
    pairing.device_id = deviceId;
    addAudit(data, "DRIVER_APP_PAIRING_CONFIRMED", `App confirmou pareamento do motorista ${motorista.id}`, {
      motorista_id: motorista.id,
      pairing_id: pairing.id,
      device_id: deviceId
    });
    repository.saveData(data);
    console.info(`[PAIRING] App confirmou pareamento ${pairing.id}`);

    return {
      ok: true,
      message: "Dispositivo pareado com sucesso",
      motorista: sanitizeMotorista(motorista),
      device: { id: deviceRecord.id },
      api: { base_url: pairing.server_url }
    };
  }

  function cancelPairing(pairingId) {
    const data = repository.loadData();
    cleanupExpiredPairings(data);
    const pairing = data.driverPairings.find((item) => String(item.id) === String(pairingId));
    if (!pairing) throw httpError(404, "Pareamento nao encontrado.");
    if (pairing.status === STATUS.CONFIRMADO) throw httpError(409, "Pareamento ja confirmado.");
    if (pairing.status !== STATUS.CANCELADO) {
      pairing.status = STATUS.CANCELADO;
      addAudit(data, "DRIVER_APP_PAIRING_CANCELLED", `Pareamento cancelado ${pairing.id}`, {
        pairing_id: pairing.id,
        motorista_id: pairing.motorista_id
      });
      repository.saveData(data);
      console.info(`[PAIRING] Pareamento cancelado ${pairing.id}`);
    }
    return sanitizePairing(pairing);
  }

  function getPairingStatus(pairingId) {
    const data = repository.loadData();
    cleanupExpiredPairings(data);
    repository.saveData(data);
    const pairing = data.driverPairings.find((item) => String(item.id) === String(pairingId));
    if (!pairing) throw httpError(404, "Pareamento nao encontrado.");
    return sanitizePairing(pairing);
  }

  function cleanupExpiredPairings(currentData) {
    const data = currentData || repository.loadData();
    const now = Date.now();
    let changed = false;
    for (const pairing of data.driverPairings) {
      if (pairing.status === STATUS.PENDENTE && new Date(pairing.expires_at).getTime() <= now) {
        pairing.status = STATUS.EXPIRADO;
        addAudit(data, "DRIVER_APP_PAIRING_EXPIRED", `Pareamento expirado ${pairing.id}`, {
          pairing_id: pairing.id,
          motorista_id: pairing.motorista_id
        });
        console.info(`[PAIRING] Pareamento expirado ${pairing.id}`);
        changed = true;
      }
    }
    if (!currentData && changed) repository.saveData(data);
    return data.driverPairings.filter((item) => item.status === STATUS.EXPIRADO);
  }

  return {
    createPairing,
    confirmPairing,
    cancelPairing,
    getPairingStatus,
    cleanupExpiredPairings
  };
}

function assertPairingCanConfirm(pairing) {
  if (pairing.status === STATUS.CONFIRMADO) throw httpError(409, "Pareamento ja confirmado.");
  if (pairing.status === STATUS.CANCELADO) throw httpError(409, "Pareamento cancelado.");
  if (pairing.status === STATUS.EXPIRADO) throw httpError(410, "Pareamento expirado.");
  if (new Date(pairing.expires_at).getTime() <= Date.now()) {
    pairing.status = STATUS.EXPIRADO;
    throw httpError(410, "Pareamento expirado.");
  }
}

function normalizeServerUrl(serverUrl) {
  const fallback = process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;
  const value = String(serverUrl || fallback).trim();
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid protocol");
    return url.toString().replace(/\/$/, "");
  } catch {
    throw httpError(400, "URL do servidor invalida.");
  }
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function sanitizePairing(pairing) {
  const { pairing_token_hash, ...safe } = pairing;
  return safe;
}

function sanitizeMotorista(motorista) {
  return {
    id: motorista.id,
    nome: motorista.nome
  };
}

function addAudit(data, evento, descricao, detalhes = {}) {
  data.auditLogs.push({
    id: `aud_${crypto.randomUUID()}`,
    evento,
    descricao,
    detalhes,
    origem: "driver_pairing",
    created_at: nowIso()
  });
}

function nowIso() {
  return new Date().toISOString();
}

module.exports = createDriverPairingService;
