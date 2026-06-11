# Panico - Fase 8

## Endpoint

```text
POST /api/panico
```

## Tipos

- PANE_MECANICA
- PNEU_FURADO
- ACIDENTE
- EMERGENCIA_MEDICA
- RISCO_ROTA
- FALHA_OPERACIONAL
- OUTRO

## Registro

Ao acionar, o servidor registra:

- emergencia critica
- alerta critico
- ocorrencia
- evento operacional
- auditoria
- GPS quando enviado
- estrutura de seguradora
- estrutura de assistencia tecnica

## Compatibilidade

`POST /api/driver/panic` continua funcionando e passa a usar o pânico completo.
