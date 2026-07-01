# H544 — Auditoria UI/UX + Backend Hardening

## Escopo

Versão aplicada em cima da base H543 (`h543-security-token-xss-lgpd`).

Pedido atendido: implementar melhorias de UI/UX, design system, feedback visual, acessibilidade, validação de input, tratamento de erros, cache em arquivo, logs estruturados e rate limiting, sem criar ZIP.

## Resultado por etapa

### 1. Design system unificado

Status: OK.

Criado:

- `public/assets/css/h544-ui-ux-design-system.css`

Alterações:

- Define tokens globais `--ls-primary`, `--ls-secondary`, `--ls-bg`, `--ls-surface`, `--ls-muted`.
- Usa teal como primária de saúde e azul como secundária logística.
- Sobrescreve variáveis antigas sem apagar `styles.css` e `logisaude.css`, para evitar quebra visual em telas legadas.
- Corrige contraste de texto secundário com `--ls-muted: #4b5b68`.
- Adiciona foco visível para navegação por teclado.

Observação: não foi apagada a duplicidade histórica de CSS porque isso exige teste visual página por página. A H544 neutraliza o conflito por camada final de design system.

### 2. Responsividade

Status: OK.

Alterações:

- Breakpoints adicionados em `1024px`, `768px` e `480px`.
- Sidebar vira drawer em tablet/mobile.
- Cards usam `minmax(240px, 1fr)`.
- Tabelas mantêm rolagem horizontal segura em telas pequenas.

### 3. Feedback visual e componentes UX

Status: OK.

Criado:

- `public/js/core/ui.js`

Funcionalidades:

- `App.UI.toast()` para sucesso/erro/alerta.
- Breadcrumb automático em telas de operador, gestor, sala e emergências.
- Empty state para tabelas vazias.
- Tooltip acessível a partir de `title` curto.
- Reforço automático de atributos em inputs sensíveis.
- Hash navigation leve para seções internas.

### 4. Bootstrap frontend

Status: OK.

Alterado:

- `public/js/app.js`

Mudanças:

- Versão atualizada para `h544`.
- Novo módulo `core/ui.js` carregado antes de HTTP/rotas legadas.
- Todos os HTMLs raiz em `public/*.html` apontam para `js/app.js?v=h544`.
- Todos os HTMLs raiz carregam `h544-ui-ux-design-system.css?v=h544`.

Auditoria:

- `js/app.js?v=h544`: 43 ocorrências.
- `js/app.js?v=h543`: 0 ocorrências.
- CSS H544: 43 ocorrências.

### 5. SPA / roteamento client-side

Status: PARCIAL SEGURO.

Foi adicionado roteamento leve por hash para seções internas, mas não foi feita a migração radical para uma SPA única com apenas um `index.html`.

Motivo: a plataforma ainda tem muitas telas HTML com dependências legadas, menus, filtros, tabelas, mapas e scripts específicos. Colapsar tudo em uma SPA de uma vez teria alto risco de quebrar operador/gestor no HostGator.

Decisão técnica: H544 prepara a navegação centralizada e o template comum via JS/CSS, mas mantém os HTMLs existentes funcionando.

### 6. Validação centralizada de input

Status: OK.

Criado:

- `api/src/Validator.php`

Integrado em:

- `api/index.php`

Funcionalidades:

- Rejeita JSON inválido.
- Aplica schema em rotas críticas:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `POST /gestao/operadores`
  - `POST /motoristas`
  - `POST /sync/offline`
  - `POST /sync/resolve-conflict`
- Bloqueia campos reservados em qualquer payload:
  - `senha_hash`
  - `password_hash`
  - `token_version`
  - `jwt_secret`
  - `refresh_tokens`
  - `jwt_blacklist`
  - `is_admin`
  - `permissions`
- Limita profundidade e tamanho de payload para reduzir abuso.

### 7. Tratamento de erros sem vazamento

Status: OK.

Criado:

- `api/src/ErrorHandler.php`
- `api/src/StructuredLogger.php`

Alterado:

- `api/index.php`
- `api/src/Response.php`
- `api/src/ApiMiddleware.php`

Funcionalidades:

- Erros internos são logados com detalhes no servidor.
- Cliente recebe mensagem segura e `request_id`.
- Headers incluem `X-Request-Id`.
- Logs estruturados em JSON por dia.
- Dados sensíveis são mascarados nos logs.

### 8. Cache em arquivo

Status: OK.

Criado:

- `api/src/FileCache.php`
- `storage/cache/.htaccess`
- `storage/cache/.gitkeep`

Integrado em:

- `GET /status`
- `GET /system/health`
- `GET /watchdog`
- `GET /infra/status`

Observação: o cache foi aplicado apenas em endpoints seguros e de baixa mutação. Não foi colocado em dados operacionais sensíveis como viagens, pacientes ou mapa ao vivo.

### 9. Rate limiting

Status: OK.

Criado:

- `api/src/RateLimiter.php`
- `db/migrations/014_h544_uiux_backend_hardening.sql`

Observação: o login já estava protegido por tabela `login_attempts` no H543. A H544 adiciona base central com tabela `rate_limits` para expansão futura de limites por endpoint/IP/chave.

### 10. CSP e ícones

Status: OK com ressalva.

Não foi adicionado Lucide/Heroicons via CDN.

Motivo: a própria análise recomenda CSP restritivo. Adicionar CDN para ícones enfraquece a política e depende de internet externa. A plataforma já usa SVGs inline locais nos menus, que são mais estáveis no HostGator.

## Auditoria técnica executada

### PHP

Comando:

```bash
find api index.php scripts -name '*.php' -type f -print0 | xargs -0 -n1 php -l
```

Resultado: OK.

### JavaScript

Comando:

```bash
find public -name '*.js' -type f -not -path '*/vendor/*' -print0 | xargs -0 -n1 node --check
```

Resultado: OK.

### Patch

Comando:

```bash
git apply --check h544-uiux-backend-hardening.patch
```

Resultado: OK.

### Node/Express

Busca por traços ativos:

- `package.json`: não encontrado.
- `package-lock.json`: não encontrado.
- `yarn.lock`: não encontrado.
- `pnpm-lock.yaml`: não encontrado.
- `node_modules`: não encontrado.

Resultado: OK.

### Eventos inline HTML

Busca por `onclick`, `onchange`, `oninput`, `onkeyup`, `onload` nos HTMLs raiz.

Resultado: 0 ocorrências.

### innerHTML

Resultado: ainda existem usos legados de `innerHTML` em scripts antigos.

Decisão: não foram removidos todos nesta etapa para evitar quebra em telas grandes. O H543 já reduziu o risco em áreas sensíveis e a H544 adicionou componentes novos com `textContent`/DOM seguro.

## Arquivos principais alterados

- `public/assets/css/h544-ui-ux-design-system.css`
- `public/js/core/ui.js`
- `public/js/app.js`
- `public/js/core/http.js`
- `api/src/Validator.php`
- `api/src/ErrorHandler.php`
- `api/src/StructuredLogger.php`
- `api/src/FileCache.php`
- `api/src/RateLimiter.php`
- `api/src/ApiMiddleware.php`
- `api/src/Response.php`
- `api/src/Router.php`
- `api/index.php`
- `api/config/env.php`
- `db/migrations/014_h544_uiux_backend_hardening.sql`
- `storage/cache/.htaccess`

## O que não foi feito de propósito

- Não foi criada SPA total com apenas um `index.html`.
- Não foram apagados `styles.css` e `logisaude.css`.
- Não foi adicionada biblioteca externa de ícones via CDN.
- Não foram removidos todos os `innerHTML` legados.
- Não foi criado ZIP.

Essas decisões reduzem risco de quebra em homologação.

## Próxima etapa recomendada

H545 deve focar em uma destas duas frentes:

1. Remover `innerHTML` legado por tela, começando por operador e gestor.
2. Criar template PHP/JS comum para reduzir os 43 HTMLs sem migrar tudo para SPA de uma vez.
