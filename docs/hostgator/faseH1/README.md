# Migração HostGator - Fase H1

Este diretório contém a documentação e os scripts necessários para preparar a infraestrutura MySQL na HostGator.

## Objetivos da Fase H1
1. **Estrutura:** Criação das pastas de suporte à migração.
2. **Banco de Dados:** Definição do Schema SQL e Seed de base para MySQL (InnoDB/UTF8mb4).
3. **Mapeamento:** Correlação técnica entre a persistência JSON (Node) e as Tabelas Relacionais (MySQL).
4. **Planejamento:** Documentação técnica para os próximos passos na HostGator.

## Conteúdo deste Diretório
- `README.md`: Visão geral da fase.
- `ESTRUTURA_BANCO.md`: Detalhamento técnico do Schema.
- `CRIAR_BANCO_CPANEL.md`: Passo a passo para criar o banco no cPanel.
- `IMPORTAR_PHPMYADMIN.md`: Guia de importação do Schema e Seed.
- `LGPD.md`: Considerações de segurança e privacidade de dados.
- `PREPARACAO_H2.md`: Roadmap para a Fase H2 (Backend PHP e Autenticação).

---
**Status:** Concluído
**Ambiente Alvo:** HostGator (Servidor Linux compartilhado/VPS)
