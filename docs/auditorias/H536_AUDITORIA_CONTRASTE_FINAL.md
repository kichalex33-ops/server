# H5.36 — Auditoria final de contraste e consistência visual

## Objetivo
Ajustar o contraste global das telas para obedecer esta regra:

- **Modo escuro:** texto claro por padrão; dentro de áreas claras/brancas, texto escuro.
- **Modo claro:** texto escuro por padrão; dentro de áreas escuras, texto claro.

## Correções aplicadas

### 1) Novo CSS final de contraste
Arquivo criado:
- `public/assets/css/h536-contraste-tema-unificado.css`

Função:
- unifica contraste por superfície;
- corrige letras claras em áreas brancas no modo escuro;
- corrige letras escuras em áreas escuras no modo claro;
- reforça contraste em topbar, cards, tabelas, filtros, badges, popups, perfil, botões auxiliares e superfícies dinâmicas.

### 2) Novo self-healing visual
Arquivo criado:
- `public/assets/js/h536-self-healing.js`

Função:
- garante o carregamento do CSS H5.36 por último;
- detecta superfícies claras e escuras dinamicamente via `getComputedStyle`;
- adiciona classes:
  - `h536-light-surface`
  - `h536-dark-surface`
- reaplica a classificação após troca de tema e mutações de DOM.

### 3) Compatibilidade retroativa
Arquivos ajustados:
- `public/assets/js/h534-self-healing.js`
- `public/assets/js/h525-menu-completo.js`
- `public/assets/js/h535-self-healing.js`
- `public/assets/css/h535-contraste-modo-claro.css`

Função:
- apontam para o CSS H5.36 ou usam o mesmo mecanismo novo;
- reduzem risco de páginas legadas ficarem sem a correção.

### 4) Atualização das telas
Todas as páginas HTML em `public/` e `public/motorista/` foram atualizadas para usar:
- `h536-contraste-tema-unificado.css?v=h536`
- `h536-self-healing.js?v=h536`

Também foi corrigido o caminho relativo das telas do módulo motorista.

### 5) Cache busting
As referências em HTML foram atualizadas de `v=h535` para `v=h536`, para forçar recarga dos assets.

## Auditoria técnica executada

### Sintaxe
- `node --check public/assets/js/h536-self-healing.js` ✅
- `node --check public/assets/js/h534-self-healing.js` ✅
- `node --check public/assets/js/h525-menu-completo.js` ✅
- `php -l index.php` ✅
- `php -l api/index.php` ✅

### Verificações de referência
- referências antigas a `h535-contraste-modo-claro.css` em HTML: **0** ✅
- referências antigas a `h535-self-healing.js` em HTML: **0** ✅
- referências ao H5.36 em HTML: **90** ✅

## Resultado
Status final: **aprovado para homologação visual**.

## Observação
Esta entrega foca no problema de contraste e consistência visual entre modo claro e modo escuro. Não altera regras de negócio, API ou banco de dados.
