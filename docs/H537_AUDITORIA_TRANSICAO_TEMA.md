# H5.37 — Auditoria de transição claro/escuro

## Problema
A troca entre modo claro e modo escuro estava brusca e podia piscar porque:

- o tema era aplicado instantaneamente;
- o classificador de superfícies removia e recolocava classes durante a troca;
- o MutationObserver observava mudanças de classe e podia reprocessar a própria correção;
- scripts antigos ainda podiam reaplicar tema sem coordenação.

## Correções aplicadas

- Criado `public/assets/css/h537-transicao-tema-suave.css`.
- Ajustado `public/assets/js/theme.js` para usar `theme-transitioning` durante a troca.
- Ajustado `public/assets/js/h536-self-healing.js` para carregar o CSS H5.37, evitar class churn e parar de observar alterações de classe.
- Ajustado `public/assets/js/h525-menu-completo.js` para não sobrescrever tema de forma abrupta.
- Ajustado `public/assets/js/h534-self-healing.js` para carregar o CSS H5.37.
- Todas as páginas HTML receberam o CSS de transição.

## Regras preservadas

- Modo escuro: texto claro por padrão; em áreas claras, texto escuro.
- Modo claro: texto escuro por padrão; em áreas escuras, texto claro.
- Mapas, imagens, vídeos e iframes não animam cor para evitar borrão/piscada.

## Auditoria

- Sintaxe JS validada.
- Sintaxe PHP validada.
- Referências ao H5.37 presentes nas páginas HTML.
- Não houve alteração de regra de negócio, API ou banco de dados.

Status: aprovado para nova homologação visual.
