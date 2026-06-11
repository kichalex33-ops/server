# Fase H2 - Adaptação para MySQL (Backend Híbrido)

Esta fase implementou a camada de persistência flexível, permitindo ao servidor Node.js alternar entre o armazenamento em arquivos JSON e o banco de dados relacional MySQL 8.

## Principais Implementações
1. **Repository Factory:** Padrão que seleciona o driver de banco de dados baseado na variável `DB_DRIVER`.
2. **Camada MySQL:** Repositórios baseados em `mysql2/promise` com suporte a Prepared Statements.
3. **Módulos Migrados:** Motoristas, Veículos, Pacientes e Viagens já possuem suporte a MySQL.
4. **Health Check:** Novo endpoint para monitorar a saúde da conexão com o banco.
5. **Script de Migração:** Ferramenta para transferir dados legados do JSON para o MySQL de forma segura.

## Como Utilizar
- Consulte `DB_DRIVER.md` para entender as configurações de ambiente.
- Consulte `MIGRACAO_JSON_MYSQL.md` para instruções de transferência de dados.
- Consulte `TESTES_H2.md` para validar sua instalação.

---
**Status:** Implementado
**Branches:** `fase-h2-node-mysql`
