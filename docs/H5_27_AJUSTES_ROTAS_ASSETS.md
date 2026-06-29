# H5.27 - Ajustes de rotas, assets e compatibilidade

Esta etapa registra a revisao feita apos auditoria tecnica.

## Aplicavel ao repositório atual

O repositório `server` atual é PHP/MySQL para HostGator. Ele não possui `src/app.js`, `package.json`, `src/routes` ou `src/middlewares`, portanto os ajustes de Express/Node não se aplicam neste projeto sem trocar a arquitetura.

## Pontos tratados ou pendentes

- H526 já removeu senha persistida no navegador no Comando Central.
- H526 adicionou `safeFetch`, escape de HTML e validação de endpoint editável.
- H526 adicionou acessibilidade básica de modais e mensagens visuais.
- Pendente operacional: revisar paths absolutos de `public/index.html` e rota `/comando/*` no `.htaccess` quando fizer novo pacote HostGator.

## Recomendacao

Não adicionar estrutura Node/Express dentro deste repositório PHP. Se existir outro repositório Node, aplicar lá os middlewares, rotas e workflow de CI.
