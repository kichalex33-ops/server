# H4.2 - Relatorio de correcao HostGator

## Escopo

O projeto foi preparado para funcionar em PHP 8.x com PDO MySQL na subpasta `/homologacao`. Nenhuma credencial real foi adicionada ou alterada, e o `.env` local permanece ignorado pelo Git.

## Falhas encontradas

- O roteamento da API removia apenas `/api`, falhando com `/homologacao/api/...`.
- O `.htaccess` nao cobria integralmente portal, paineis, assets e diretorios privados.
- Havia caminhos absolutos para a raiz do dominio e risco de URL `/api/api` no PWA.
- O QR gerado pelo PHP e o formato esperado pelo PWA eram diferentes.
- A consulta de login do motorista repetia o mesmo placeholder com prepared statements nativos do PDO.
- Faltavam status/cancelamento de pareamento, emergencias, watchdog e acoes de passageiro.
- O Painel Operador e a sala de situacao continham dados simulados.
- Existiam paginas de outro produto (`comando` e `painel`) sem contratos no backend PHP.
- O JWT podia ser instanciado sem segredo configurado.
- Faltava a tabela de compatibilidade `qr_tokens` solicitada no inventario.

## Correcoes aplicadas

- Normalizacao da URI pelo caminho real de `api/index.php`, incluindo instalacao em subpasta.
- Erros da API retornam JSON; ausencia ou invalidade de token retorna 401.
- Rotas administrativas de motoristas, veiculos, pacientes e viagens exigem JWT/RBAC.
- Regras Apache para portal, API, paineis, PWA e compatibilidade de assets.
- Bloqueio de `.env`, banco, documentos, scripts, storage e codigo interno da API.
- Base frontend fixada em `/homologacao` e `/homologacao/api`.
- QR/PWA alinhados ao contrato PHP e normalizacao preventiva contra `/api/api`.
- App motorista ligado a viagens, mensagens, ocorrencias, passageiros, GPS e sincronizacao reais.
- Sala de situacao baseada apenas em `/live-map` e OpenStreetMap, com varios veiculos e nome do motorista.
- Painel Operador refeito sem numeros, viagens, alertas ou pessoas ficticias.
- Paginas simuladas e paginas de outros produtos removidas.
- Compatibilidade `DB_PASSWORD` e `DB_PASS`.
- JWT bloqueado quando `JWT_SECRET` esta vazio.
- Migration aditiva de `qr_tokens`, sem `DROP TABLE` nas migrations.
- Backup permanece exclusivo para CLI/cron e bloqueado por navegador.

## Endpoints cobertos pelo frontend ativo

- Autenticacao: `/auth/login`, `/auth/refresh`, `/auth/logout`.
- Operador: `/indicadores/operador`, `/viagens`, `/alertas`, `/checklists`, `/ocorrencias`, `/motoristas`, `/graficos/viagens`.
- Gestao: `/gestao/dashboard`, `/gestao/frota`, `/gestao/motoristas`, `/gestao/passageiros`, `/gestao/custos`, `/gestao/auditoria`, `/graficos/*`, `/export/csv`.
- QR: `/motoristas/{id}/qrcode`, `/driver/qr-login`, `/driver/pairing/confirm`, `/operator/pairings/{id}/status`, `/operator/pairings/{id}/cancel`.
- Motorista: `/driver/trips`, `/driver/events`, `/driver/locations`, `/driver/messages`, `/driver/occurrences`, `/driver/passengers/{id}/{acao}`, checklist, km inicial, fluxo, finalizacao e panico.
- Operacao: `/gps`, `/live-map`, `/emergencias`, `/infra/status`, `/system/health`, `/watchdog`.

## Arquivos principais alterados

- `.htaccess`
- `api/index.php`
- `api/config/env.php`
- `api/src/ApiService.php`
- `api/src/Jwt.php`
- `db/migrations/001_php_hostgator_core.sql`
- `public/portal.html`, `public/operador.html`, `public/gestao.html`, `public/sala-situacao.html`, `public/emergencias.html`, `public/admin-infra.html`
- JavaScript ativo em `public/assets/js` e PWA em `public/motorista`

Arquivo criado: `.env.hostgator.example` com placeholders, sem segredos reais.

Arquivos removidos: paginas e scripts de simulacao, paginas de outro produto e arquivos sem uso associados a elas.

## Riscos e pendencias

- PHP nao esta instalado nesta maquina; nao foi possivel executar `php -l` nem testes locais da API.
- Nao ha MySQL local configurado; migrations, consultas, backup e restauracao precisam de teste no banco HostGator.
- `mod_rewrite`, `pdo_mysql`, permissoes de escrita e regras de bloqueio precisam ser confirmados no Apache real.
- O mapa depende dos tiles publicos do OpenStreetMap e da biblioteca Leaflet carregada por CDN.
- O login do motorista preserva o contrato legado de sessao; a homologacao deve confirmar o ciclo real do PWA antes de endurecimento adicional.
- A publicacao atual nao foi executada neste relatorio; o servidor ainda pode conter arquivos antigos ate o novo pacote ser enviado.

## Publicacao

1. Fazer backup da pasta atual e do banco.
2. Enviar o conteudo do pacote para `public_html/homologacao`, preservando o `.env` real existente.
3. Caso nao exista `.env`, criar no servidor a partir de `.env.hostgator.example` e substituir todos os placeholders.
4. Importar `db/migrations/001_php_hostgator_core.sql` pelo phpMyAdmin no banco correto.
5. Aplicar escrita 0755/0775 apenas a `storage/logs`, `storage/uploads` e `storage/backups`, conforme a politica da conta.
6. Executar o checklist `docs/H4_2_CHECKLIST_HOSTGATOR_FINAL.md`.
7. Somente depois dos testes funcionais alterar o status para homologado.

## Status final

**PRONTO PARA TESTE NA HOSTGATOR**

Nao homologado ainda: faltam publicacao e testes reais de Apache, PHP e MySQL.
