# Watchdog Operacional

## Arquivo

`src/services/watchdogService.js`

## Monitores

- GPS parado.
- Motorista sem sincronizar.
- Viagem sem atualização.
- Dispositivo desconectado.
- Fila de eventos crescendo.

## Saída

O serviço retorna:

- `status`: `ok` ou `atencao`.
- `alertas`: lista de alertas calculados.
- `metricas`: contadores operacionais.
- `timestamp`: data/hora da análise.

## Integração

O endpoint `/api/watchdog` usa o serviço para gerar alertas operacionais e registrar auditoria de execução.
