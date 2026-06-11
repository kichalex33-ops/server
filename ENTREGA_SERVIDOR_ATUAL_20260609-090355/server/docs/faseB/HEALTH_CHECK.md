# Health Check do Sistema

## Endpoint

```text
GET /api/system/health
```

## Resposta esperada

```json
{
  "status": "ok",
  "uptime": 0,
  "memory": {},
  "storage": {},
  "node_version": "v...",
  "gps_queue": 0,
  "sync_queue": 0,
  "timestamp": "ISO_DATE"
}
```

## Campos

- `status`: estado geral do processo.
- `uptime`: tempo em segundos desde inicio do Node.js.
- `memory`: retorno de `process.memoryUsage()`.
- `storage`: informacoes do reposititorio JSON e backups.
- `node_version`: versao do Node.js.
- `gps_queue`: quantidade estimada de localizacoes pendentes/erro/local.
- `sync_queue`: quantidade estimada de eventos/sync pendentes/erro/local.
- `timestamp`: data/hora da verificacao.

## Validacao automatizada

Teste:

```bash
node --test tests/faseB1OperationalValidation.test.js
```

Status: **APROVADO**.

## Uso operacional

```bash
curl http://localhost:3000/api/system/health
curl http://10.0.0.4:3000/api/system/health
```
