# H4.27 - Correção do modelo Gemini

## Problema

A IA estava configurada, mas o chat retornava erro HTTP 400 com mensagem semelhante a:

```text
models/gemini-1.5-flash is not found for API version v1beta
```

Isso ocorre porque `gemini-1.5-flash` é modelo antigo/depreciado em contas recentes da Gemini API.

## Correção

- O modelo padrão foi alterado para `gemini-flash-latest`.
- O backend agora aceita `AI_MODEL` como fallback de configuração.
- A chamada Gemini testa modelos de fallback se o modelo configurado falhar:
  - `gemini-flash-latest`
  - `gemini-3.5-flash`
  - `gemini-2.5-flash`

## Ajuste recomendado no .env real

No arquivo `public_html/homologacao/.env`, mantenha sua chave real e troque apenas o modelo:

```env
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-flash-latest
AI_MODEL=gemini-flash-latest
```

Não exponha `GEMINI_API_KEY` no front-end.

## Validação

No console do painel autenticado:

```js
fetch("/homologacao/api/ai/status", {
  headers: {
    Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("painel-logistico-auth") || localStorage.getItem("painel-logistico-auth")).accessToken}`
  }
})
  .then(r => r.json())
  .then(r => console.log(JSON.stringify(r, null, 2)));
```

Depois teste uma pergunta no chat da IA.
