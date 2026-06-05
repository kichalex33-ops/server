# Ocorrencias - Fase 3

## Campos

- `id`
- `viagem_id`
- `motorista_id`
- `veiculo_id`
- `tipo`
- `descricao`
- `status`
- `severidade`
- `foto`
- `created_at`
- `updated_at`

## Tipos

- `PACIENTE_AUSENTE`
- `DESISTENCIA`
- `PANE_MECANICA`
- `PNEU_FURADO`
- `ACIDENTE`
- `PACIENTE_PASSOU_MAL`
- `ATRASO`
- `OUTRO`

## Endpoints

- `POST /api/ocorrencias`
- `GET /api/ocorrencias`
- `GET /api/viagens/:id/ocorrencias`
- `PUT /api/ocorrencias/:id/resolver`

Toda ocorrencia gera evento e syncLog.
