# Persistencia JSON - Fase 2

## Arquivo

```text
data/painel-logistico.json
```

## Collections

- `usuarios`
- `motoristas`
- `veiculos`
- `pacientes`
- `passageiros`
- `viagens`
- `localizacoes`
- `eventos`
- `alertas`
- `mensagens`
- `checklists`
- `ocorrencias`
- `despesas`
- `syncLogs`
- `config`

## Camada de acesso

Arquivo:

```text
src/repositories/jsonRepository.js
```

Funcoes:

- `ensureDataFile()`
- `loadData()`
- `saveData()`
- `getCollection(collection)`
- `addItem(collection, item)`
- `updateItem(collection, id, patch)`
- `findById(collection, id)`

## Regras implementadas

- Cria o arquivo se ele nao existir.
- Cria seed inicial quando o JSON estiver vazio.
- Usa timestamps ISO em registros criados e alterados.
- Gera ids locais quando o payload nao informa `id`.
- Faz escrita por arquivo temporario e renomeia ao final.
- Cria backup simples antes de sobrescrever quando ja existe arquivo.

## Seed inicial

Inclui:

- Motorista `mot-001`
- Veiculo `vei-001`
- Pacientes `pac-001` e `pac-002`
- Acompanhantes `pac-003` e `pac-004`
- Viagem `VIA-SJS-0001`
- Quatro passageiros vinculados
- Localizacao inicial da UBS Sao Jose do Sul

## Cuidados

- `data/` nao deve ser servido publicamente.
- `data/backups/` nao deve ir para git.
- JSON local e adequado para testes, mas nao substitui banco real em producao.
