# Testes Curl - Fase 2

## Status

```bash
curl http://localhost:3000/api/status
```

Resultado esperado:

```json
{
  "ok": true,
  "app": "Painel Logistico",
  "storage": "json"
}
```

## Dashboard

```bash
curl http://localhost:3000/api/dashboard/resumo-dia
```

Resultado esperado:

- `ok: true`
- `data.viagensHoje`
- `data.ultimaLocalizacao`

## Enviar GPS

```bash
curl -X POST http://localhost:3000/api/localizacoes \
  -H "Content-Type: application/json" \
  -d '{"viagemId":"VIA-SJS-0001","veiculoId":"vei-001","motoristaId":"mot-001","latitude":-29.5448,"longitude":-51.4827,"velocidade":42}'
```

Resultado esperado:

- HTTP 201
- Registro salvo em `data/painel-logistico.json`
- Console com `[GPS]`

## Enviar evento

```bash
curl -X POST http://localhost:3000/api/eventos \
  -H "Content-Type: application/json" \
  -d '{"viagemId":"VIA-SJS-0001","tipo":"GPS","descricao":"Localizacao recebida do app motorista"}'
```

Resultado esperado:

- HTTP 201
- Console com `[EVENTO]`

## Enviar alerta

```bash
curl -X POST http://localhost:3000/api/alertas \
  -H "Content-Type: application/json" \
  -d '{"viagemId":"VIA-SJS-0001","tipo":"GPS_SEM_ATUALIZACAO","descricao":"Teste de alerta operacional"}'
```

Resultado esperado:

- HTTP 201
- Console com `[ALERTA]`

## Teste automatizado

```bash
npm test
```

Valida:

- Repositorio JSON.
- `GET /api/status`.
- `POST /api/localizacoes`.
- Validacao de GPS sem coordenadas.
- Endpoints `/api/driver/events`.
