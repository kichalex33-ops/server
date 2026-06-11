# Passageiros - Fase 3

## Campos garantidos

- `id`
- `viagem_id`
- `tipo`
- `nome`
- `cpf`
- `telefone`
- `necessidade_especial`
- `cadeirante`
- `usa_muletas`
- `mobilidade_reduzida`
- `necessita_auxilio`
- `acompanhante`
- `paciente_referencia`
- `status`
- `observacoes_embarque`
- `observacoes`
- `created_at`
- `updated_at`
- `possuiNecessidadeEspecial`

## Tipos

- `PACIENTE`
- `ACOMPANHANTE`

## Status

- `AGUARDANDO`
- `EMBARCADO`
- `DESEMBARCADO`
- `AUSENTE`
- `DESISTIU`

## Endpoints

- `POST /api/passageiros/:id/embarque`
- `POST /api/passageiros/:id/desembarque`
- `POST /api/passageiros/:id/ausente`
- `POST /api/passageiros/:id/desistiu`

## Acessibilidade

O indicador `possuiNecessidadeEspecial` e calculado a partir de:

- `necessidade_especial`
- `cadeirante`
- `usa_muletas`
- `mobilidade_reduzida`
- `necessita_auxilio`
- acompanhante obrigatorio, quando informado
