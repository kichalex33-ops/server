# HTTPS e SSL

## Objetivo

Usar HTTPS obrigatorio em producao para painel e app motorista.

## Let's Encrypt com Certbot

```bash
sudo certbot --nginx -d painellogistico.seudominio.com.br
sudo certbot renew --dry-run
```

## Cloudflare

Se Cloudflare for usado, manter modo SSL como Full ou Full strict. Evitar Flexible SSL em producao.

## Testes

```bash
curl -I https://painellogistico.seudominio.com.br/api/status
```

## Riscos

- Certificado expirado bloqueia app e navegador.
- DNS incorreto impede emissao do certificado.
- HTTP puro expoe token e dados operacionais.
