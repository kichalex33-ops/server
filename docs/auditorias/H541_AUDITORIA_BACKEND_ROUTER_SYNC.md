# H5.41 - Auditoria backend, router, segurança e sincronização

## Escopo

Aplicado sobre H540, sem gerar ZIP.

## 1. Limpeza Node/Express

Status: OK.

Resultado da varredura local:

- Não existe `package.json`.
- Não existe `package-lock.json`, `yarn.lock` ou `pnpm-lock.yaml`.
- Não existe `node_modules/` versionado.
- Não existe `server.js` ou `app.js` Node.
- Não foi encontrado `express()` nem `require('express')`.
- A pasta `api/src/` é PHP e deve permanecer.

Decisão: nenhum arquivo foi apagado. Não havia Node/Express real para expurgar.

## 2. Router PHP por array

Status: OK.

Arquivos criados/alterados:

- `api/src/Router.php`
- `api/index.php`

O roteamento deixou de depender do bloco longo de `if/else` e passou a usar registro de rotas por método e path, com suporte a rotas dinâmicas como:

- `/motoristas/{id}`
- `/viagens/{id}/passageiros`
- `/driver/passengers/{id}/{action}`

Auditoria:

- `php -l api/src/Router.php`: OK.
- `php -l api/index.php`: OK.
- Teste local de rota dinâmica: OK.

## 3. Middleware unificado

Status: OK.

Arquivos criados/alterados:

- `api/src/ApiMiddleware.php`
- `api/config/env.php`
- `.env.example`
- `.env.hostgator.example`
- `.env.homologacao.modelo`
- `.env.staging.example`

Responsabilidades centralizadas:

- CORS.
- OPTIONS/preflight.
- Normalização de path em subpasta HostGator.
- Leitura de JSON body.
- Leitura do header Authorization.
- Autenticação JWT.
- Compatibilidade com token do motorista.
- RBAC antes do controller.

Auditoria:

- `php -l api/src/ApiMiddleware.php`: OK.
- Rotas públicas preservadas: OK.

## 4. BaseController

Status: OK.

Arquivos criados:

- `api/controllers/BaseController.php`
- `api/controllers/LegacyController.php`

O BaseController concentra resposta JSON, CSV, usuário autenticado e escopo de motorista. O LegacyController mantém compatibilidade com os serviços atuais sem reescrever a regra de negócio toda de uma vez.

Auditoria:

- `php -l api/controllers/BaseController.php`: OK.
- `php -l api/controllers/LegacyController.php`: OK.

## 5. JWT: token_version + blacklist

Status: OK.

Arquivos criados/alterados:

- `api/src/Auth.php`
- `api/src/Jwt.php`
- `db/migrations/012_h541_auth_router_jwt.sql`
- `api/cron/clean_jwt_blacklist.php`

Mudanças:

- JWT agora exige header `alg=HS256` e `typ=JWT`.
- Access token recebe `jti`.
- Access token recebe `v` com `token_version` do usuário.
- Middleware rejeita token com `jti` na blacklist.
- Middleware rejeita token com `token_version` antigo.
- Logout revoga refresh token e coloca o access token atual na blacklist.
- Novo endpoint protegido: `POST /auth/revoke-all`.
- Cron para limpar tokens expirados da blacklist.

Auditoria:

- `php -l api/src/Auth.php`: OK.
- `php -l api/src/Jwt.php`: OK.
- `php -l api/cron/clean_jwt_blacklist.php`: OK.

## 6. Sincronização offline e conflito Flutter

Status: OK.

Arquivos criados/alterados:

- `api/src/ApiService.php`
- `db/migrations/013_h541_offline_sync_json_realtime.sql`

Novos endpoints:

- `POST /sync/offline`
- `POST /sync/resolve-conflict`

Recursos implementados:

- `client_uuid` para evitar duplicidade quando o app reenviar ação offline.
- `client_timestamp` para preservar a data real da ação no aparelho.
- `version` para optimistic locking.
- Retorno `conflict` quando a versão do servidor mudou antes da sincronização.
- Resolução de conflito com sobrescrita controlada.

Auditoria:

- `php -l api/src/ApiService.php`: OK.

## 7. JSON generated columns

Status: OK, via migration controlada.

Arquivo:

- `db/migrations/013_h541_offline_sync_json_realtime.sql`

Decisão técnica:

Não foi feita conversão cega de `metadados TEXT` para `JSON`, porque isso pode quebrar dados antigos inválidos no HostGator. Em vez disso, foram criadas colunas geradas indexáveis usando `JSON_VALID`:

- `localizacoes.temperatura_c`
- `eventos.temp_max_c`

Isso dá consulta rápida sem arriscar perda de dados.

## 8. Pusher/Ably

Status: OK, opcional e desligado por padrão.

Arquivo criado:

- `api/src/RealtimePublisher.php`

Configuração via `.env`:

- `REALTIME_PROVIDER=none|ably|pusher`
- `ABLY_API_KEY=`
- `PUSHER_APP_ID=`
- `PUSHER_KEY=`
- `PUSHER_SECRET=`
- `PUSHER_CLUSTER=mt1`
- `REALTIME_CHANNEL=logistica-saude`

Eventos publicados quando configurado:

- `gps.location`
- `driver.panic`
- `emergency.updated`
- `sync.offline`
- `sync.update`

## Auditoria final

Comandos executados:

```bash
find api scripts -type f -name '*.php' -print0 | xargs -0 -n1 php -l
find public -type f -name '*.js' -print0 | xargs -0 -n1 node --check
find . \( -name package.json -o -name package-lock.json -o -name yarn.lock -o -name pnpm-lock.yaml -o -name node_modules -o -name vite.config.js -o -name webpack.config.js -o -name server.js -o -name app.js \) -print
grep -RInE "express\(|from ['\"]express|require\(['\"]express" . --exclude-dir=.git
```

Resultado:

- PHP syntax: OK.
- JavaScript syntax: OK.
- Node/Express ativo: não encontrado.
- ZIP: não criado.

## Observação operacional

Antes de aplicar em produção, rode as migrations 012 e 013 em banco de homologação. A migration 013 mexe em estrutura de tabelas e deve ser testada fora da base principal primeiro.
