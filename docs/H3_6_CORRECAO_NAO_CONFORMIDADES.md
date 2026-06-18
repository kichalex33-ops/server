# H3.6 - Correcao das Nao Conformidades da Conversao PHP

## Escopo aplicado

Esta fase corrigiu apenas lacunas marcadas como `PARCIAL` ou `NAO IMPLEMENTADO` na auditoria H3.5. Nao houve criacao de H4, redesign de telas ou funcionalidades fora dos contratos existentes.

## Bloqueadores corrigidos

### App Motorista

Endpoints adicionados em PHP:

- `POST /api/driver/login`
- `GET /api/driver/trips`
- `GET /api/driver/trips/active`
- `GET /api/driver/notices`
- `GET /api/driver/events`
- `POST /api/driver/events`
- `GET /api/driver/locations`
- `POST /api/driver/locations`
- `GET /api/driver/trips/status`
- `POST /api/driver/trips/status`
- `POST /api/driver/sync`
- `POST /api/driver/change-password`

### GPS e mapa

Endpoints adicionados:

- `POST /api/gps`
- `GET /api/live-map`

Comportamento implementado:

- Valida `viagem_id`.
- Exige latitude e longitude.
- Grava localizacao em `localizacoes`.
- Atualiza status da viagem.
- Gera alerta quando velocidade passa de 80 km/h.
- Retorna frota ativa com ultima localizacao.

### Historico de viagens

Endpoints adicionados:

- `GET /api/viagens/{id}`
- `GET /api/viagens/{id}/passageiros`

### Cadastros estruturados

Os endpoints genericos passaram a preencher colunas reais das tabelas principais:

- `POST /api/veiculos`
- `POST /api/pacientes`
- `POST /api/viagens`
- `POST /api/localizacoes`
- `POST /api/eventos`
- `POST /api/alertas`
- `POST /api/despesas`
- `POST /api/ocorrencias`
- `POST /api/mensagens`
- `POST /api/checklists`

### Fluxo operacional do motorista

Endpoints adicionados:

- `POST /api/driver/trips/{id}/checklist`
- `POST /api/driver/trips/{id}/km-inicial`
- `POST /api/driver/trips/{id}/flow`
- `POST /api/driver/trips/{id}/finalizar`
- `POST /api/driver/panic`
- `POST /api/driver/proofs`

### Pareamento

Mantidos endpoints novos:

- `POST /api/motoristas/{id}/qrcode`
- `POST /api/driver/qr-login`

Adicionada compatibilidade com endpoints antigos:

- `POST /api/operator/drivers/{motoristaId}/pairing`
- `POST /api/driver/pairing/confirm`

## Banco de dados

Migration principal atualizada:

- `db/migrations/001_php_hostgator_core.sql`

Campos/tabelas adicionados:

- `motoristas.senha_hash`
- `avisos`
- `comprovantes`

## Painel Operador

O cadastro de motorista recebeu o campo `senha` para permitir login real no app motorista por `POST /api/driver/login`.

## Status apos H3.6

| Modulo | Status |
| --- | --- |
| Login painel | PARCIAL - depende de teste PHP/MySQL |
| JWT | PARCIAL - depende de teste PHP/MySQL |
| RBAC | PARCIAL - depende de teste PHP/MySQL |
| Motoristas | CORRIGIDO - depende de teste PHP/MySQL |
| Veiculos | CORRIGIDO - depende de teste PHP/MySQL |
| Pacientes | CORRIGIDO - depende de teste PHP/MySQL |
| Viagens | CORRIGIDO - depende de teste PHP/MySQL |
| QR Geracao | CORRIGIDO - depende de teste painel/app |
| QR Leitura | CORRIGIDO - depende de teste app |
| App Motorista | CORRIGIDO - contratos principais recriados |
| GPS | CORRIGIDO - depende de teste em aparelho |
| Live Map | CORRIGIDO - depende de dados reais |
| Auditoria | PARCIAL - depende de teste PHP/MySQL |
| Backup | PARCIAL - depende de teste em HostGator |

## Validacao pendente

Nao foi possivel executar PHP localmente porque `php` nao esta disponivel no PATH deste ambiente.

Ainda precisa validar em ambiente com PHP 8 + MySQL:

- Login painel.
- Login app motorista.
- QR gerado no painel e lido no app.
- GPS enviado pelo app e gravado no MySQL.
- Listagem de viagens do motorista.
- Checklist, km inicial, fluxo, finalizacao e panico.
- Live map recebendo ultima localizacao.
- Backup MySQL.
- Auditoria gravando em `audit_logs`.

## Conclusao

A H3.6 corrigiu as lacunas de codigo identificadas na auditoria. A proxima etapa nao deve ser H4; deve ser H3.7 - Homologacao Final em PHP 8 + MySQL.
