# PM2

## Objetivo

Manter o servidor Node.js rodando continuamente em Linux.

## Comandos

```bash
npm install -g pm2
pm2 start server.js --name painel-logistico
pm2 save
pm2 startup
pm2 status
pm2 logs painel-logistico
```

## Atualizacao

```bash
pm2 stop painel-logistico
npm install
npm test
pm2 restart painel-logistico
pm2 status
```

## Validacao

```bash
curl http://127.0.0.1:3000/api/status
```
