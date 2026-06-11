# Matriz de Migração (Endpoints → MySQL)

Mapeamento de endpoints da API Node.js atual para a estrutura futura no MySQL.

| Endpoint Atual (Node) | Tabela MySQL Utilizada | Prioridade | Descrição do Fluxo |
| :--- | :--- | :--- | :--- |
| `GET /api/status` | `configuracoes` | Baixa | Verifica saúde do sistema e versão do banco. |
| `POST /api/driver/login` | `motoristas` | Alta | Autenticação do app motorista no banco relacional. |
| `POST /api/motoristas` | `motoristas`, `driver_pairings` | Alta | Cadastro de motorista e geração automática de pareamento. |
| `GET /api/viagens` | `viagens` | Alta | Listagem de missões logísticas. |
| `POST /api/viagens` | `viagens`, `passageiros` | Alta | Criação de nova missão com vínculo de passageiros. |
| `POST /api/gps` | `localizacoes`, `viagens` | Alta | Registro de posição e atualização de status da viagem. |
| `GET /api/live-map` | `localizacoes`, `viagens` | Média | Dados para visualização de frota em tempo real. |
| `GET /api/dashboard/...` | `viagens`, `localizacoes`, `despesas` | Média | Agregação de dados para indicadores e KPIs. |
| `POST /api/checklists` | `checklists` | Média | Registro de vistorias de veículos. |
| `POST /api/driver/pairing/confirm` | `driver_pairings`, `driver_devices` | Alta | Confirmação de conexão e registro de dispositivo. |

## Plano de Transição
Cada endpoint acima será reescrito na Fase H2 para realizar operações `SELECT`, `INSERT`, `UPDATE` no MySQL, substituindo as chamadas ao `jsonRepository`.

---
**Prioridade:**
- **Alta:** Essencial para operação básica e aplicativo.
- **Média:** Necessário para gestão e dashboards.
- **Baixa:** Auxiliar ou de sistema.
