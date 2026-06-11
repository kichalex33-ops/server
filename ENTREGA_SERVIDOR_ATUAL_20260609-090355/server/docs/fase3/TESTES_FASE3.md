# Testes da Fase 3

## Automatizados

```bash
npm test
```

Arquivo principal:

```text
tests/fase3Operational.test.js
```

Valida:

- preparacao;
- saida confirmada;
- transicao invalida;
- embarque;
- desembarque;
- ausencia;
- ocorrencia;
- resolucao de ocorrencia;
- despesa com `valor_litro`;
- timeline;
- sync status;
- espera prolongada;
- compatibilidade app motorista.

## Contrato legado

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\contract-test.ps1
```
