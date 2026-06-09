# Teste GPS

## Itens

| Item | Status | Evidencia |
|---|---|---|
| Envio GPS | APROVADO | APIs `/api/gps` e `/api/driver/locations` passam em testes. |
| Armazenamento | APROVADO | `localizacoes` persistidas no JSON. |
| Exibicao no mapa | APROVADO | Sala de situacao responde e live-map e validado. |
| Atualizacao | PARCIAL | Necessita teste com aparelho em movimento. |
| Historico | APROVADO | `/api/viagens/:id/trajeto` validado. |

## Resultado geral

**PARCIAL**

Motivo: backend e PWA estao prontos; permissao de GPS, bateria e movimento precisam de teste em celular real.

## Comandos

```bash
curl http://localhost:3000/api/live-map
curl http://localhost:3000/api/viagens/VIA-SJS-0001/trajeto
curl http://localhost:3000/api/driver/locations
```
