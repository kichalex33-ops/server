# Mapeamento Node (JSON) → MySQL (Futuro)

Este documento descreve a relação entre a persistência atual baseada em arquivos JSON no servidor Node.js e as tabelas MySQL planejadas para a migração HostGator.

| Arquivo/Coleção JSON Node.js | Tabela MySQL Futura | Descrição |
| :--- | :--- | :--- |
| `motoristas` | `motoristas` | Dados cadastrais dos motoristas e acesso ao app. |
| `veiculos` | `veiculos` | Cadastro de frota, prefixos e placas. |
| `pacientes` | `pacientes` | Cadastro de pacientes e acompanhantes. |
| `passageiros` | `passageiros` | Vínculo entre pacientes e viagens específicas. |
| `viagens` | `viagens` | Registro operacional das missões logísticas. |
| `localizacoes` | `localizacoes` | Histórico de rastreamento GPS em tempo real. |
| `eventos` | `eventos` | Timeline de alterações de status e ações do sistema. |
| `alertas` | `alertas` | Notificações de velocidade, GPS parado e atrasos. |
| `mensagens` | `mensagens` | Comunicação interna entre operador e motorista. |
| `checklists` | `checklists` | Vistorias pré-viagem dos veículos. |
| `ocorrencias` | `ocorrencias` | Registro de problemas, panicos e incidentes. |
| `despesas` | `despesas` | Controle de custos (combustível, pedágio, etc). |
| `driverPairings` | `driver_pairings` | Controle de tokens de pareamento via QR Code. |
| `driverDevices` | `driver_devices` | Registro de smartphones e versões de app vinculadas. |
| `auditLogs` | `audit_logs` | Rastro de auditoria para conformidade e segurança. |
| `syncLogs` | `sync_queue` | Fila de sincronização offline-first do aplicativo. |
| `config` | `configuracoes` | Parâmetros globais do sistema e empresa. |
| `usuarios` | `usuarios` | Acesso administrativo ao painel Web. |
| (N/A) | `perfis` | Tabela nova para controle de permissões granular. |
| (N/A) | `usuario_perfis` | Tabela nova de relacionamento N:N entre usuários e perfis. |
| (N/A) | `estabelecimentos` | Tabela nova para gerenciar hospitais, UBS e pontos de apoio. |
| (N/A) | `arquivos` | Tabela nova para gerenciar uploads e fotos de provas/documentos. |

## Observações de Conversão
1. **IDs:** Atualmente o Node usa IDs textuais (`mot-001`, `VIA-001`). O MySQL manterá o tipo `VARCHAR(50)` para compatibilidade total.
2. **Datas:** Todas as strings ISO (`2026-06-11T...`) serão convertidas para tipos `DATETIME` ou `TIMESTAMP` nativos do MySQL.
3. **JSON:** Campos complexos (como os itens do checklist) utilizarão o tipo `JSON` nativo do MySQL 5.7+ disponível na HostGator.
