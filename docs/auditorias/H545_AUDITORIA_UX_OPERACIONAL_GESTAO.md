# H545 — Auditoria UX Operacional e Gestão

## Objetivo
Aplicar melhorias de UX/UI na Plataforma LogiSaúde sem converter tudo em SPA e sem criar ZIP.

## Status
- ZIP: **não criado**.
- Base usada: H544 UI/UX + Backend Hardening.
- Entrega: patch aplicável por `git apply`.

## Arquivos novos
- `public/assets/css/h545-operational-ux.css`
- `public/js/core/ux.js`

## Arquivos alterados principais
- `public/js/app.js`
- `api/index.php`
- `api/src/ApiService.php`
- `public/*.html` para carregar o CSS H545 e `js/app.js?v=h545`
- `VERSION.txt`

## Implementações H545

### Portal / Login
- Feedback visual reforçado em erro de login.
- Estado de loading no botão de entrada.
- `aria-live` e `role=alert` nos feedbacks de login.
- Limpeza visual do erro quando o usuário volta a digitar.
- Substituição visual do ícone Unicode do tema por SVG inline local.

### Operador
- Abas horizontais fixas no topo para reduzir rolagem e troca de contexto.
- Abas: Agenda, Viagens, Mapa, Cadastros, IA e Motoristas.
- Padronização textual para “Viagens Agendadas”.
- Formulários de viagem em modo sticky em desktop.
- Drawer lateral de detalhes da viagem sem sair da lista.
- Ação inline “Ver” nas linhas de viagem.
- Confirmação centralizada para ações destrutivas como cancelar/excluir/remover.
- Empty states com CTA para criar viagem.
- Paginação client-side para tabelas com mais de 25 linhas.
- Validação inline para campos obrigatórios no blur.

### Gestor
- Hierarquia visual dos KPIs.
- Três primeiros KPIs viram “Hero KPIs”.
- KPIs secundários ficam menores.
- Painel de ações gerenciais com semáforo visual.
- KPIs clicáveis para drill-down visual por seção.
- Botão de central de notificações preparado no topo.

### Acessibilidade
- Skip link “Pular para o conteúdo”.
- Foco visível preservado e reforçado pelo CSS H544/H545.
- Botões com ícone recebem `aria-label`.
- Modais de confirmação usam `role=dialog` e `aria-modal=true`.
- Tabelas grandes recebem controles navegáveis por teclado.

### Performance percebida
- Loading visual em botões.
- Skeleton visual em áreas de IA/loading.
- Paginação client-side para reduzir volume visível na tela.
- Não foi feita conversão radical para SPA para evitar quebrar rotas, scripts legados, mapas e páginas de gestão.

### Backend
- `genericList()` agora aceita paginação por query string:
  - `page`
  - `per_page`
  - `limit`
- Resposta inclui bloco `pagination` com:
  - `page`
  - `per_page`
  - `total`
  - `total_pages`
- Compatibilidade mantida: a resposta ainda retorna `items` e a chave original da tabela.

Exemplo:

```text
GET /api/viagens?page=2&per_page=50
```

## Auditoria executada

### Sintaxe PHP
Resultado: OK.

```text
php -l em todos os arquivos PHP
```

### Sintaxe JavaScript
Resultado: OK.

```text
node --check em todos os JS públicos, exceto vendor
```

### Patch
Resultado: OK.

```text
git apply --check /mnt/data/h545-operational-ux-dashboard.patch
```

### HTML
Resultado: OK.

```text
43 HTMLs carregam h545-operational-ux.css
43 HTMLs totais no diretório public/
```

### Node/Express
Resultado: OK.

```text
package.json/package-lock/yarn/pnpm/node_modules: não encontrados
```

### Eventos inline
Resultado: OK.

```text
onclick/onchange/oninput/onkeyup/onload em public/*.html: 0
```

### Headers de senha legados
Resultado esperado.

```text
x-comando-senha/x-local-password aparecem apenas nos pontos de remoção/bloqueio intencional.
```

## Limites conscientes
- Não converti os 43 HTMLs para uma SPA única.
- Não trouxe Lucide/Heroicons via CDN para não aumentar dependência externa e não piorar CSP.
- Não implementei virtual scrolling real, porque a tabela atual já é gerada por scripts legados. Foi aplicada paginação client-side e paginação backend opcional.
- Não implementei undo real de operações no banco, porque isso exigiria endpoints reversíveis específicos e auditoria de negócio.

## Conclusão
H545 melhora o fluxo operacional, reduz rolagem, melhora feedback visual, acessibilidade, hierarquia gerencial e prepara paginação backend sem quebrar o modelo atual de páginas estáticas.
