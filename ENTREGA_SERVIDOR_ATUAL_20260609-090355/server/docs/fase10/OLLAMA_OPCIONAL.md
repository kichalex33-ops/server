# Ollama Opcional

## Padrao

```env
OLLAMA_ENABLED=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:0.5b
```

## Modelo recomendado

`qwen2.5:0.5b`

## Alternativa

`qwen2.5:1.5b`

## Nao usar por padrao

- `llama3.2:3b`
- `qwen2.5:7b`

## Motivo

Notebook Linux com 4 GB de RAM deve priorizar Node.js, painel, mapa, API, JSON, GPS e logs.

## Instalar e testar

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:0.5b
ollama run qwen2.5:0.5b
```

## Fallback

Se Ollama falhar ou estiver desligado, o planejador deve retornar sugestoes por regras locais.
