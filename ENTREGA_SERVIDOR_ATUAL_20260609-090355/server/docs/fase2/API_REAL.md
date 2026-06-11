# API Real - Fase 2

## Base URL

```text
http://localhost:3000/api
```

Na rede:

```text
http://IP_DO_NOTEBOOK:3000/api
```

## Status

- `GET /api/status`

Retorna aplicacao, empresa, ambiente, storage JSON e timestamp.

## Dashboard

- `GET /api/dashboard/resumo-dia`

Calcula:

- `viagensHoje`
- `viagensEmAndamento`
- `viagensConcluidas`
- `viagensPendentes`
- `motoristasAtivos`
- `veiculosOperacao`
- `pacientesTransportados`
- `acompanhantesTransportados`
- `passageirosPrevistos`
- `alertasAbertos`
- `eventosRecebidos`
- `ultimaLocalizacao`
- `ultimaSincronizacao`

## Operacao principal

- `GET /api/viagens`
- `GET /api/viagens/:id`
- `POST /api/viagens`
- `PUT /api/viagens/:id/status`
- `GET /api/motoristas`
- `POST /api/motoristas`
- `GET /api/veiculos`
- `POST /api/veiculos`
- `GET /api/pacientes`
- `POST /api/pacientes`
- `GET /api/viagens/:id/passageiros`
- `POST /api/viagens/:id/passageiros`
- `PUT /api/passageiros/:id/status`

## Recebimento externo

- `POST /api/localizacoes`
- `GET /api/viagens/:id/localizacoes`
- `POST /api/eventos`
- `GET /api/viagens/:id/eventos`
- `POST /api/alertas`
- `GET /api/alertas`
- `PUT /api/alertas/:id/resolver`
- `POST /api/mensagens`
- `GET /api/viagens/:id/mensagens`
- `POST /api/checklists`
- `GET /api/viagens/:id/checklists`
- `POST /api/ocorrencias`
- `GET /api/ocorrencias`
- `GET /api/viagens/:id/ocorrencias`
- `POST /api/despesas`
- `GET /api/despesas`
- `GET /api/sync/logs`
- `POST /api/sync/logs`

## Compatibilidade app motorista

- `GET /api/driver/trips`
- `POST /api/driver/events`
- `GET /api/driver/events`
- `POST /api/driver/locations`
- `GET /api/driver/locations`
- `POST /api/driver/trips/status`
- `GET /api/driver/trips/status`

Esses endpoints usam as mesmas collections do JSON local.

## Autenticacao

Se `API_TOKEN` estiver vazio, escritas sao permitidas em desenvolvimento.

Se `API_TOKEN` existir, metodos `POST`, `PUT`, `PATCH` e `DELETE` exigem:

```http
Authorization: Bearer TOKEN
```

ou:

```http
X-API-Token: TOKEN
```

## Erro padrao

```json
{
  "ok": false,
  "error": "Mensagem clara"
}
```
