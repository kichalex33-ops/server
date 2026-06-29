# H4.4 - Correção de QR Code do App Motorista

## Correções aplicadas

- O painel operador agora usa `qrcodejs@1.0.0` para gerar QR Code real e escaneável.
- O elemento do QR foi alterado para um container `#driverQrCanvas`, permitindo renderização por canvas/img.
- `operador-dashboard.js` agora suporta bibliotecas com API `QRCode.toCanvas()` e também `new QRCode(...)`.
- O payload textual continua visível para pareamento manual se a câmera falhar.

## Fluxo esperado

1. Operador gera o QR para um motorista cadastrado.
2. A API retorna um JSON com `tipo`, `versao`, `motorista_id`, `token`, `endpoint`, `expira_em` e `server_url`.
3. O painel renderiza um QR real a partir desse JSON.
4. O app Flutter lê o QR pela câmera com `mobile_scanner` ou aceita o payload manual.
5. O app envia `token` e `motorista_id` para `/api/driver/qr-login`.

## Observações

O QR expira em 10 minutos. Se o app informar QR expirado, gere um novo QR pelo painel.
