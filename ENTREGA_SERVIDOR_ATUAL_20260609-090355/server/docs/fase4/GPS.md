# GPS

## Endpoint

`POST /api/gps`

Payload aceito:

```json
{
  "viagem_id": "VIA-SJS-0001",
  "motorista_id": "mot-001",
  "veiculo_id": "vei-001",
  "latitude": -29.561,
  "longitude": -51.501,
  "velocidade": 42,
  "precisao": 8,
  "bateria": 77,
  "status_viagem": "EM_TRANSITO_IDA",
  "timestamp_dispositivo": "2026-06-03T12:00:00.000Z"
}
```

Resposta de sucesso:

```json
{
  "success": true,
  "message": "GPS recebido com sucesso"
}
```

## Validacoes

- `viagem_id` e obrigatorio.
- `latitude` deve estar entre -90 e 90.
- `longitude` deve estar entre -180 e 180.
- A viagem precisa existir.

## Persistencia

Cada ponto recebido e salvo em `localizacoes` com:

- `id`
- `viagem_id`
- `motorista_id`
- `veiculo_id`
- `latitude`
- `longitude`
- `velocidade`
- `precisao`
- `bateria`
- `status_viagem`
- `timestamp_dispositivo`
- `created_at`

Tambem sao registrados evento operacional e log de sincronizacao.
