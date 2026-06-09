# PM2 e Logs

## Arquivo criado

```text
ecosystem.config.js
```

## Iniciar em producao

```bash
npm install
pm2 start ecosystem.config.js
pm2 save
```

## Logs

Configurados:

```text
logs/painel-logistico-out.log
logs/painel-logistico-error.log
```

## Restart automatico

Configurado:

- `autorestart: true`
- `max_restarts: 10`
- `min_uptime: "10s"`

## Ambiente

```text
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

## pm2-logrotate

Instalar no servidor:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
```

## Validacao

```bash
pm2 status
pm2 logs painel-logistico
curl http://localhost:3000/api/system/health
```
