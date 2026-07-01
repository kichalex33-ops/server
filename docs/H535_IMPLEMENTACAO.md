# H5.35 — Correção de contraste no modo claro

## Objetivo
Corrigir textos que ficavam em cinza claro no modo claro, principalmente dentro de cards, tabelas, formulários, filtros, caixas brancas e áreas de resumo.

## Arquivos criados
- `public/assets/css/h535-contraste-modo-claro.css`
- `public/assets/js/h535-self-healing.js`

## O que foi ajustado
- Variáveis de texto do modo claro foram escurecidas.
- Textos principais passam a usar preto/cinza muito escuro.
- Textos secundários deixam de usar cinza claro e passam para cinza escuro legível.
- Inputs, selects, textareas e placeholders ganharam contraste maior.
- Tabelas e cabeçalhos receberam contraste mais forte.
- Badges preservam a cor sem ficarem apagadas.
- A navegação escura foi protegida para continuar com texto claro.
- Foi mantido reforço para o modo escuro quando houver área branca.

## Observação
Esta versão não altera backend. É uma correção visual incremental sobre a H5.34.
