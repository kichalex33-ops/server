# Planejamento: Preparação para Fase H2

A Fase H2 será o início da implementação do backend na HostGator utilizando PHP (ou Node.js se o plano suportar).

## Roadmap H2
1. **Ambiente:** Configuração do `.env` com as credenciais do banco criado na H1.
2. **Conexão:** Implementação da classe de conexão (PDO/MySQLi).
3. **Autenticação:** Criação do sistema de login relacional (tabelas `usuarios` e `perfis`).
4. **CRUD Base:** Implementação das primeiras APIs para cadastro de Motoristas e Veículos direto no MySQL.
5. **Bridge:** Desenvolvimento de script para importar dados legados do JSON para o MySQL pela primeira vez.

## Requisitos de Hardware/Software
- PHP 7.4 ou 8.x (Recomendado).
- Extensão `PDO_MYSQL` habilitada.
- SSL Ativo (HTTPS) para segurança dos tokens.

---
**Status da H1:** PRONTA PARA TRANSIÇÃO.
