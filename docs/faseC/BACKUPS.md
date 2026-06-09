# Backups

## Script

`node scripts/backup.js`

## Estrutura

- `data/backups/`
- `data/backups/diario/`
- `data/backups/semanal/`

## Comportamento

O script cria o backup pelo repositório JSON e copia o arquivo para `diario`. Aos domingos ou quando o motivo contiver `semanal`, também cria cópia em `semanal`.

## Produção

Agendar no Linux com cron ou PM2 conforme política municipal de retenção.
