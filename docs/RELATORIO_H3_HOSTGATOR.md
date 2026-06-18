# Relatorio H3 HostGator - PHP/MySQL

## Resumo

O servidor foi convertido para uma API PHP com MySQL/PDO para hospedagem HostGator. A camada Node foi removida dos arquivos-fonte do projeto; os painéis públicos foram preservados e continuam consumindo os mesmos caminhos `/api/...`.

## Arquivos criados

- `.htaccess`
- `index.php`
- `api/.htaccess`
- `api/index.php`
- `api/config/env.php`
- `api/src/Database.php`
- `api/src/Response.php`
- `api/src/Jwt.php`
- `api/src/Auth.php`
- `api/src/Rbac.php`
- `api/src/AuditLogger.php`
- `api/src/ApiService.php`
- `db/migrations/001_php_hostgator_core.sql`
- `public/assets/js/api-config.js`
- `scripts/backup-mysql.php`
- `scripts/hash-password.php`
- `docs/H3_PHP_HOSTGATOR.md`

## Arquivos alterados

- `.env.example`
- `public/portal.html`
- `public/operador.html`
- `public/gestao.html`
- `public/assets/js/portal.js`
- `public/assets/js/operador-dashboard.js`
- `public/assets/js/gestao.js`
- `docs/RESTAURACAO_MYSQL.md`
- `LEIA-ME-PAINEIS.txt`

## Arquivos removidos

- `server.js`
- `package.json`
- `package-lock.json`
- `1-INICIAR-SERVIDOR.cmd`
- `scripts/backup-mysql.js`
- `scripts/hash-password.js`
- `scripts/validate-build.js`
- Arquivos-fonte Node em `src/`

Observacao: a remocao recursiva de `node_modules` foi bloqueada pelo sandbox local. Ela nao e mais usada pela aplicacao PHP e pode ser apagada fora deste ambiente.

## Dependencias

Dependencias adicionadas: nenhuma dependencia externa PHP. A API usa PHP nativo, PDO e extensao MySQL.

Dependencias removidas: Express, CORS, Dotenv, Nodemon e demais pacotes Node deixaram de ser usados.

## Rotas protegidas

Rotas publicas:

- `GET /api/status`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/driver/qr-login`

Rotas protegidas por JWT/RBAC:

- `POST /api/auth/logout`
- `GET/POST /api/motoristas`
- `POST /api/motoristas/{id}/qrcode`
- `GET /api/indicadores/operador`
- `GET /api/gestao/*`
- `GET /api/graficos/*`
- `GET /api/auditoria`
- `GET/POST /api/lgpd/*`
- `GET /api/export/csv`
- Endpoints principais de colecoes: `viagens`, `veiculos`, `pacientes`, `despesas`, `ocorrencias`, `alertas`, `mensagens`, `checklists`, `eventos`, `localizacoes`

Perfis RBAC implementados:

- `ADMIN`
- `GESTOR`
- `OPERADOR`
- `MOTORISTA`
- `CIDADAO`

## Tabelas criadas

- `usuarios`
- `refresh_tokens`
- `motoristas`
- `motorista_qr_tokens`
- `veiculos`
- `pacientes`
- `viagens`
- `passageiros`
- `despesas`
- `eventos`
- `alertas`
- `ocorrencias`
- `mensagens`
- `checklists`
- `localizacoes`
- `audit_logs`
- `operational_logs`
- `lgpd_consents`
- `data_access_logs`
- `data_privacy_requests`

## Validação

Nao foi possivel executar PHP/MySQL localmente porque este workspace nao possui `php` nem `mysql` no PATH. Tambem nao ha `git`, `gh`, `node` ou `npm` no PATH.

Validação realizada:

- Revisao estatica dos arquivos PHP criados.
- Conferencia de chamadas dos painéis para `/api`.
- Conferencia de remocao dos arquivos Node principais.

Validação pendente no HostGator:

- Importar `db/migrations/001_php_hostgator_core.sql`.
- Criar usuarios reais na tabela `usuarios`.
- Testar `GET /api/status`.
- Testar login JWT.
- Testar cadastro de motorista no painel operador.
- Testar geracao de QR e leitura no app.
- Testar exportacao CSV.
- Testar backup `php scripts/backup-mysql.php`.

## Riscos identificados

- Sem PHP/MySQL no ambiente local, a validacao final precisa ocorrer no HostGator ou em ambiente equivalente.
- A aplicacao nao cria usuario demo; o primeiro usuario real precisa ser inserido no MySQL com senha gerada por `scripts/hash-password.php`.
- `node_modules` ainda aparece na pasta local por bloqueio de remocao recursiva do sandbox, mas nao participa da aplicacao PHP.

## Grau de prontidao HostGator

75%.

O codigo-fonte PHP, as rotas, a estrutura MySQL e os painéis estao preparados. A prontidao nao e maior porque falta executar a migration e validar a API em um ambiente com PHP/PDO/MySQL reais.
