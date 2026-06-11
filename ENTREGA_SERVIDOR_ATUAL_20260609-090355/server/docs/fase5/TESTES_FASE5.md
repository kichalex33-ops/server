# Testes da Fase 5

## Automatizados

Arquivo:

`tests/fase5ManagementPortal.test.js`

Valida:

- `/painel-logistico` abre.
- `/painel-logistico/operador` abre com operador claro.
- `/painel-logistico/gestao` abre separado.
- `/api/gestao/dashboard` responde.
- APIs de frota, motoristas, passageiros, custos e auditoria respondem.
- CSV de viagens funciona.

Comando:

```bash
npm test
```
