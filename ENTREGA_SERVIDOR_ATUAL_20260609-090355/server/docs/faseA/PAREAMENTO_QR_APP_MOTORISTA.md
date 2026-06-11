# Pareamento por QR Code do App Motorista

## Objetivo

Permitir que o operador gere um QR Code no Painel Logistico e vincule um celular ou PWA a um motorista especifico sem digitar URL, token ou ID no aparelho.

## Persistencia

O JSON principal `data/painel-logistico.json` passa a conter:

- `driverPairings`
- `driverDevices`

### driverPairings

Campos:

- `id`
- `motorista_id`
- `pairing_token_hash`
- `server_url`
- `status`
- `expires_at`
- `created_at`
- `confirmed_at`
- `device_id`

Status:

- `PENDENTE`
- `CONFIRMADO`
- `EXPIRADO`
- `CANCELADO`

### driverDevices

Campos:

- `id`
- `motorista_id`
- `device_id`
- `device_name`
- `platform`
- `app_version`
- `last_seen_at`
- `status`
- `created_at`

## Endpoints

### Criar pareamento

`POST /api/operator/drivers/:motoristaId/pairing`

Body opcional:

```json
{
  "server_url": "http://10.0.0.4:3000"
}
```

Retorna o payload do QR com token temporario. O token puro nao fica salvo no servidor.

### Consultar status

`GET /api/operator/pairings/:pairingId/status`

Usado pelo painel a cada 3 segundos.

### Cancelar pareamento

`POST /api/operator/pairings/:pairingId/cancel`

Bloqueia confirmacoes futuras.

### Confirmar pelo app

`POST /api/driver/pairing/confirm`

Body:

```json
{
  "pairing_id": "pair_...",
  "pairing_token": "token_temporario",
  "device": {
    "device_id": "teste-device-001",
    "device_name": "Celular Teste",
    "platform": "android",
    "app_version": "1.0.0"
  }
}
```

Resposta:

```json
{
  "ok": true,
  "message": "Dispositivo pareado com sucesso",
  "motorista": {
    "id": "mot-001",
    "nome": "Joao Santos"
  },
  "device": {
    "id": "teste-device-001"
  },
  "api": {
    "base_url": "http://10.0.0.4:3000"
  }
}
```

## Payload do QR

```json
{
  "type": "PAINEL_LOGISTICO_DRIVER_PAIRING",
  "version": 1,
  "server_url": "http://10.0.0.4:3000",
  "pairing_id": "pair_...",
  "pairing_token": "token_temporario",
  "expires_at": "ISO_DATE"
}
```

## Seguranca

- O token expira em 10 minutos.
- Apenas o hash SHA-256 do token e salvo.
- O token puro retorna uma unica vez, na criacao do QR.
- O QR nao contem senha, CPF ou token permanente.
- Pareamento confirmado, expirado ou cancelado nao pode ser reutilizado.

## Interface

No Painel Operador, acessar:

`Cadastros -> Motoristas -> Gerar QR do App`

O modal mostra:

- nome do motorista;
- QR/payload de pareamento;
- horario de expiracao;
- status do pareamento;
- botao para cancelar.

## Limitacao atual

A Fase A prepara o servidor e o painel. A leitura real pelo app Flutter/PWA sera implementada em fase posterior.
