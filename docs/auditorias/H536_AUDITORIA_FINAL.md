# H5.36 — Auditoria final

## Escopo

Versão incremental sobre a H5.35 para registrar duas decisões técnicas que não devem ficar implícitas:

1. Confirmação prévia ao paciente por WhatsApp/SMS entra como backlog futuro, não como esquecimento.
2. Teste de migrations em staging passa a ser gate obrigatório para qualquer versão que altere schema.

## Correções e adições

- Criado `BACKLOG_H536_COMPLEMENTOS.md`.
- Criado `MIGRATION_STAGING_CHECKLIST_H536.md`.
- Criado `.env.staging.example`.
- Criado `scripts/validate-migrations-staging.php`.
- Atualizado `.gitignore` para bloquear `.env.staging` e relatórios locais de teste de migration.
- Criado `H536_IMPLEMENTACAO.md`.
- Criado `H536_AUDITORIA_FINAL.md`.
- Reforçado `.htaccess` para bloquear acesso direto a arquivos `.md`.

## Segurança do gate de migration

O script `scripts/validate-migrations-staging.php`:

- usa `.env.staging` por padrão, não `.env`;
- recusa `APP_ENV=production` ou `APP_ENV=prod`;
- aceita apenas ambientes de teste como `staging`, `homologacao`, `test`, `dev` e `local`;
- lista migrations sem precisar conectar ao banco com `--list`;
- ignora migrations destrutivas de reset por padrão;
- só permite destrutivas com `--allow-destructive`, para staging descartável;
- gera relatório JSON local em `storage/logs/migration-test-*.json` quando executado.

## Auditoria técnica executada

- PHP syntax: passou.
- JavaScript syntax: passou.
- Arquivos PHP verificados: 14.
- Arquivos JS verificados: 32.
- HTMLs encontrados: 45.
- `env (1)`: não encontrado.
- `.env` real: não encontrado.
- `.env.staging` real: não encontrado.
- `api.log`: não encontrado.
- ZIP interno no pacote: não encontrado.
- Migrations listadas pelo validador: 11.
- `scripts/validate-migrations-staging.php --list`: passou.

## Observação importante

A H5.36 não implementa envio real de WhatsApp/SMS. Ela registra a funcionalidade como backlog futuro e adiciona a base de governança para evitar que migrations sejam aplicadas sem teste prévio em staging.

Para usar no HostGator, preserve o `.env` real do servidor. Para testar migrations, crie uma base separada e um arquivo `.env.staging` baseado em `.env.staging.example`.
