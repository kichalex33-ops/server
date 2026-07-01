# Arquitetura da Plataforma Logística (LogiSaúde)

Documento de referência para qualquer desenvolvedor que precise entender o
projeto rapidamente. Descreve o que existe, como as peças se conectam e — o mais
importante — **as pegadinhas** que não são óbvias ao olhar arquivo por arquivo.

> Alvo de produção: **PHP 8 + MySQL em hospedagem compartilhada (HostGator)**,
> sem bundler e sem etapa de build. Todo o frontend é servido como arquivos
> estáticos e o backend é PHP puro. Isso explica várias decisões abaixo.

---

## 1. Visão geral

```
Navegador
  │
  ├── / (index.php ou .htaccess) ─────────────► public/portal.html  (login)
  │
  ├── Painéis (gestor / operador / sala / etc.) ── HTML estático + public/js/app.js
  │
  ├── App do motorista (PWA) ───────────────────── public/motorista/*  (loader próprio)
  │
  └── fetch()  ──►  /api/index.php  ──►  Router  ──►  Controllers/Services  ──►  MySQL
```

Há **dois frontends distintos** que compartilham a mesma pasta de assets. Isso é
a fonte de confusão nº 1 do projeto — veja a seção 3.

---

## 2. Backend (`api/`)

PHP puro, sem framework. Ponto de entrada único: **`api/index.php`**.

| Camada | Arquivos | Responsabilidade |
|--------|----------|------------------|
| Entrada | `api/index.php` | Bootstrap, CORS/headers, instancia o Router |
| Roteamento | `api/src/Router.php` | Mapeia método+caminho → handler |
| Middleware | `api/src/ApiMiddleware.php`, `RateLimiter.php`, `ErrorHandler.php` | Auth, rate-limit, tratamento de erro |
| Auth | `api/src/Auth.php`, `Jwt.php`, `Rbac.php` | Login, emissão/validação de JWT, papéis |
| Domínio | `api/src/ApiService.php`, `AiService.php` | Regras de negócio, integrações |
| Infra | `api/src/Database.php`, `FileCache.php`, `StructuredLogger.php`, `AuditLogger.php`, `RealtimePublisher.php`, `Validator.php`, `Response.php` | Persistência, cache, logs, realtime, validação, respostas |
| Controllers | `api/controllers/BaseController.php`, `LegacyController.php` | Adaptadores de rota |
| Cron | `api/cron/clean_jwt_blacklist.php` | Limpeza periódica da blacklist de JWT |
| Config | `api/config/env.php` | Lê variáveis de ambiente (`.env`) |

### Banco de dados
Migrações versionadas em **`db/migrations/`**, aplicadas **em ordem numérica**
(`001` → `015`). Nunca reordene nem edite uma migração já aplicada em produção;
crie a próxima. Estado atual: até `015_h547_pwa_colaboracao_analytics.sql`.

### Storage
`storage/` guarda `cache/`, `logs/`, `backups/`, `uploads/`. Cada subpasta tem
`.htaccess` negando acesso web. Conteúdo real é ignorado pelo Git (ver
`.gitignore`); apenas `.gitkeep`/`.htaccess` são versionados.

---

## 3. Frontend — os dois mundos

### 3.1. Painéis principais (arquitetura modular — atual)
Páginas: `portal, index, gestao, operador, sala-situacao, comando, admin-infra,
emergencias, sistema-saude, painel` e as telas `operador-*` / `gestao-*`.

Cada página carrega **um único script**:

```html
<script src="js/app.js?v=h549"></script>
```

`public/js/app.js` é o **loader** (define `App.loader`: `loadScript`,
`loadParallel`, `publicUrl`, `pageContext`). A partir dele:

```
public/js/
├── app.js                  # loader + bootstrap
├── core/                   # infraestrutura reutilizável
│   ├── http.js  state.js  ui.js  ux.js  router.js  sanitize.js
│   ├── pwa.js   offline-store.js  realtime-collab.js  analytics.js
│   ├── intelligence.js  onboarding.js  operator-workflow.js
│   ├── preferences.js  signature-print.js
└── modules/                # orquestração por área
    ├── legacy.js           # decide QUAIS assets/js/*.js carregar por página
    ├── auth.js  menu.js  dashboard.js  comando.js
```

**`public/js/modules/legacy.js` é o mapa de carregamento**: dado o contexto da
página (`pageContext`), ele monta a sequência de `assets/js/*.js` a carregar
(auth-client, theme, live-map, gestao/operador, vendores Leaflet/Chart.js, etc.).
Se você quer saber "por que esse script roda nesta tela?", a resposta está aqui.

Vários módulos novos trazem um marcador do que substituíram, ex.:
```js
window.App.Menu = { migratedFrom: "h525-menu-completo.js" };
```
Isso indica que a lógica antiga de `assets/js/h525-menu-completo.js` foi
**migrada** para `public/js/modules/menu.js`. Os arquivos antigos, porém, **ainda
existem** porque o app do motorista (3.2) os usa diretamente.

### 3.2. App do motorista (PWA legado — `public/motorista/`)
`public/motorista/index.html` **NÃO** usa o loader modular. Ele carrega, via
`<script>`/`<link>` diretos, a **camada legada** de patches:
`h520-force-ui.js`, `h521-force-ui.js`, `h525-menu-completo.js`,
`h534-self-healing.js`, `h536-self-healing.js` e as CSS
`h520-forcado`, `h521-visual-definitivo`, `h525-menu-layout-final`,
`h533-correcao-final`, `h534-correcao-final`, `h536-contraste-tema-unificado`.

> ⚠️ **Pegadinha crítica:** esses arquivos `hXXX-*` parecem "mortos" quando você
> só olha os painéis principais (que migraram para `public/js/`), mas **são
> dependências vivas do app do motorista**. Não os apague antes de migrar o
> motorista para o loader modular. Ver "Dívida técnica", seção 6.

### 3.3. Camadas de CSS (ordem da cascata)
As páginas carregam várias folhas incrementais `hXXX-*.css`. A **ordem** importa
e é a chave para entender por que existem tantos `!important`. Ordem final numa
tela de Gestor (do primeiro ao último = o último vence empates):

```
painel-acesso → mapas → theme-dark-fix → h536-contraste → h537-transição
→ h538-gestao-kpi → h539-gestao-final → h540-interface → h544-design-system
→ h545-operational → h546-operator → h549-governance   ← camada final ("fonte da verdade")
```

- **`h544-ui-ux-design-system.css`** define os tokens/base (fonte **Inter**,
  cores, componentes `.ls-*`).
- **`h549-governance.css`** é a camada de governança, carregada por último.
- **`h539-gestao-final.css`** concentra ~200 `!important` para "vencer a guerra"
  contra as folhas legadas (`painel-acesso`, `theme-dark-fix`, `h536`) usando
  seletores de altíssima especificidade. É dívida técnica conhecida (seção 6).

### 3.4. PWA e Service Worker
- `public/sw.js`: service worker. Faz precache de `js/app.js`,
  `assets/css/h547-advanced-pwa.css` e o ícone. **Ao renomear/remover esses
  arquivos, atualize `sw.js` e o `CACHE`/versão**, senão o SW serve versão velha.
- `public/manifest.json` + `public/offline.html`: instalação e fallback offline.
- `public/motorista/` tem seu próprio `manifest.json`, `service-worker.js` e
  `offline.html`.

### 3.5. Páginas de redirecionamento
As antigas `gestao-*.html` / `operador-*.html` hoje são **redirecionadores
leves** (13 linhas: `meta refresh` + fallback JS) que apontam para
`gestao.html?screen=...` / `operador.html?...`. Existem ~32 desses arquivos
físicos — resíduo de compatibilidade, não duplicação de conteúdo.

---

## 4. Fluxo de uma requisição típica

1. Usuário abre `/` → `portal.html` (login).
2. `auth.js`/`auth-client.js` faz `POST /api/login` → recebe **JWT**, guarda no
   `localStorage`.
3. Navega para `gestao.html`; `js/app.js` roda, `legacy.js` carrega os scripts da
   tela, `menu.js` monta a navegação.
4. Scripts de tela (`gestao.js`, `live-map.js`, …) fazem `fetch` autenticado
   (`authFetch`) para `/api/...`.
5. No backend, `Router` → `ApiMiddleware` (valida JWT/RBAC/rate-limit) →
   `ApiService` → `Database` → resposta JSON padronizada por `Response`.

---

## 5. Configuração e execução

Variáveis obrigatórias (`.env`, ver `.env.example` / `.env.homologacao.modelo`):
`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`.

Passos:
1. Configurar `.env`.
2. Importar as migrações `db/migrations/001..015` em ordem.
3. Criar usuários reais na tabela `usuarios` (não há seed/senha fixa no código).
4. Servir a raiz com PHP (Apache + `.htaccess`, mod_rewrite recomendado).

Homologação final deve ocorrer em **PHP 8 + MySQL** (HostGator ou equivalente).

---

## 6. Dívida técnica conhecida (roadmap de limpeza)

Itens que um dev deve conhecer antes de "limpar" o projeto — a maioria exige
**verificação visual em navegador (staging)** porque mexe na cascata de CSS/JS:

1. **Camada legada duplicada.** `public/js/modules/*` já reimplementa a lógica de
   vários `assets/js/hXXX-*.js`, mas os originais seguem vivos por causa do app
   do motorista (3.2). Limpeza correta = **migrar `public/motorista/` para o
   loader modular** e só então remover a camada `hXXX` legada (JS + CSS órfãs).
2. **Guerra de `!important`.** Uma tela de Gestor carrega ~480 `!important`, sendo
   ~200 em `h539-gestao-final.css`. Reduzir com segurança exige neutralizar em
   conjunto `painel-acesso`, `theme-dark-fix`, `h536` e `h540`, com QA visual.
3. **Redirecionadores físicos.** ~32 HTML de redirect poderiam virar uma única
   regra no `.htaccess`.
4. **Tipografia.** A fonte "Agatho" nunca foi empacotada; o produto usa **Inter**
   (corrigido). Não reintroduzir família sem `@font-face` real.
5. **SRI de CDN.** Leaflet e Chart.js já têm `integrity`. Ao trocar versão de
   qualquer vendor via CDN, gere e aplique o novo hash SRI.

O histórico completo de auditorias está em **`docs/auditorias/`**.
</content>
