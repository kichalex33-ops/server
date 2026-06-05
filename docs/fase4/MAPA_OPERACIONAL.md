# Mapa Operacional

## Tecnologia

O mapa usa Leaflet e OpenStreetMap. Nao ha chave paga nem dependencia de Google Maps.

## Endpoint

`GET /api/live-map`

Campos principais por veiculo:

- `veiculo_id`
- `placa`
- `prefixo`
- `motorista`
- `telefone`
- `viagem_id`
- `status_viagem`
- `latitude`
- `longitude`
- `velocidade`
- `ultima_atualizacao`
- `origem`
- `destino`
- `passageiros`
- `alerta_ativo`
- `tipo_alerta`
- `cor_status`

## Atualizacao

A tela consulta o endpoint a cada 5 segundos. WebSocket ficou fora do escopo da Fase 4.
