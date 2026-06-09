# Health Check

## Endpoint

`GET /api/system/health`

## Campos principais

- `status`
- `server_time`
- `uptime`
- `memory`
- `storage`
- `last_gps_received`
- `gps_today`
- `pending_sync_events`

## Página

`/sistema/saude`

Mostra servidor online, memória, armazenamento, GPS recebidos, eventos pendentes e alertas recentes.

## Observação

O endpoint preserva campos da Fase B.1, como `node_version`, `gps_queue`, `sync_queue` e `timestamp`, para manter compatibilidade.
