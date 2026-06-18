# FASE H4 - 01 Preparacao

Data: 2026-06-18
Repositorio: `kichalex33-ops/server`
Branch: `codex/h3-php-hostgator`

## Objetivo

Validar a preparacao minima para iniciar a homologacao operacional PHP + Flutter + MySQL na HostGator.

Esta etapa nao homologa funcionalidades. Ela verifica se o pacote esta pronto para ser publicado em ambiente PHP/MySQL real.

## Ambiente local verificado

| Item | Status | Evidencia |
| --- | --- | --- |
| PHP 8+ local | FALHA | `php` nao esta instalado/disponivel no PATH local. |
| PDO MySQL local | NAO EXECUTADO | Depende de PHP local ou HostGator. |
| Cliente MySQL local | FALHA | `mysql` nao esta instalado/disponivel no PATH local. |
| Banco MySQL configurado | NAO EXECUTADO | Sem credenciais reais de HostGator nesta maquina. |
| Variaveis de ambiente | PARCIAL | Existe `.env.example` e foi gerado `.env.homologacao.modelo` no pacote de homologacao. |
| Estrutura de pastas | PARCIAL | Estrutura PHP existe e pacote de homologacao foi gerado com `api/`, `public/`, `db/`, `scripts/` e `storage/`. |
| Migrations executadas | NAO EXECUTADO | Migration existe, mas nao foi importada em MySQL real. |

## Arquivos verificados

- `api/index.php`
- `api/config/env.php`
- `api/src/Database.php`
- `api/src/Auth.php`
- `api/src/Rbac.php`
- `api/src/AuditLogger.php`
- `api/src/ApiService.php`
- `db/migrations/001_php_hostgator_core.sql`
- `scripts/backup-mysql.php`
- `scripts/hash-password.php`
- `.env.example`
- `.htaccess`

## Pacote de homologacao

Foi gerado pacote local para upload na HostGator:

- Pasta: `C:\dev\deploy\server-hostgator-homologacao-20260618-121408`
- ZIP: `C:\dev\deploy\server-hostgator-homologacao-20260618-121408.zip`

O pacote contem:

- API PHP
- paineis publicos
- migration MySQL
- scripts PHP de apoio
- modelo de `.env`
- pastas `storage/logs`, `storage/uploads`, `storage/backups`
- guia `PASSO_1_HOSTGATOR_HOMOLOGACAO.txt`

## Sobra Node encontrada

Durante a preparacao foi encontrado `scripts/backup.js`, que dependia de `src/repositories/jsonRepository`.

Acao realizada:

- removido localmente em commit `7f8d692`
- removido remotamente na branch `codex/h3-php-hostgator` via conector GitHub em commit `ef276f7`

## Resultado da Etapa 1

Status: PARCIAL

A estrutura esta pronta para subir em ambiente de homologacao, mas a Etapa 1 so pode ser aprovada depois de validar na HostGator:

- PHP 8+
- extensao PDO MySQL
- importacao da migration
- `.env` real
- permissao de escrita em `storage/*`
- resposta real de `GET /api/status`

## Pendencias para aprovar a Etapa 1

1. Criar banco MySQL na HostGator.
2. Importar `db/migrations/001_php_hostgator_core.sql`.
3. Criar `.env` real a partir de `.env.homologacao.modelo`.
4. Subir o pacote para subdominio/pasta de homologacao.
5. Testar `GET /api/status`.
6. Testar escrita em `storage/logs`.
