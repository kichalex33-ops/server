# Guia de Migração JSON → MySQL

Foi criado um script automatizado para transferir os dados atuais do arquivo JSON para o banco MySQL.

## Pré-requisitos
1. MySQL instalado e rodando.
2. Banco de dados criado e Schema importado (`database/hostgator/schema.sql`).
3. Arquivo `.env` configurado com `DB_DRIVER=mysql` e credenciais corretas.

## Execução
No terminal do projeto, execute:
```bash
npx tsx scripts/migrate-json-to-mysql.ts
```

## Regras de Negócio do Script
- **Idempotência:** Se um registro com o mesmo `id` já existir no MySQL, ele será ignorado.
- **Integridade:** O script valida campos obrigatórios antes de tentar inserir.
- **Relatório:** Um log detalhado é gerado em `migration/reports/`.
- **Segurança:** O arquivo JSON original **nunca** é apagado.

---
*Dica: Execute o script sempre que quiser sincronizar sua base local com um novo ambiente MySQL.*
