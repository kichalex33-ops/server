# Monitoramento de Producao

## Painel

Rota criada:

`/painel-logistico/admin/infra`

## API

```bash
curl http://127.0.0.1:3000/api/infra/status
curl http://127.0.0.1:3000/api/infra/backups
```

## Indicadores

- Ambiente.
- Uptime.
- Versao do Node.js.
- Tamanho do arquivo JSON.
- Ultimo backup.
- GPS recebidos.
- Alertas abertos.
- Emergencias abertas.
- Sincronizacoes pendentes.
- Erros auditados.

## Acao operacional

Se houver falha, registrar horario, print do painel, saida de `pm2 logs painel-logistico` e ultimo backup disponivel.
