# Endpoints Planejados - Fase 1

## Objetivo

Inventariar os endpoints necessarios para a plataforma Node.js local e comparar com a base atual PHP.

Nesta fase, nenhum endpoint novo foi implementado.

## Convencoes planejadas

- Base: `/api`.
- Resposta padrao: JSON.
- Escritas: token obrigatorio quando `API_TOKEN` estiver configurado.
- Datas: ISO 8601.
- Erros: objeto JSON com `ok: false` e mensagem clara.

## Endpoints minimos planejados

| Metodo | Endpoint | Objetivo | Estado atual |
| --- | --- | --- | --- |
| GET | `/api/status` | Saude da API | Existe em PHP |
| GET | `/api/dashboard/resumo-dia` | Resumo operacional do dia | Existe em PHP |
| GET | `/api/viagens` | Listar viagens | Existe em PHP |
| POST | `/api/viagens` | Criar viagem | Existe em PHP |
| GET | `/api/viagens/:id` | Detalhar viagem | Existe em PHP como `{id}` |
| PUT | `/api/viagens/:id/status` | Atualizar status da viagem | Planejado; hoje existe `PUT /api/viagens/{id}` |
| GET | `/api/motoristas` | Listar motoristas | Existe em PHP |
| POST | `/api/motoristas` | Criar motorista | Existe em PHP |
| GET | `/api/veiculos` | Listar veiculos | Existe em PHP |
| POST | `/api/veiculos` | Criar veiculo | Existe em PHP |
| GET | `/api/pacientes` | Listar pacientes | Existe em PHP |
| POST | `/api/pacientes` | Criar paciente | Existe em PHP |
| GET | `/api/viagens/:id/passageiros` | Passageiros da viagem | Existe em PHP |
| POST | `/api/viagens/:id/passageiros` | Adicionar passageiro | Existe em PHP |
| PUT | `/api/passageiros/:id/status` | Atualizar status de passageiro | Planejado |
| POST | `/api/localizacoes` | Receber GPS | Existe em PHP |
| GET | `/api/viagens/:id/localizacoes` | Historico GPS | Existe em PHP |
| POST | `/api/eventos` | Receber evento geral | Planejado; hoje existe por viagem |
| GET | `/api/viagens/:id/eventos` | Eventos da viagem | Existe em PHP |
| POST | `/api/alertas` | Criar alerta | Existe em PHP |
| GET | `/api/alertas` | Listar alertas | Existe em PHP |
| PUT | `/api/alertas/:id/resolver` | Resolver alerta | Existe em PHP |
| POST | `/api/mensagens` | Enviar mensagem geral | Planejado; hoje existe por viagem |
| GET | `/api/viagens/:id/mensagens` | Mensagens da viagem | Existe em PHP |
| POST | `/api/checklists` | Enviar checklist geral | Planejado; hoje existe por viagem |
| GET | `/api/viagens/:id/checklists` | Checklists da viagem | Existe em PHP |
| GET | `/api/sync/logs` | Listar logs de sincronizacao | Planejado |
| POST | `/api/sync/logs` | Registrar sincronizacao | Planejado |

## Compatibilidade app motorista

| Metodo | Endpoint | Objetivo | Estado atual |
| --- | --- | --- | --- |
| GET | `/api/driver/trips` | Buscar viagens atribuidas ao motorista | Planejado |
| POST | `/api/driver/events` | Enviar eventos do app | Planejado |
| POST | `/api/driver/locations` | Enviar GPS do app | Planejado |
| POST | `/api/driver/trips/status` | Atualizar status da viagem pelo app | Planejado |

## Endpoints PHP existentes que servem de referencia

A base atual em `painel-logistico/api/routes.php` implementa a maior parte dos endpoints operacionais, mas ainda nao contem as rotas de compatibilidade `/api/driver/*`.

## Recomendacao para Fase 2

1. Implementar `GET /api/status` em Node.js.
2. Implementar persistencia local.
3. Migrar leitura de viagens, motoristas, veiculos e pacientes.
4. Migrar recebimento de localizacoes.
5. Implementar rotas do app motorista.
6. Somente depois ampliar dashboards, alertas, mensagens, checklists e sincronizacao.

## Riscos

- Divergencia entre nomes de rotas PHP e Node.js.
- Atualizacao de status em endpoint generico demais.
- Falta de idempotencia para app motorista.
- Excesso de endpoints antes de persistencia e seguranca estarem estaveis.
