# Decisoes dos Agentes - Fase 10

## Regra global

Foram lidos AGENTS.md, agentes em `.agents/`, documentos das fases 1 a 9 e a pasta do app Flutter em `C:\dev\plataforma\app\plataforma teste`.

## Decisoes

- Preservar a identidade Andrade Gestao em Saude e o dominio de transporte sanitario.
- Nao reintroduzir ACE/endemia.
- Nao migrar banco nesta fase.
- Manter polling atual para piloto e planejar WebSocket/SSE para versao 2.0.
- Manter JSON como persistencia do piloto, com repository pattern como fronteira para banco relacional futuro.
- Adicionar apenas endpoint leve `/api/infra/resources`, sem dados sensiveis.
- Deixar Ollama opcional e desligado por padrao.
- Usar `http://10.0.0.4:3000` como endereco do notebook servidor na rede local.

## Impacto no app

Nenhum arquivo do app foi alterado. Futuramente o app motorista deve apontar para `PUBLIC_URL=http://10.0.0.4:3000` em teste local ou para HTTPS em producao.

## Riscos

- JSON nao e banco definitivo para escala multi-municipio.
- Polling deve continuar no piloto ate existir base segura para tempo real.
- Ollama em notebook com 4 GB pode disputar memoria com a operacao.
