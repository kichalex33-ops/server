# Banco Escalavel

## Estado atual

Persistencia em `data/painel-logistico.json`, acessada pelo repository pattern.

## Recomendacao

- PostgreSQL: preferencial para producao robusta, relatorios, indices e integridade.
- MySQL/MariaDB: alternativa para hospedagens simples.
- JSON: manter apenas para prototipo, piloto e testes.

## Entidades principais

- usuarios
- perfis
- motoristas
- veiculos
- pacientes
- passageiros
- viagens
- unidades/destinos
- localizacoes
- eventos
- ocorrencias
- checklists
- mensagens
- despesas
- auditoria
- backups
- logs

## Direcao tecnica

Criar adaptadores de repositorio:

- `jsonRepository`: piloto.
- `postgresRepository`: producao futura.
- `mysqlRepository`: alternativa futura.

As regras de negocio devem depender de metodos do repositorio, nao de arquivo JSON.
