# Sincronizacao - Fase 3

## Collection

`syncLogs`

## Campos

- `id`
- `tipo`
- `origem`
- `status`
- `viagem_id`
- `payload`
- `created_at`
- `updated_at`

## Status

- `PENDENTE`
- `ENVIADO`
- `RECEBIDO`
- `CONFIRMADO`
- `ERRO`

## Endpoints

- `POST /api/sync/evento`
- `GET /api/sync/status`
- `POST /api/sync/forcar`

`GET /api/sync/status` retorna pendentes, confirmados, erros e ultima sincronizacao.

`POST /api/sync/forcar` tambem executa o monitor basico de espera prolongada.
