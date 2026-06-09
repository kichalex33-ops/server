# PM2

## Arquivo

`ecosystem.config.js`

## Comandos

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
pm2 logs painel-logistico
```

## Logrotate

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
```

## Configuração

- restart automático;
- logs separados;
- ambiente production;
- limite de memória com `max_memory_restart`.
