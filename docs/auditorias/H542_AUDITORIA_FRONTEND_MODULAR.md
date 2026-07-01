# H542 — Auditoria Frontend Modular sem Bundler

## Objetivo

Versão registrada: `h542-frontend-modular-app`.

Organizar o frontend sem Node, sem bundler e sem Composer, mantendo compatibilidade com HostGator/Apache/PHP.

A estrutura real do projeto usa `public/` como raiz web. Por isso, o equivalente prático de `frontend/js/...` foi implementado em:

```text
public/js/
├── app.js
├── core/
│   ├── state.js
│   ├── http.js
│   └── router.js
└── modules/
    ├── auth.js
    ├── dashboard.js
    ├── menu.js
    ├── comando.js
    └── legacy.js
```

## Etapa 1 — Bootstrap único

### Alteração

Todos os HTMLs diretos em `public/*.html` passaram a carregar apenas:

```html
<script src="js/app.js?v=h542" defer></script>
```

O carregamento antigo direto de `assets/js/api-config.js`, `auth-client.js`, `theme.js`, `h520-force-ui.js`, `h521-force-ui.js`, `h524-menu-router.js`, `h525-menu-completo.js` e scripts de página foi removido dos HTMLs.

### Auditoria

Resultado: OK.

```text
43 arquivos HTML auditados.
Todos possuem exatamente um script local: js/app.js?v=h542.
```

## Etapa 2 — Core JS

### Alteração

Criados:

```text
public/js/core/state.js
public/js/core/http.js
public/js/core/router.js
```

`state.js` cria `window.App.State`.
`http.js` cria `window.App.Http.safeFetch`.
`router.js` recebeu a migração ativa do antigo `h524-menu-router.js`.

### Auditoria

Resultado: OK.

```text
node --check public/js/core/*.js: OK
```

## Etapa 3 — Modules JS

### Alteração

Criados:

```text
public/js/modules/auth.js
public/js/modules/dashboard.js
public/js/modules/menu.js
public/js/modules/comando.js
public/js/modules/legacy.js
```

Migrações feitas:

```text
h520-force-ui.js + h521-force-ui.js -> public/js/modules/dashboard.js
h524-menu-router.js -> public/js/core/router.js
h525-menu-completo.js -> public/js/modules/menu.js
comando.js + painel.js -> public/js/modules/comando.js
```

Os arquivos antigos em `public/assets/js/` foram mantidos como legado/fallback, mas não são mais chamados diretamente pelos HTMLs.

### Auditoria

Resultado: OK.

```text
node --check public/js/modules/*.js: OK
```

## Etapa 4 — Legacy Loader controlado

### Alteração

`public/js/modules/legacy.js` carrega os scripts ainda necessários por tipo de tela:

```text
portal/index -> portal.js
operador-* -> operador-dashboard.js ou operador-sincronizacao.js
gestao-* -> gestao.js
sala-situacao -> sala-situacao.js
emergencias -> emergencias.js
admin-infra -> admin-infra.js
sistema-saude -> sistema-saude.js
```

Também carrega dependências externas quando necessárias:

```text
Chart.js: operador/gestor
Leaflet: operador/gestor/sala
QRCode local: operador
```

### Auditoria

Resultado: OK.

```text
A ordem de carregamento fica centralizada em app.js + legacy.js.
Não há mais lista longa de scripts espalhada nos HTMLs.
```

## Etapa 5 — Compatibilidade com rotas bonitas do HostGator

### Alteração

Adicionadas regras no `.htaccess` raiz:

```apache
RewriteRule ^js/(.*)$ public/js/$1 [L]
RewriteRule ^public/js/(.*)$ public/js/$1 [L]
RewriteRule ^painel-logistico/js/(.*)$ public/js/$1 [L]
```

Isso evita quebra quando uma tela é acessada como:

```text
/painel-logistico/gestao
/painel-logistico/operador
```

Sem essa regra, `js/app.js` poderia tentar resolver em `/painel-logistico/js/app.js` e falhar.

### Auditoria

Resultado: OK.

```text
Regras encontradas no .htaccess.
CSP já permite scripts self e CDNs usados pela plataforma.
```

## Etapa 6 — Auditoria geral

### Comandos executados

```bash
find public/assets/js public/js -name '*.js' -print0 | xargs -0 -n1 node --check
php -l index.php
find api -name '*.php' -print0 | xargs -0 -n1 php -l
```

### Resultado

```text
JavaScript syntax: OK
PHP syntax: OK
HTML bootstrap único: OK
Node ativo/package.json/node_modules: não encontrado
ZIP: não criado
```

## Impacto na plataforma

Esta alteração não muda a aparência principal da plataforma. Ela muda a forma como o JavaScript é carregado.

Antes: cada tela carregava muitos scripts manualmente.

Depois: cada tela carrega apenas `js/app.js`, e o bootstrap decide o que carregar.

Benefícios:

```text
menos bagunça nos HTMLs
menos risco de ordem errada de scripts
centralização do frontend
sem Node
sem React
sem build
sem bundler
compatível com HostGator
```

## Atenção

Os arquivos antigos em `public/assets/js/h520...`, `h521...`, `h524...`, `h525...` não foram apagados. Eles ficaram como referência/legado. O HTML não chama mais esses arquivos diretamente.
