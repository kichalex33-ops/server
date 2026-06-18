# Plataforma Logistica - Server PHP HostGator

Servidor PHP/MySQL para HostGator Shared Hosting.

## Estrutura principal

- `public/portal.html`: tela de acesso.
- `public/operador.html`: painel do operador, cadastro de motorista e QR Code.
- `public/gestao.html`: painel gestor.
- `api/index.php`: API PHP consumida pelos paineis e pelo app.
- `db/migrations/001_php_hostgator_core.sql`: estrutura MySQL.

## Rotas dos paineis

- `/painel-logistico`
- `/painel-logistico/operador`
- `/painel-logistico/gestao`

## Configuracao obrigatoria

- Configurar `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e `JWT_SECRET`.
- Importar a migration SQL no MySQL.
- Criar usuarios reais na tabela `usuarios`.
- Criar motoristas reais pelo painel operador, com senha para o app motorista.

Nao ha dados de demonstracao nem senhas fixas no codigo.

## Fases recentes

- `docs/H3_5_AUDITORIA_CONVERSAO_PHP.md`
- `docs/H3_6_CORRECAO_NAO_CONFORMIDADES.md`

## Validacao pendente

A homologacao final deve ocorrer em PHP 8 + MySQL na HostGator ou ambiente equivalente.