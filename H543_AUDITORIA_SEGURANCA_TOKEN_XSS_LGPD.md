# H543 — Auditoria de segurança frontend/backend

## Escopo

Implementação incremental em cima da H542, sem criar ZIP.

Objetivos solicitados:

1. Encerrar uso de senha em texto claro fora do login.
2. Centralizar login/logout em `public/js/modules/auth.js`.
3. Centralizar requisições autenticadas em `public/js/core/http.js`.
4. Adicionar refresh token silencioso com retry automático em 401.
5. Criar sanitização centralizada em `public/js/core/sanitize.js`.
6. Fortalecer PubSub/AppState com `off()` e sincronização entre abas.
7. Aplicar máscara LGPD em listas sensíveis de pacientes/passageiros.
8. Blindar inputs sensíveis contra autocomplete/corretor.
9. Adicionar timeout de sessão por inatividade e proteção contra bfcache.
10. Fortalecer CSP sem liberar `unsafe-inline` para scripts.

## Arquivos principais alterados

- `public/js/app.js`
- `public/js/core/http.js`
- `public/js/core/state.js`
- `public/js/core/sanitize.js`
- `public/js/modules/auth.js`
- `public/js/modules/comando.js`
- `public/assets/js/auth-client.js`
- `public/assets/js/portal.js`
- `public/assets/js/operador-dashboard.js`
- `api/src/Auth.php`
- `api/src/ApiMiddleware.php`
- `api/index.php`
- `.htaccess`
- `index.php`

## Resultado por etapa

### 1. Senha em texto claro

Status: OK.

- `x-comando-senha` e `x-local-password` são removidos no frontend antes do envio.
- O backend bloqueia esses headers fora de `POST /auth/login`.
- `modules/comando.js`, `public/comando.js` e `public/painel.js` não leem mais sessão diretamente do `sessionStorage`.
- Nenhuma ocorrência de `sessionStorage.*senha`, `senha.*sessionStorage`, `var senha` ou `window.usuario` foi encontrada.

### 2. Login e tokens

Status: OK.

- `modules/auth.js` recebeu `login()`, `logout()`, `session()`, `profile()` e limpeza de campos de senha.
- `portal.js` passou a usar `App.Auth.login()` quando disponível.
- O backend agora retorna aliases compatíveis:
  - `accessToken`
  - `token`
  - `refreshToken`
  - `expiresIn`
  - `expires_in`

### 3. Interceptador HTTP

Status: OK.

- `core/http.js` expõe `App.Http.request()`.
- Injeta `Authorization: Bearer` automaticamente.
- Remove headers legados com senha local.
- Ao receber `401`, chama `/auth/refresh` em background e repete a requisição original uma vez.
- Mantém `safeFetch()` como alias compatível.

### 4. Refresh token silencioso

Status: OK.

- `auth-client.js` e `core/http.js` compartilham lógica compatível.
- O backend H541 já rotacionava refresh token ao emitir novo token.
- A sessão é limpa quando o refresh falha.

### 5. Sanitização/XSS

Status: OK com ressalva.

- Criado `public/js/core/sanitize.js` com mapeamento central de caracteres.
- Funções locais de escape em arquivos principais foram ajustadas para usar `App.Sanitize.escapeHtml()` quando disponível.
- Tabelas sensíveis de pacientes e passageiros no operador foram reescritas para `createElement`, `textContent` e `DocumentFragment`.

Ressalva técnica: ainda existem usos de `innerHTML` em scripts legados para HTML estrutural controlado, menus, cards e templates já escapados. A mudança H543 removeu o ponto mais sensível de pacientes/passageiros, mas não reescreveu 100% do frontend legado para DOM API para evitar quebrar telas grandes de operador/gestor sem teste visual.

### 6. CSP

Status: OK.

- `.htaccess` e `index.php` receberam `object-src 'none'`.
- Scripts inline continuam bloqueados.
- `script-src` mantém `self`, `cdn.jsdelivr.net` e `unpkg.com` porque a plataforma ainda usa Chart.js e Leaflet por CDN.

### 7. PubSub e abas

Status: OK.

- `App.State` agora possui `on()`, `off()`, `subscribe()`, `clearAuth()` e `snapshot()`.
- Mudanças de auth disparam `localStorage` para sincronização entre abas.
- Logout em uma aba limpa sessão das outras.

### 8. LGPD em tela

Status: OK.

- Criadas máscaras:
  - `maskCpf()`
  - `maskName()`
  - `maskPhone()`
- Listas de pacientes/passageiros passam a ocultar CPF, telefone e sobrenomes na tabela principal.
- Inputs sensíveis recebem automaticamente:
  - `autocomplete="off"`
  - `autocorrect="off"`
  - `autocapitalize="off"`
  - `spellcheck="false"`

### 9. Timeout de sessão

Status: OK.

- `app.js` adicionou timeout de inatividade padrão de 20 minutos em páginas protegidas.
- `pageshow` com `event.persisted` força reload para evitar bfcache reabrindo sessão antiga.

## Auditoria executada

### PHP

Comando:

```bash
find . -type f -name '*.php' -print0 | xargs -0 -n1 php -l
```

Resultado: OK.

### JavaScript

Comando:

```bash
find public/js public/assets/js public/motorista/assets/js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
```

Resultado: OK.

### Greps de segurança

- `x-comando-senha`: aparece somente no bloqueio/remoção intencional.
- `sessionStorage.*senha`: zero ocorrência.
- `senha.*sessionStorage`: zero ocorrência.
- `var senha`: zero ocorrência.
- `window.usuario`: zero ocorrência.
- eventos inline HTML (`onclick`, `onchange`, `oninput`, `onkeyup`, `onload`): zero ocorrência nos HTMLs principais.
- traços Node ativos (`package.json`, `package-lock.json`, `node_modules`, `vite`, `webpack`): zero ocorrência na raiz auditada.

## ZIP

Não criado, conforme padrão solicitado para esta etapa.
