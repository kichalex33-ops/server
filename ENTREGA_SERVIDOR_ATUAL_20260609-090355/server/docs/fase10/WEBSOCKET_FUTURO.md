# WebSocket Futuro

## Comparacao

| Opcao | Uso | Risco |
| --- | --- | --- |
| Polling | Piloto atual | Mais requisicoes com escala |
| Server-Sent Events | Alertas e GPS unidirecional | Requer controle de conexoes |
| WebSocket puro | Tempo real bidirecional | Mais manutencao |
| Socket.IO | Tempo real com fallback | Dependencia adicional |

## Usos futuros

- GPS em tempo real.
- Alertas instantaneos.
- Mensagens base motorista.
- Sala de situacao.
- Emergencias.
- Status de viagem.
- Presenca online de motoristas.

## Recomendacao

Manter polling no piloto. Migrar para SSE ou WebSocket somente na versao 2.0 consolidada, com autenticacao, logs e limites.
