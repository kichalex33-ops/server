# Decisoes dos Agentes - Fase 3

## Leitura obrigatoria realizada

Foram consultados:

- `AGENTS.md`
- `.agents/AGENTE_ARQUITETO.md`
- `.agents/AGENTE_BACKEND_NODE.md`
- `.agents/AGENTE_API_APP_MOTORISTA.md`
- `.agents/AGENTE_SEGURANCA.md`
- `.agents/AGENTE_TESTES.md`
- `.agents/AGENTE_DOCUMENTACAO.md`
- `docs/fase1/*`
- `docs/fase2/*`

O caminho `docs/fase11/*` foi solicitado, mas nao existe no projeto. Nenhuma pasta artificial foi criada.

## AGENTE_ARQUITETO

- Manter a raiz atual como servidor oficial.
- Evoluir o nucleo operacional dentro de `src/services/logisticService.js` e `src/routes/apiRoutes.js`.
- Nao criar servidor paralelo.
- Nao mexer no mapa, Leaflet ou Sala de Situacao nesta fase.

## AGENTE_BACKEND_NODE

- Implementar maquina de estados, passageiros, ocorrencias, despesas, timeline e sync usando JSON local.
- Registrar evento e syncLog em alteracoes operacionais.
- Preservar endpoints da Fase 2.

## AGENTE_API_APP_MOTORISTA

- Ampliar compatibilidade `/api/driver/*`.
- Usar as mesmas collections do JSON, sem mock separado.
- Adicionar embarque, desembarque, ausencia, ocorrencias, despesas e sync.

## AGENTE_SEGURANCA

- Manter token opcional por `API_TOKEN`.
- Nao adicionar login complexo.
- Nao expor `data/` ou `logs/`.
- Preparar dados para operacao externa futura, sem implementar HTTPS nesta fase.

## AGENTE_TESTES

- Criar testes automatizados para estados, passageiros, ocorrencias, despesas, timeline, sync e compatibilidade driver.
- Manter testes da Fase 2.
- Validar contrato existente.

## AGENTE_DOCUMENTACAO

- Criar documentos da Fase 3.
- Registrar claramente o que ficou para Fase 4.
