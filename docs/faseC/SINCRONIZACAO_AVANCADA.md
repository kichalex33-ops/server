# Sincronização Avançada

## Endpoints

- `GET /api/sync/status`
- `GET /api/sync/painel`
- `POST /api/sync/reenvio`

## Estados

- `PENDENTE`
- `ENVIANDO`
- `CONFIRMADO`
- `ERRO`

## Painel

`/operador/sincronizacao`

Exibe eventos pendentes, eventos com erro, itens em envio, confirmados e botão de reenvio manual.

## Limitação atual

O reenvio manual reenfileira itens com erro para `PENDENTE`. O envio automático definitivo depende do app/painel em ambiente real.
