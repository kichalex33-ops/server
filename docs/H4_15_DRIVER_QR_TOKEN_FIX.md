# H4.15 - Pareamento QR do motorista

## Correções

- O QR gerado agora também expõe `codigo_manual` com o token bruto.
- O endpoint `/api/driver/qr-login` aceita token manual sem exigir `motorista_id`, desde que o token esteja válido, não usado e não expirado.
- O comportamento antigo continua funcionando quando `motorista_id` vem no payload completo do QR.

## Impacto

Permite que o app motorista faça pareamento manual mesmo quando a câmera do aparelho estiver indisponível.
