# Checkpoint Pré-H2

## Informações Gerais
- **Data:** 11/06/2026
- **Commit de Referência:** ab07a263e371037977b0163d934a593aa591bdda
- **Status do Servidor:** Operacional em TypeScript (ESM) com persistência JSON.

## Arquivos Principais
- `src/server.ts`: Ponto de entrada.
- `src/app.ts`: Configuração do Express.
- `src/repositories/jsonRepository.ts`: Persistência atual.
- `src/services/logisticService.ts`: Lógica de negócio.

## Status das Funcionalidades (JSON)
- **QR Code:** Funcionando (v2).
- **GPS:** Funcionando com fila de escrita.
- **Motoristas/Veículos:** CRUD via API operacional.
- **Painéis:** Operador e Gestor integrados via polling.

---
Este documento registra o estado estável do projeto antes da introdução da camada de persistência MySQL.
