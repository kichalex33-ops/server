# Auditoria de Configuracao - Fase B.1

## Arquivos verificados

- `.env`
- `.env.example`
- `server.js`
- `src/app.js`

## Resultado

| Variavel | Obrigatoria | Valor esperado | Impacto |
|---|---:|---|---|
| `PORT` | Sim | `3000` ou porta definida no deploy | Define a porta HTTP do servidor. |
| `HOST` | Opcional | `0.0.0.0` em rede local ou servidor Linux | Necessaria para acesso por outro aparelho na rede. |
| `NODE_ENV` | Sim em producao | `production` | Afeta logs, comportamento operacional e PM2. |
| `API_TOKEN` | Recomendado | token forte fora do repositorio | Sem token, endpoints de escrita ficam abertos na rede. |
| `CORS_ORIGIN` | Recomendado | origem especifica em producao | Vazio usa permissividade maior conforme configuracao atual. |
| `APP_URL` | Opcional | `http://10.0.0.4:3000` ou dominio final | Referencia de acesso do painel. |
| `PUBLIC_URL` | Recomendado | URL acessivel pelo celular | Usada em logs e orientacao de acesso externo. |
| `PUBLIC_SERVER_URL` | Opcional | URL publica para QR quando usada | Evita QR com URL incorreta. |
| `BACKUP_DIR` | Opcional | `data/backups` | Local dos backups JSON. |
| `LOG_LEVEL` | Opcional | `info` | Nivel de detalhe dos logs. |
| `OLLAMA_ENABLED` | Opcional | `false` | Deve seguir falso nesta fase. IA nao faz parte da B.1. |

## Achados

- `.env` nao existe no ambiente atual: **PARCIAL**.
- `.env.example` existe e contem variaveis principais: **APROVADO**.
- `API_TOKEN` esta vazio no exemplo: **RISCO MEDIO** se repetido em producao.
- `CORS_ORIGIN` esta vazio no exemplo: **RISCO MEDIO** em rede exposta.
- `server.js` usa `HOST=0.0.0.0` como fallback configuravel: **APROVADO** para rede local.
- `src/app.js` usa `express.json({ limit: "1mb" })`: **APROVADO** para limite inicial de payload.

## Recomendacao antes do piloto

Criar `.env` local no servidor Linux com:

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
API_TOKEN=trocar-por-token-forte
CORS_ORIGIN=http://10.0.0.4:3000
PUBLIC_URL=http://10.0.0.4:3000
PUBLIC_SERVER_URL=http://10.0.0.4:3000
BACKUP_DIR=data/backups
LOG_LEVEL=info
OLLAMA_ENABLED=false
```
