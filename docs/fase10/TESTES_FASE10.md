# Testes Fase 10

## Comandos executados

```bash
npm test
```

## Validacoes cobertas

- Servidor inicia em testes.
- API atual continua funcionando.
- Painel operador abre.
- Painel gestao abre.
- Sala de situacao abre.
- Emergencias abre.
- Infraestrutura responde.
- `/api/infra/resources` responde.
- `OLLAMA_ENABLED=false` nao causa erro.
- Ollama fica opcional.
- App motorista continua com contratos existentes.

## Teste manual recomendado

```bash
curl http://10.0.0.4:3000/api/status
curl http://10.0.0.4:3000/api/infra/resources
```
