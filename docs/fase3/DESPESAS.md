# Despesas - Fase 3

## Campos

- `id`
- `viagem_id`
- `motorista_id`
- `veiculo_id`
- `tipo`
- `local`
- `litros`
- `valor`
- `valor_litro`
- `foto`
- `observacao`
- `created_at`

## Tipos

- `ABASTECIMENTO`
- `PEDAGIO`
- `ESTACIONAMENTO`
- `ALIMENTACAO`
- `MANUTENCAO`
- `OUTRO`

## Endpoints

- `POST /api/despesas`
- `GET /api/despesas`
- `GET /api/viagens/:id/despesas`

Quando `litros` e `valor` sao informados, `valor_litro` e calculado automaticamente.

Toda despesa gera evento e syncLog.
