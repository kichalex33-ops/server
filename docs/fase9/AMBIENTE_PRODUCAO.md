# Ambiente de Producao

## Opcao recomendada

VPS Linux e a opcao mais adequada para uso permanente com dominio e HTTPS.

## Alternativas

- Notebook Linux: bom para piloto e rede local, limitado para disponibilidade 24h.
- HostGator: usar somente se permitir Node.js persistente, PM2 ou processo equivalente e escrita em disco para `data/`.

## Parametros a preencher

| Item | Valor |
| --- | --- |
| IP | Definir na contratacao ou rede local |
| Dominio | `painellogistico.seudominio.com.br` |
| Sistema operacional | Ubuntu Server LTS recomendado |
| Porta interna | `3000` |
| Node.js | LTS atual |
| Storage | Arquivo JSON em `data/painel-logistico.json` |
| Backup | `data/backups/` |
| Acesso remoto | SSH com chave, sem senha simples |
| Limitacoes | Sem banco externo nesta fase |

## Preparacao minima

```bash
sudo apt update
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx
npm install
npm test
```
