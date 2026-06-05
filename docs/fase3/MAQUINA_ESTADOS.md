# Maquina de Estados - Fase 3

## Estados oficiais

- `AGUARDANDO`
- `PREPARACAO`
- `SAIDA_CONFIRMADA`
- `EM_TRANSITO_IDA`
- `CHEGADA_EMBARQUE`
- `PASSAGEIRO_EMBARCADO`
- `PASSAGEIRO_AUSENTE`
- `EM_ESPERA`
- `REEMBARQUE_RETORNO`
- `EM_TRANSITO_VOLTA`
- `PASSAGEIRO_DESEMBARCADO`
- `FINALIZACAO`
- `CONCLUIDA`
- `CANCELADA`
- `PENDENTE_SINCRONIZACAO`
- `SINCRONIZADA`
- `ERRO_SINCRONIZACAO`

## Regras implementadas

Toda mudanca de estado:

- valida transicao;
- atualiza viagem;
- registra evento `VIAGEM_STATUS`;
- registra syncLog `VIAGEM_STATUS`;
- retorna a viagem atualizada.

## Endpoints

- `POST /api/viagens/:id/iniciar-preparacao`
- `POST /api/viagens/:id/confirmar-saida`
- `POST /api/viagens/:id/iniciar-espera`
- `POST /api/viagens/:id/iniciar-retorno`
- `POST /api/viagens/:id/finalizar`
- `POST /api/viagens/:id/cancelar`

## Campos de viagem

A viagem passa a garantir:

- `id`
- `codigo`
- `origem`
- `destino`
- `motorista_id`
- `veiculo_id`
- `status`
- `prioridade`
- `data_viagem`
- `km_saida`
- `km_retorno`
- `hora_saida`
- `hora_retorno`
- `hora_finalizacao`
- `observacoes`
- `created_at`
- `updated_at`
