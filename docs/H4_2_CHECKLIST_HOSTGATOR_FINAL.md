# H4.2 - Checklist final HostGator

Base web: `https://agsap.com.br/homologacao`

Base API: `https://agsap.com.br/homologacao/api`

Este checklist deve ser executado depois da publicacao do pacote e da configuracao do `.env` real no servidor. Os itens abaixo nao foram marcados como aprovados sem teste real.

## Preparacao

- [ ] Confirmar PHP 8.x no cPanel.
- [ ] Confirmar extensao `pdo_mysql` ativa.
- [ ] Manter o `.env` real fora do pacote e preencher banco, URL e JWT.
- [ ] Usar um `JWT_SECRET` longo e exclusivo; segredo vazio bloqueia a emissao e validacao de JWT.
- [ ] Executar `db/migrations/001_php_hostgator_core.sql` no banco correto.
- [ ] Garantir escrita apenas em `storage/logs`, `storage/uploads` e `storage/backups`.

## URLs e Apache

- [ ] `GET /homologacao/` abre `public/portal.html` com estilo e logo.
- [ ] `GET /homologacao/api/status` retorna HTTP 200, `ok:true`, `runtime:php` e `mysql:true` no JSON.
- [ ] `GET /homologacao/painel-logistico/operador` abre o painel operador.
- [ ] `GET /homologacao/painel-logistico/gestao` abre o painel gestor.
- [ ] `GET /homologacao/painel-logistico/sala-situacao` abre o mapa OpenStreetMap.
- [ ] Arquivos em `/homologacao/public/assets/...` retornam HTTP 200.
- [ ] A compatibilidade `/homologacao/assets/...` retorna os mesmos assets.

## Bloqueios obrigatorios

Confirmar resposta 403 ou 404 para:

- [ ] `/homologacao/.env`
- [ ] `/homologacao/db/`
- [ ] `/homologacao/docs/`
- [ ] `/homologacao/scripts/`
- [ ] `/homologacao/storage/`
- [ ] `/homologacao/api/src/`
- [ ] `/homologacao/api/config/`
- [ ] `/homologacao/scripts/backup-mysql.php`
- [ ] `/homologacao/scripts/hash-password.php`

## Autenticacao e paineis

- [ ] `POST /homologacao/api/auth/login` gera access token e refresh token.
- [ ] `POST /homologacao/api/auth/refresh` renova a sessao.
- [ ] `POST /homologacao/api/auth/logout` revoga o refresh token.
- [ ] Rota protegida sem `Authorization` retorna HTTP 401 com JSON `ok:false`.
- [ ] Operador acessa apenas recursos permitidos pelo RBAC.
- [ ] Gestor acessa apenas recursos permitidos pelo RBAC.
- [ ] Login operador redireciona para `/homologacao/painel-logistico/operador`.
- [ ] Login gestor redireciona para `/homologacao/painel-logistico/gestao`.

## App motorista, QR e GPS

- [ ] QR gerado no painel possui `tipo:MOTORISTA_QR_LOGIN`, servidor, motorista, token e expiracao.
- [ ] `POST /driver/pairing/confirm` aceita o QR uma unica vez.
- [ ] QR expirado, usado ou cancelado e recusado.
- [ ] O PWA nao monta URL duplicada `/api/api`.
- [ ] Viagens reais aparecem no app motorista.
- [ ] Embarque, desembarque e ausencia atualizam `passageiros`.
- [ ] GPS grava latitude, longitude, motorista e viagem em `localizacoes`.
- [ ] `/live-map` exibe simultaneamente os veiculos com GPS real e o nome dos motoristas.
- [ ] Sem dados ou sem API, os paineis mostram estado vazio; nenhuma simulacao e exibida.

## Banco, auditoria e backup

- [ ] Conferir as tabelas: `usuarios`, `refresh_tokens`, `motoristas`, `veiculos`, `pacientes`, `viagens`, `passageiros`, `localizacoes`, `eventos`, `alertas`, `despesas`, `ocorrencias`, `mensagens`, `checklists`, `avisos`, `comprovantes`, `audit_logs`, `qr_tokens` e `motorista_qr_tokens`.
- [ ] Confirmar logs de login, logout, QR, GPS e alteracoes cadastrais em `audit_logs`.
- [ ] Executar `php scripts/backup-mysql.php` somente por terminal/cron do cPanel.
- [ ] Validar o arquivo SQL gerado em `storage/backups`.
- [ ] Restaurar o backup em banco separado e comparar contagens antes de considerar aprovado.

## Resultado

Status atual: **PRONTO PARA TESTE NA HOSTGATOR**.

Homologacao final: **PENDENTE DE EXECUCAO DESTE CHECKLIST NO SERVIDOR REAL**.
