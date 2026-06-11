# Decisoes dos Agentes - Fase 5.1

## Regra global

A Fase 5.1 foi conduzida considerando a regra de uso obrigatorio dos agentes descrita em `AGENTS.md`.

Foram lidos:

- `.agents/AGENTE_ARQUITETO.md`
- `.agents/AGENTE_FRONTEND_UI.md`
- `.agents/AGENTE_BACKEND_NODE.md`
- `.agents/AGENTE_TESTES.md`
- `.agents/AGENTE_DOCUMENTACAO.md`
- `docs/fase1/*`
- `docs/fase2/*`
- `docs/fase3/*`
- `docs/fase4/*`
- `docs/fase5/*`

Observacao: `docs/fase11/` nao existe no repositorio no momento da execucao.

## Decisoes por agente

### Arquiteto

- Manter a separacao entre Operador e Gestor.
- Criar uma camada unica de graficos em `public/assets/js/charts/`.
- Expor APIs especificas para indicadores e graficos, sem acoplar o frontend aos dados internos do JSON.
- Evitar IA, WhatsApp, seguradora, WebSocket, PDF e SUS nesta fase.

### Frontend UI

- Manter o painel Operador em tela clara e com leitura operacional imediata.
- Reforcar a identidade visual Andrade Gestao em Saude com cards claros, bordas discretas, dourado institucional e hierarquia limpa.
- Criar graficos Chart.js reutilizando a camada unica.
- Priorizar desktop, notebook e monitores grandes.

### Backend Node

- Adicionar endpoints de indicadores:
  - `GET /api/indicadores/operador`
  - `GET /api/indicadores/gestor`
- Adicionar endpoints de graficos:
  - `GET /api/graficos/viagens`
  - `GET /api/graficos/custos`
  - `GET /api/graficos/frota`
  - `GET /api/graficos/ocorrencias`
- Retornar datasets simples, prontos para Chart.js.

### Testes

- Criar teste focado `tests/fase51AdvancedDashboards.test.js`.
- Validar endpoints, estrutura de KPIs, rankings e presenca da camada unica de graficos nas paginas.

### Documentacao

- Criar a pasta `docs/fase51/`.
- Documentar dashboards, graficos, KPIs, rankings, testes e pendencias para Fase 6.
