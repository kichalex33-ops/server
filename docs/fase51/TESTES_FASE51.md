# Testes - Fase 5.1

## Teste focado

Arquivo:

```text
tests/fase51AdvancedDashboards.test.js
```

Validacoes:

- endpoints de indicadores do Operador e Gestor
- endpoints de graficos
- datasets compativeis com Chart.js
- paginas dos dashboards com Chart.js
- uso da camada unica `dashboard-charts.js`

## Comando

```bash
node --test tests/fase51AdvancedDashboards.test.js
```

## Validacao geral

```bash
npm test
```

## Responsividade

A estrutura visual usa grid responsivo para desktop Full HD, notebook e monitores grandes. A validacao automatizada cobre integridade de renderizacao HTML e assets; a validacao visual final deve ser feita no navegador local.
