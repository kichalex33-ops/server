# H549 — Auditoria estrutural CSS/self-healing/templates

## Base

Gerado a partir da linha H547/H548: `homologacao-h548-correcoes-seguranca.zip`, que já contém H547 PWA/operador avançado e H548 correções de segurança.

## Aplicado

- Reduzido o carregamento dos hotfixes CSS antigos nos HTMLs: `h520`, `h521`, `h524`, `h525`, `h530`, `h531`, `h533`, `h534` e `h535` deixam de ser carregados estaticamente.
- Criado `public/assets/css/h549-governance.css` como camada de contrato visual final: contraste, foco visível, labels acessíveis, skeleton, empty state e breakpoints.
- Removido o carregamento simultâneo de `h534-self-healing.js` e `h536-self-healing.js` pelo loader principal.
- Criado `public/assets/js/h549-theme-governor.js`, sem `MutationObserver` global e sem varredura wildcard contínua.
- `public/js/app.js` passou para `h549`, aceita `integrity`, `crossOrigin` e `referrerPolicy` em scripts/styles e expõe `loadParallel`.
- `legacy.js` carrega vendors em paralelo seguro e não serializa Chart/QR/Leaflet quando não precisa.
- Leaflet CSS/JS recebem SRI para a versão 1.9.4.
- Chart.js foi fixado em `4.4.9`; SRI ficou desativado até gerar o hash exato do CDN em ambiente controlado.
- Arquivos `gestao-*.html` e `operador-*.html` duplicados foram convertidos em redirecionadores leves para `gestao.html?screen=...` e `operador.html?screen=...`.
- `menu.js` aceita `screen`, `focus`, `driverTab` e `label` via query string.
- Placeholder de combustível foi substituído por cálculo real via `/gestao/custos`: custo total, combustível, custo/km, custo/paciente, litros e consumo médio quando houver litros em `despesas.metadados`.
- Inputs sem `<label>` recebem `aria-label` inferido em runtime pelo `h549-theme-governor.js`.

## Mantido por segurança

- Os CSS e JS antigos permanecem no repositório como legado/rollback; a correção atua sobre carregamento e governança, não por exclusão agressiva.
- `operador-sincronizacao.html` foi mantido como página própria porque contém tela distinta de fila offline/sincronização.
- Não foi feita migração completa para `layout.php`; foi aplicada redução por shell canônico e redirecionadores para manter compatibilidade com HostGator sem Composer/bundler.

## Validações

- PHP lint: OK.
- JavaScript syntax check: OK.
- ZIP sem `.git`, `.env` real, `node_modules`, `package.json`, logs reais, SQL backup real e fontes proprietárias.
