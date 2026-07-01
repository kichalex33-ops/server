# H5.33 — Auditoria final e correções

Correções aplicadas:

- Removido `storage/logs/api.log` do pacote.
- Removida pasta `docs/` do pacote de publicação para reduzir exposição e ruído.
- Criado `h533-correcao-final.css` carregado por último para corrigir contraste no modo escuro, principalmente texto claro dentro de superfícies brancas.
- Criado `h534-self-healing.js` para garantir carregamento final do CSS e normalização básica de tema/caminhos.
- Corrigido `api-config.js` para detectar automaticamente o caminho base, sem depender rigidamente de `/homologacao`.
- Corrigido `auth-client.js` com renovação automática do token ao receber 401.
- Corrigida Sala de Situação para carregar autenticação antes de chamar API protegida.
- Corrigido `/dashboard/resumo-dia` para não quebrar quando a coluna `status_operacional` não existir no banco.
- Reforçado `.htaccess` com bloqueio de arquivos sensíveis e no-cache em HTML/CSS/JS para homologação.
- Atualizados assets para versão `h533`.

Atenção operacional:

- Preserve o `.env` real do servidor. Este pacote não deve levar senha real de banco nem chaves de IA.
- Depois de subir, limpe cache do navegador ou abra em aba anônima.
