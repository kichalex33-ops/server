# Antifraude de KM - Fase 8

## Endpoint

```text
GET /api/antifraude
```

## Validacoes

- KM final maior que KM inicial
- KM informado
- Distancia calculada por GPS
- Divergencia configuravel por query string `tolerancia`

## Status

- APROVADO
- PENDENTE_REVISAO
- REJEITADO
