# Graficos - Fase 5.1

## Biblioteca

A Fase 5.1 implementa Chart.js via CDN nas paginas dos dashboards.

## Camada unica

A camada unica fica em:

```text
public/assets/js/charts/dashboard-charts.js
```

Responsabilidades:

- buscar datasets de graficos quando necessario
- padronizar cores
- criar instancias Chart.js
- evitar logica duplicada entre Operador e Gestor

## APIs

- `GET /api/graficos/viagens`
- `GET /api/graficos/custos`
- `GET /api/graficos/frota`
- `GET /api/graficos/ocorrencias`

## Estrutura dos datasets

Cada dataset retorna:

- `id`
- `titulo`
- `tipo`
- `labels`
- `values`

Essa estrutura permite renderizacao direta no Chart.js e futuras expansoes de filtros.
