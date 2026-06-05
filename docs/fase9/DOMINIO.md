# Dominio e Acesso Externo

## Dominio sugerido

`https://painellogistico.seudominio.com.br`

## DNS

Criar registro A:

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | painellogistico | IP da VPS |

## Firewall

Liberar somente:

- 22 para SSH restrito.
- 80 para HTTP inicial/Certbot.
- 443 para HTTPS.

Nao expor porta 3000 diretamente para a internet.

## Teste externo

Testar fora da rede local com 4G/5G:

```bash
curl https://painellogistico.seudominio.com.br/api/status
```
