# Rollback

## Procedimento

1. Parar servidor.

```bash
pm2 stop painel-logistico
```

2. Criar backup do estado atual.

```bash
npm run backup -- antes-rollback
```

3. Restaurar arquivo desejado.

```bash
cp data/backups/NOME_DO_BACKUP.json data/painel-logistico.json
```

4. Reiniciar.

```bash
pm2 restart painel-logistico
```

5. Validar.

```bash
curl http://127.0.0.1:3000/api/status
curl http://127.0.0.1:3000/api/infra/status
```

6. Abrir painel no navegador.

`/painel-logistico`
