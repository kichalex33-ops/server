# H4.24 - Suporte OpenAI / ChatGPT na IA

Esta revisão adiciona suporte real ao provedor `openai` no backend PHP da homologação.

## Problema corrigido

Antes, o `.env` podia conter `AI_PROVIDER=openai`, mas o código ainda lia `GEMINI_MODEL`, procurava `GEMINI_API_KEY`/`AI_API_KEY` e chamava somente Gemini. Com isso, o status podia retornar `provider=openai`, `model=gemini-1.5-flash` e `configured=false`.

## Arquivos alterados

- `api/config/env.php`
- `api/src/AiService.php`

## Variáveis esperadas no .env

```env
AI_PROVIDER=openai
OPENAI_API_KEY=SUA_CHAVE_NOVA_AQUI
OPENAI_MODEL=gpt-5.5
OPENAI_API_URL=https://api.openai.com/v1/responses
AI_TIMEOUT_SECONDS=30
```

Não coloque chave no JavaScript, app mobile, HTML ou repositório.

## Teste

Após subir o patch e ajustar o `.env`, acesse o painel, faça login e teste `/homologacao/api/ai/status`.

Resultado esperado:

```json
{
  "ok": true,
  "data": {
    "provider": "openai",
    "model": "gpt-5.5",
    "configured": true
  }
}
```
