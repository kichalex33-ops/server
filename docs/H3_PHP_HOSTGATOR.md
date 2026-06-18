# H3 PHP HostGator

## Estrutura criada

- `api/index.php`: entrada unica da API PHP.
- `api/config/env.php`: leitura das variaveis de ambiente.
- `api/src/Database.php`: conexao MySQL com PDO.
- `api/src/Auth.php`: login, refresh token e logout.
- `api/src/Jwt.php`: JWT HS256 sem dependencia externa.
- `api/src/Rbac.php`: controle por perfil.
- `api/src/AuditLogger.php`: auditoria e logs operacionais.
- `api/src/ApiService.php`: endpoints principais.
- `.htaccess` e `api/.htaccess`: rotas HostGator/Apache.

## Instalação no HostGator

1. Enviar os arquivos do projeto para a pasta publica do dominio.
2. Criar o banco MySQL no cPanel.
3. Configurar as variaveis `DB_*`, `JWT_SECRET`, `APP_URL` e `PUBLIC_API_URL`.
4. Executar a migration `db/migrations/001_php_hostgator_core.sql` no phpMyAdmin.
5. Criar usuarios reais na tabela `usuarios` com `senha_hash` gerado por `password_hash`.

## Backup

Executar no ambiente com PHP e acesso ao banco:

```bash
php scripts/backup-mysql.php
```

O arquivo `.sql` sera salvo em `storage/backups`.

## Restauração

1. Abrir phpMyAdmin.
2. Selecionar o banco da aplicação.
3. Importar o arquivo gerado em `storage/backups`.
4. Conferir as tabelas principais: `usuarios`, `motoristas`, `viagens`, `audit_logs`, `refresh_tokens`.

## Validação pendente

Este workspace não tem `php`, `mysql`, `node`, `npm`, `git` ou `gh` no PATH. A validação final precisa ser executada no HostGator ou em uma maquina com PHP/MySQL disponíveis.
