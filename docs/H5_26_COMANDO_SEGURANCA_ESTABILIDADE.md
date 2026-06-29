# H5.26 - Segurança e estabilidade do Comando Central

Correções aplicadas:

- Removido armazenamento de senha em `localStorage`.
- Credencial do Comando Central mantida apenas em memória durante a sessão da página.
- Adicionado `safeFetch()` com tratamento de erro HTTP, resposta vazia e JSON inválido.
- Dados vindos da API escapados antes de entrar em `innerHTML`.
- `PATCH` bloqueado quando o módulo não possui endpoint editável.
- Módulos reescritos como objetos para reduzir erro de índice.
- Mensagens visuais substituem `alert()` no fluxo principal.
- Modais receberam `role="dialog"`, `aria-modal`, `aria-hidden`, labels e foco básico.
- `comando.html` passa a carregar `/homologacao/comando.js` e assets sem expor `/public`.
- `.htaccess` passa a servir rotas `/comando/*` no `public/comando.html`.

Pendência técnica futura:

- Migrar o Comando Central para sessão real com token/cookie HttpOnly no backend.
