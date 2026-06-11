# Backup de Producao

## Estado atual

O servidor salva dados em `data/painel-logistico.json`. A cada escrita o repositorio cria copia em `data/backups/`. A Fase 9 tambem adiciona backup manual por CLI e API.

## Backup manual

```bash
npm run backup -- antes-atualizacao
```

## Backup via API

```bash
curl -X POST http://127.0.0.1:3000/api/infra/backup \
  -H "Content-Type: application/json" \
  -d "{\"reason\":\"antes-atualizacao\"}"
```

## Rotina recomendada

- Diario por cron.
- Semanal copiado para outro disco.
- Antes de atualizacao.
- Antes de restore.

## Cron exemplo

```cron
0 2 * * * cd /opt/painel-logistico && npm run backup -- diario
```
