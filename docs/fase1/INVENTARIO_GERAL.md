# Inventario Geral - Fase 1

## Objetivo da auditoria

Registrar o estado atual do projeto antes da evolucao para uma plataforma local em Node.js, Express, JavaScript, HTML, CSS e persistencia local inicial.

Esta fase nao move arquivos, nao cria APIs novas e nao recria a interface existente.

## Estrutura atual encontrada

```text
server/
|-- .git/
|-- .gitignore
|-- DEMO/
|   |-- README.md
|   |-- index.html
|   |-- style.css
|   |-- app.js
|   |-- dados-demo.json
|   `-- assets/
|       |-- andrade-gestao-saude.jpeg
|       `-- brasao-sao-jose-do-sul.png
|-- painel-logistico/
|   |-- .env.example
|   |-- README.md
|   |-- api/
|   |   |-- index.php
|   |   |-- routes.php
|   |   `-- controllers/
|   |-- config/
|   |   `-- database.php
|   |-- database/
|   |   |-- schema.sql
|   |   `-- seed.sql
|   |-- public_html/
|   |   |-- .htaccess
|   |   |-- index.php
|   |   `-- assets/
|   |       |-- css/style.css
|   |       |-- js/app.js
|   |       `-- img/
|   `-- src/
|       |-- Auth.php
|       |-- Database.php
|       |-- Response.php
|       `-- Repositories/BaseRepository.php
|-- tests/
|   `-- contract-test.ps1
|-- DEMO2.zip
`-- painel-logistico-hostgator.zip
```

## Tecnologias usadas hoje

- Frontend estatico em HTML, CSS e JavaScript.
- Leaflet com OpenStreetMap via CDN.
- Base PHP para API.
- MySQL planejado pela base `painel-logistico/database/schema.sql`.
- Scripts PowerShell de contrato em `tests/contract-test.ps1`.
- Arquivos ZIP de entrega ou backup na raiz.

## Servidor Node existente

Nao foi encontrado `package.json`, `server.js` ou estrutura Node.js na raiz atual.

A base funcional existente e PHP/MySQL dentro de `painel-logistico/`. A migracao para Node.js deve ser planejada sem apagar a base atual e sem quebrar a pagina visual aprovada.

## Paginas existentes

- `DEMO/index.html`: demo local abrivel diretamente no navegador.
- `painel-logistico/public_html/index.php`: pagina aprovada adaptada para hospedagem PHP.

As duas preservam a identidade Andrade Gestao em Saude, menu lateral, visao geral, mapa, viagem ativa, passageiros, comunicacao, ocorrencias, sincronizacao e relatorios rapidos.

## Assets existentes

- `andrade-gestao-saude.jpeg`.
- `brasao-sao-jose-do-sul.png`.
- CSS principal em `DEMO/style.css`.
- CSS reaproveitado em `painel-logistico/public_html/assets/css/style.css`.
- JavaScript demonstrativo em `DEMO/app.js`.
- JavaScript com tentativa de API real e fallback em `painel-logistico/public_html/assets/js/app.js`.

## JSON, SQL e dados

- `DEMO/dados-demo.json`: dados demonstrativos.
- `painel-logistico/database/schema.sql`: schema MySQL com usuarios, motoristas, veiculos, pacientes, viagens, passageiros, eventos, mensagens, alertas, checklists, localizacoes e logs de sincronizacao.
- `painel-logistico/database/seed.sql`: carga demonstrativa inicial.

## Rotas e APIs existentes

A base PHP ja declara rotas em `painel-logistico/api/routes.php`.

Rotas encontradas:

- `GET /api/status`
- `GET /api/dashboard/resumo-dia`
- `GET /api/viagens`
- `GET /api/viagens/{id}`
- `POST /api/viagens`
- `PUT /api/viagens/{id}`
- `GET /api/motoristas`
- `POST /api/motoristas`
- `GET /api/veiculos`
- `POST /api/veiculos`
- `GET /api/pacientes`
- `POST /api/pacientes`
- `GET /api/viagens/{id}/passageiros`
- `POST /api/viagens/{id}/passageiros`
- `GET /api/viagens/{id}/eventos`
- `POST /api/viagens/{id}/eventos`
- `GET /api/viagens/{id}/localizacoes`
- `POST /api/localizacoes`
- `GET /api/viagens/{id}/mensagens`
- `POST /api/viagens/{id}/mensagens`
- `GET /api/alertas`
- `POST /api/alertas`
- `PUT /api/alertas/{id}/resolver`
- `GET /api/viagens/{id}/checklists`
- `POST /api/viagens/{id}/checklists`

## Dependencias

Nao existe `package.json` na raiz, entao nao ha dependencias Node.js registradas nesta fase.

A pagina usa Leaflet por CDN:

- `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`
- `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`

## Dados mockados, reais e simulacoes

- A demo estatica trabalha com dados demonstrativos embutidos no JavaScript.
- A versao PHP tenta carregar dados reais pelos endpoints e usa fallback demonstrativo quando a API ou o banco nao estao disponiveis.
- O seed MySQL e demonstrativo e nao deve ser tratado como dado real de operacao.
- A simulacao movimenta veiculo, eventos, mensagens, ocorrencias e sincronizacao.

## Arquivos duplicados ou redundantes

- `DEMO/` e `painel-logistico/public_html/` possuem CSS, JS e imagens semelhantes.
- `DEMO2.zip` e `painel-logistico-hostgator.zip` parecem pacotes de entrega ou backup e nao devem ser alterados nesta fase.
- Existe uma versao estatica e uma versao PHP da mesma experiencia visual.

## Arquivos possivelmente obsoletos

Nao foi removido nenhum arquivo. Para fases futuras, revisar:

- ZIPs na raiz.
- Duplicacao entre `DEMO/` e `painel-logistico/public_html/`.
- Dependencia de PHP/MySQL quando o servidor Node.js oficial existir.

## Pontos aproveitaveis

- Interface visual aprovada.
- Identidade Andrade Gestao em Saude.
- Menu e estrutura operacional do painel.
- Mapa com Leaflet/OpenStreetMap e fallback.
- Modelo de entidades no schema SQL.
- Lista de endpoints PHP como referencia para a API Node.js.
- Script de contrato como base para testes futuros.

## Pontos problematicos

- Ainda nao existe servidor Node.js na raiz.
- A base atual mistura demo estatica, PHP/MySQL e objetivo futuro Node.js.
- A documentacao existente tem foco em HostGator/cPanel, nao em servidor local Linux.
- A persistencia atual e MySQL, mas a fase alvo pede JSON ou SQLite inicial.
- Rotas do app motorista em `/api/driver/*` ainda nao existem.
- `.env.example` existia apenas dentro de `painel-logistico/`, nao como arquivo oficial da raiz.
- `.gitignore` ainda nao cobria `logs/` e `data/backups/`.

## Riscos tecnicos

- Expor porta 3000 na rede sem token, HTTPS e controle de origem.
- Confundir fallback demonstrativo com dado real.
- Perder a interface aprovada ao migrar para Node.js.
- Duplicar regras de negocio entre PHP e Node.js se a migracao nao tiver fronteira clara.
- Guardar dados sensiveis em arquivos versionados.
- Deixar `data/` ou `logs/` acessiveis pelo servidor estatico.
