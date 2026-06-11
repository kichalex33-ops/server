# Dashboard Operador - Fase 5.1

## Objetivo

O painel Operador foi evoluido para uma visao profissional de acompanhamento em tempo real, preservando tela clara, foco operacional e identidade Andrade Gestao em Saude.

## Indicadores superiores

O endpoint `GET /api/indicadores/operador` entrega:

- Viagens Hoje
- Viagens Ativas
- Pacientes em Transito
- Em Espera
- Alertas Pendentes
- Veiculos Operacionais

## Graficos

O painel usa Chart.js por meio da camada unica `assets/js/charts/dashboard-charts.js`.

Graficos exibidos:

- Status das Viagens
- Movimentacao por Hora

## Feed operacional

O feed "Ultimos Eventos" apresenta os eventos recentes da operacao, com horario, tipo e descricao.

## Separacao visual

O Operador permanece voltado a:

- operacao
- viagens
- mapa
- alertas
- GPS

Itens gerenciais e financeiros ficam no painel Gestor.
