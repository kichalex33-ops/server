# Restauracao MySQL

## Backup

Execute no ambiente com PHP e acesso ao banco:

```bash
php scripts/backup-mysql.php
```

O arquivo sera salvo em `storage/backups`.

## Restauracao pelo phpMyAdmin

1. Acesse o cPanel do HostGator.
2. Abra o phpMyAdmin.
3. Selecione o banco da aplicacao.
4. Use a aba Importar.
5. Envie o arquivo `.sql` gerado pelo backup.
6. Valide as tabelas `usuarios`, `motoristas`, `viagens`, `audit_logs` e `refresh_tokens`.

## Restauracao por linha de comando

Quando o plano disponibilizar terminal:

```bash
mysql -h "$DB_HOST" -u "$DB_USER" -p "$DB_NAME" < storage/backups/arquivo.sql
```

Depois da importacao, valide `GET /api/status` e um login real em `POST /api/auth/login`.
