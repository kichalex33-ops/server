# H4.26 - Enter no chat IA e mensagem clara de cota OpenAI

## Alterações

- Chat flutuante agora usa `<form>` e captura `Enter` por `keydown`, `keyup`, `keyCode` e botão `submit`.
- `Shift + Enter` mantém quebra de linha.
- `operador.html`, `gestao.html` e `portal.html` atualizados para `?v=h426` para evitar cache antigo.
- Backend OpenAI agora transforma erro 429/quota/billing em mensagem operacional em português.

## Importante

HTTP 429 com `You exceeded your current quota` não é erro de código da plataforma. É falta de crédito/cota/limite no projeto da chave OpenAI.

## Testes

1. Aplicar patch em `public_html/homologacao`.
2. Abrir painel em aba anônima.
3. Abrir chat IA.
4. Digitar pergunta e pressionar Enter.
5. Confirmar envio.
6. Se aparecer cota OpenAI, corrigir billing/limite da conta OpenAI.
