import crypto from 'node:crypto';
import QRCode from 'qrcode';
import httpError from '../utils/httpError.js';

const PAIRING_TYPE = 'PAINEL_LOGISTICO_DRIVER_PAIRING';
const PAIRING_VERSION = 1;
const PAIRING_TTL_MS = 10 * 60 * 1000;

const STATUS = {
  PENDENTE: 'PENDENTE',
  CONFIRMADO: 'CONFIRMADO',
  EXPIRADO: 'EXPIRADO',
  CANCELADO: 'CANCELADO'
};

export function createDriverPairingService(repository: any) {
  async function createPairing({ motoristaId, serverUrl }: { motoristaId: string; serverUrl: string }) {
    if (!motoristaId) throw httpError(400, 'Motorista obrigatorio.');
    const data = repository.loadData();
    const motorista = data.motoristas.find((item: any) => String(item.id) === String(motoristaId));
    if (!motorista) throw httpError(404, 'Motorista nao encontrado.');

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

    const qrPayload = {
      type: PAIRING_TYPE,
      version: PAIRING_VERSION,
      server_url: normalizedServerUrl,
      api: normalizedServerUrl,
      token: pairingToken,
      pairing_id: pairingId,
      pairing_token: pairingToken,
      motorista_id: motorista.id,
      expires_at: expiresAt
    };

    // Gera o QR Code como Data URL (Imagem Base64)
    const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrPayload));

    data.driverPairings.push(pairing);
    addAudit(data, 'DRIVER_APP_PAIRING_CREATED', `QR criado para motorista ${motorista.id}`, {
      motorista_id: motorista.id,
      pairing_id: pairingId
    });
    await repository.saveData(data);

    return {
      pairing: sanitizePairing(pairing),
      motorista: sanitizeMotorista(motorista),
      qrCode: qrCodeImage,
      qrPayload
    };
  }

  function confirmPairing({ pairingId, pairingToken, device, platform, appVersion }: any) {
    if (!pairingId || !pairingToken) throw httpError(400, 'Pareamento e token sao obrigatorios.');
    const normalizedDevice = normalizeDevicePayload(device, platform, appVersion);

    const data = repository.loadData();
    cleanupExpiredPairings(data);
    const pairing = data.driverPairings.find((item: any) => String(item.id) === String(pairingId));
    if (!pairing) throw httpError(404, 'Pareamento nao encontrado.');
    assertPairingCanConfirm(pairing);
    if (pairing.pairing_token_hash !== hashToken(pairingToken)) {
      throw httpError(401, 'Token de pareamento invalido.');
    }

    const motorista = data.motoristas.find((item: any) => String(item.id) === String(pairing.motorista_id));
    if (!motorista) throw httpError(404, 'Motorista nao encontrado.');

    const confirmedAt = nowIso();
    const deviceId = String(normalizedDevice.device_id || normalizedDevice.id || `dev_${crypto.randomUUID()}`);
    const existingDeviceIndex = data.driverDevices.findIndex((item: any) => String(item.device_id || item.id) === deviceId);
    const deviceRecord = {
      id: deviceId,
      motorista_id: motorista.id,
      device_id: deviceId,
      device_name: String(normalizedDevice.device_name || normalizedDevice.nome || 'Dispositivo do motorista').slice(0, 120),
      platform: String(normalizedDevice.platform || 'desconhecido').slice(0, 40),
      app_version: String(normalizedDevice.app_version || '').slice(0, 40),
      last_seen_at: confirmedAt,
      status: 'ATIVO',
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
    motorista.app_login = motorista.app_login || driverLoginFor(motorista);
    motorista.senha_inicial_app = motorista.senha_inicial_app || defaultDriverPassword();
    motorista.primeiro_acesso_app = motorista.primeiro_acesso_app !== false;
    motorista.atualizadoEm = confirmedAt;
    addAudit(data, 'DRIVER_APP_PAIRING_CONFIRMED', `App confirmou pareamento do motorista ${motorista.id}`, {
      motorista_id: motorista.id,
      pairing_id: pairing.id,
      device_id: deviceId
    });
    repository.saveData(data);

    const auth = createDriverAuthPayload(motorista, pairing.server_url, confirmedAt);
    return {
      ok: true,
      data: {
        login: auth.login,
        usuario: auth.usuario,
        senha: auth.temporaryPassword,
        token: auth.token,
        access_token: auth.token,
        refresh_token: auth.refreshToken,
        server_url: pairing.server_url
      }
    };
  }

  function cleanupExpiredPairings(currentData: any) {
    const data = currentData || repository.loadData();
    const now = Date.now();
    let changed = false;
    for (const pairing of data.driverPairings) {
      if (pairing.status === STATUS.PENDENTE && new Date(pairing.expires_at).getTime() <= now) {
        pairing.status = STATUS.EXPIRADO;
        changed = true;
      }
    }
    if (!currentData && changed) repository.saveData(data);
    return data.driverPairings.filter((item: any) => item.status === STATUS.EXPIRADO);
  }

  return {
    createPairing,
    confirmPairing,
    cleanupExpiredPairings
  };
}

function assertPairingCanConfirm(pairing: any) {
  if (pairing.status === STATUS.CONFIRMADO) throw httpError(409, 'Pareamento ja confirmado.');
  if (pairing.status === STATUS.CANCELADO) throw httpError(409, 'Pareamento cancelado.');
  if (pairing.status === STATUS.EXPIRADO) throw httpError(410, 'Pareamento expirado.');
  if (new Date(pairing.expires_at).getTime() <= Date.now()) {
    pairing.status = STATUS.EXPIRADO;
    throw httpError(410, 'Pareamento expirado.');
  }
}

function normalizeServerUrl(serverUrl: string) {
  const fallback = process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;
  const value = String(serverUrl || fallback).trim();
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, '');
  } catch {
    throw httpError(400, 'URL do servidor invalida.');
  }
}

function normalizeDevicePayload(device: any, platform: any, appVersion: any) {
  const normalized = device && typeof device === 'object' ? { ...device } : {};
  if (platform && !normalized.platform) normalized.platform = platform;
  if (appVersion && !normalized.app_version) normalized.app_version = appVersion;
  return normalized;
}

function createToken() { return crypto.randomBytes(32).toString('base64url'); }
function hashToken(token: string) { return crypto.createHash('sha256').update(String(token)).digest('hex'); }
function sanitizePairing(pairing: any) { const { pairing_token_hash, ...safe } = pairing; return safe; }

function sanitizeMotorista(motorista: any) {
  return {
    id: motorista.id,
    nome: motorista.nome,
    login: driverLoginFor(motorista),
    perfil: 'motorista'
  };
}

function createDriverAuthPayload(motorista: any, serverUrl: string, issuedAt: string) {
  const login = driverLoginFor(motorista);
  const temporaryPassword = motorista.senha_inicial_app || defaultDriverPassword();
  return {
    login,
    temporaryPassword,
    token: Buffer.from(`${motorista.id}:${issuedAt}`).toString('base64url'),
    refreshToken: Buffer.from(`${motorista.id}:refresh:${issuedAt}`).toString('base64url'),
    serverUrl,
    usuario: sanitizeMotorista({ ...motorista, app_login: login, senha_inicial_app: temporaryPassword })
  };
}

function driverLoginFor(motorista: any) { return String(motorista.app_login || motorista.login || motorista.cpf || motorista.id); }
function defaultDriverPassword() { return 'OPteste 01'; }

function addAudit(data: any, evento: string, descricao: string, detalhes = {}) {
  data.auditLogs.push({ evento, descricao, detalhes, created_at: nowIso() });
}

function nowIso() { return new Date().toISOString(); }
