# Pendências para Fase H3

A Fase H2 estabeleceu a fundação. Os itens abaixo serão abordados na Fase H3:

1. **Migração Completa:** Módulos de Localização (GPS), Alertas e Auditoria ainda usam JSON (via fallback no factory).
2. **Autenticação JWT:** Migrar o sistema de tokens simples para JWT persistido no banco.
3. **Uploads:** Implementar a persistência de metadados de arquivos na tabela `arquivos`.
4. **Relatórios SQL:** Otimizar dashboards para usar queries SQL nativas (mais rápidas que processamento em memória JS).
5. **PHP Bridge:** Início do desenvolvimento das APIs PHP para hosting compartilhado restrito.

---
**Data:** 11/06/2026
