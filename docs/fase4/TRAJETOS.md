# Trajetos

## Endpoint

`GET /api/viagens/:id/trajeto`

Resposta:

```json
{
  "ok": true,
  "data": {
    "viagem_id": "VIA-SJS-0001",
    "origem": "UBS Sao Jose do Sul",
    "destino": "Hospital Montenegro",
    "trajeto": [
      {
        "latitude": -29.5448,
        "longitude": -51.4827,
        "velocidade": 0,
        "timestamp_dispositivo": "2026-06-03T00:00:00.000Z"
      }
    ]
  }
}
```

## Ordenacao

O historico e ordenado pelo horario de recebimento no servidor, preservando o horario do dispositivo em cada ponto.
