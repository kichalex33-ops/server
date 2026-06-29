# H4.25 - OpenAI e envio por Enter no chat IA

## Correções

- Removido o parâmetro `temperature` da chamada OpenAI Responses API, pois alguns modelos não aceitam esse campo e retornam HTTP 400.
- Mantido `max_output_tokens` para controlar o tamanho da resposta.
- Chat flutuante da IA agora envia mensagem com `Enter`.
- `Shift + Enter` continua quebrando linha no campo de texto.
- Campo de pergunta da IA no painel Operador também envia com `Enter`.
- Campo de pergunta da IA no painel Gestor também envia com `Enter`.

## Arquivos alterados

- `api/src/AiService.php`
- `public/assets/js/operador-dashboard.js`
- `public/assets/js/gestao.js`

## Testes esperados

1. Entrar no painel Operador.
2. Abrir o chat IA no canto inferior direito.
3. Digitar uma pergunta e pressionar `Enter`.
4. Confirmar que a pergunta é enviada.
5. Confirmar que a resposta da OpenAI não retorna mais: `Unsupported parameter: temperature`.
6. Repetir no painel Gestor.
