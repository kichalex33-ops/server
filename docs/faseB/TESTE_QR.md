# Teste do Pareamento QR

## Itens

| Item | Status | Evidencia |
|---|---|---|
| Geracao do QR | APROVADO | `POST /api/operator/drivers/:motoristaId/pairing` testado. |
| Leitura | PARCIAL | Nesta fase o PWA usa payload colado; leitura por camera fica para Fase C. |
| Confirmacao | APROVADO | `POST /api/driver/pairing/confirm` testado. |
| Dispositivo salvo | APROVADO | Teste valida `driverDevices`. |
| Motorista vinculado | APROVADO | Teste valida `motorista.id`. |
| Expiracao do token | APROVADO | Teste valida HTTP 410. |
| Cancelamento | APROVADO | Teste valida HTTP 409 apos cancelamento. |

## Resultado geral

**PARCIAL**

Motivo: o fluxo seguro funciona por payload/manual; leitura por camera ainda nao foi implementada.

## Comando

```bash
node --test tests/faseAPairingQr.test.js
```
