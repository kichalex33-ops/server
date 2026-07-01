# Plano de Faxina — fases com QA

Este documento é o **spec executável** da limpeza pesada do projeto. Cada fase
tem: (a) o que muda, (b) por que é segura ou arriscada, (c) os passos exatos e
(d) um **checklist de QA em navegador (staging)** para validar antes do merge.

Contexto essencial (ver `ARCHITECTURE.md`): há **dois frontends** — os painéis
(migrados para o loader modular `public/js/`) e o **app do motorista**
(`public/motorista/`, que ainda carrega a camada legada `hXXX-*` direto). A
camada legada **não está morta**: é dependência viva do motorista.

Status atual: já concluído (commits anteriores) documentação (`ARCHITECTURE.md`,
`README.md`), remoção de código comprovadamente morto (`assets/js/app.js`, `src/`)
e organização de `docs/auditorias/`.

---

## Fase 1 — Eliminar a camada legada duplicada

**Objetivo:** o motorista deixar de depender dos `hXXX-*` (JS force-ui/self-healing/
menu + CSS de patch), para então remover esses arquivos do repositório.

### Por que é arriscado (precisa de QA visual do app do motorista)
Evidências levantadas no código:
- `theme.js` já cria/religa o botão de tema sozinho → o tema do motorista **não**
  depende de `h520/h521-force-ui.js` (redundante).
- `h525-menu-completo.js` e `h536-self-healing.js` miram `.dashboard-shell.manager-app`,
  `.side-nav`, `#managerScreenTitle` — **inexistentes** no motorista (no-ops lá).
- **Porém** `h534-self-healing.js` tem efeito real: injeta `h534-security-lgpd.js`
  e re-adiciona CSS ausente. Não é no-op.
- As CSS legadas têm **regras globais** que atingem elementos reais do motorista:
  `h520-forcado.css` estiliza `.mini-card`, `small`, `.panel`; `h533-correcao-final.css`
  estiliza `input/textarea/select` no tema escuro; várias definem `:root`.
  → Remover as CSS **muda a aparência do motorista** e exige verificação visual.

### Passos
1. **Migrar o motorista para estilo próprio, sem os patches de painel.**
   Consolidar o que o motorista realmente usa das CSS legadas dentro de
   `public/motorista/assets/css/app-motorista.css` (as regras que casam com
   `.mini-card`, `small`, `.panel`, `.card`, inputs no dark, e as vars `:root`).
   Manter globais que já são do design system: `h540-interface-agatho-icons.css`
   (fonte Inter + ícones) e `theme-dark-fix.css` podem permanecer OU serem
   absorvidas — decidir no QA.
2. Em `public/motorista/index.html` e `offline.html`, **remover** os `<link>`/
   `<script>` de: `h520-forcado`, `h521-visual-definitivo`, `h525-menu-layout-final`,
   `h533-correcao-final`, `h534-correcao-final`, `h520-force-ui.js`,
   `h521-force-ui.js`, `h525-menu-completo.js`, `h534-self-healing.js`,
   `h536-self-healing.js`. (Se o QA mostrar que `h534-security-lgpd.js` é
   necessário no motorista, carregá-lo diretamente em vez de via self-healing.)
3. Confirmar que **nenhum** painel referencia esses arquivos (já verificado: só o
   motorista os usa). Então **remover os arquivos** de `public/assets/`.
4. Atualizar `public/sw.js` e `public/motorista/service-worker.js` (precache) se
   algum arquivo removido estiver listado; **subir a versão do CACHE**.

### ✅ Checklist de QA (staging, com login)
- [ ] App do motorista abre, faz login/pareamento e mostra o painel.
- [ ] Tema claro/escuro alterna e persiste (recarregar mantém).
- [ ] `.mini-card`, listas, `small`, botões e inputs mantêm aparência (claro e escuro).
- [ ] Modo offline (`offline.html`) e instalação PWA funcionam; SW atualiza sem servir versão velha.
- [ ] Console sem 404 de CSS/JS e sem erros novos.
- [ ] Painéis (gestor/operador) continuam intactos (não usam esses arquivos, mas confirmar).

---

## Fase 2 — Reduzir a guerra de `!important` (item 1.3 da auditoria)

**Objetivo:** reduzir os ~480 `!important` de uma tela de Gestor, hoje concentrados
em `h539-gestao-final.css` (~200).

### Por que é arriscado
`h539` vence 4 folhas legadas ainda carregadas (`painel-acesso` 84, `theme-dark-fix`
59, `h536` 37, `h540` 55) **por especificidade altíssima + `!important`**. Como
`!important` sempre vence declaração normal, reduzir com segurança exige **remover
o `!important` dos concorrentes nos mesmos elementos**, não só de `h539`.

### Passos
1. Escopo: **apenas seletores do gestor** (`.manager-app`, `[data-manager-screen]`),
   para não afetar o operador.
2. Estabelecer `h549-governance.css` (carregada por último) como autoridade única:
   mover para lá as regras do gestor com especificidade adequada.
3. Em `painel-acesso`, `theme-dark-fix`, `h536`, `h540`: remover `!important` das
   declarações **escopadas ao gestor** que colidem, propriedade a propriedade.
4. Em `h539`: manter apenas o necessário; migrar o resto para a governança sem `!important`.
5. Medir: `grep -o '!important' | wc -l` por folha, antes/depois.

### ✅ Checklist de QA (staging)
- [ ] Dashboard do Gestor: KPIs (grid, ícones, números), topbar, painéis e tabelas idênticos.
- [ ] Tema claro **e** escuro do Gestor idênticos.
- [ ] Responsivo (≤900px e ≤560px) mantém o layout dos KPIs.
- [ ] Telas `gestao-*` (custos, frota, relatórios…) sem regressão visual.
- [ ] Operador **não** afetado (mudanças escopadas ao gestor).

---

## Fase 3 — Redirecionadores → regra única no `.htaccess` (item 1.8)

**Objetivo:** trocar ~32 HTML de redirect por uma regra de servidor.

### Por que é arriscado
O `index.php` documenta explicitamente suporte a **ambientes sem mod_rewrite**.
Se o rewrite não estiver garantido, remover os HTML físicos quebra essas URLs.
Prioridade **baixa** — a solução atual já funciona.

### Passos
1. Adicionar no `.htaccess` (dentro de `<IfModule mod_rewrite.c>`) os redirects
   301 de cada `gestao-*.html`/`operador-*.html` → destino real (`gestao.html?screen=…`).
2. Só então remover os HTML físicos correspondentes.
3. Manter um fallback para ambientes sem rewrite (ou não remover os arquivos).

### ✅ Checklist de QA (staging)
- [ ] Cada URL antiga redireciona ao destino certo (com e sem mod_rewrite).
- [ ] Nenhum link interno aponta para um arquivo removido (404).
- [ ] SW não faz precache de um redirect removido.

---

## Como executar com segurança
Cada fase deve ir em **um commit/PR próprio**, aplicada e então validada pelo
checklist acima em **staging PHP+MySQL com login** (e, na Fase 1, com o app do
motorista rodando). Sem esse ambiente, as Fases 1–3 não podem ser confirmadas
apenas por análise estática — por isso este plano existe como spec verificável.
</content>
