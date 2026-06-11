# Guia de Testes - Fase H2

Siga estes passos para garantir que a adaptação MySQL não quebrou as funcionalidades atuais.

## 1. Teste em Modo JSON (Padrão)
1. Certifique-se que `.env` possui `DB_DRIVER=json`.
2. Inicie o servidor: `npm run dev`.
3. Verifique o Health Check: `GET http://localhost:3000/api/system/health`.
   - Esperado: `db_driver: "json"`, `database: "disabled"`.
4. Realize um cadastro de motorista e verifique se o arquivo `data/painel-logistico.json` foi atualizado.

## 2. Teste em Modo MySQL (Se disponível)
1. Configure o `.env` com `DB_DRIVER=mysql` e credenciais de um banco vazio.
2. Importe o schema: `mysql -u user -p banco < database/hostgator/schema.sql`.
3. Inicie o servidor: `npm run dev`.
4. Verifique o Health Check: `GET http://localhost:3000/api/system/health`.
   - Esperado: `db_driver: "mysql"`, `database: "ok"`.
5. Execute a migração: `npx tsx scripts/migrate-json-to-mysql.ts`.
6. Tente listar os motoristas via API e confirme que os dados vieram do banco.

## 3. Verificação de Regressão
- [ ] QR Code continua sendo gerado (no cadastro de motorista).
- [ ] GPS continua sendo recebido (testar via POST /api/gps).
- [ ] Dashboards do operador carregam sem erros.
