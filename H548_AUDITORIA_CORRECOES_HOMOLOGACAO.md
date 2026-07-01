# H548 — Auditoria de Correções de Homologação H547

## Base
Pacote base: `homologacao-h547-pwa-operator-advanced.zip`.
Correções recebidas: `correcoes-homologacao-h547.zip`.

## Decisão técnica
As correções recebidas foram auditadas antes de aplicar. Nem tudo foi aplicado cegamente.

### Aplicado
- `api/config/env.php`: CORS não usa mais `*` como fallback em produção.
- `api/config/env.php`: validação mínima de `JWT_SECRET` antes de devolver a configuração da API.
- `index.php`: fallback mais seguro, com status 503 quando o portal estiver indisponível.
- `public/js/core/http.js`: removido fallback de sessão sensível em `localStorage`.
- `public/assets/js/auth-client.js`: removido fallback de sessão sensível em `localStorage`.
- `public/js/core/state.js`: removida leitura da sessão de autenticação pelo `localStorage`.
- `public/assets/js/h526-security-auth.js`: removida leitura da sessão de autenticação pelo `localStorage`.
- `.env.example`: mantido apenas modelo seguro, sem credenciais reais.
- `.htaccess`: mantido bloqueio contra `.env`, `env`, logs, Markdown, vendor e áreas internas.
- Cache bust: HTMLs apontam para `js/app.js?v=h548`.
- `public/js/app.js`: versão interna alterada para `h548`.
- `public/sw.js`: cache do Service Worker alterado para `logisaude-h548-static`.
- `api/src/ApiService.php`: endpoint de versão retorna `h548`.

### Não aplicado por risco de duplicação
- Não foi adicionada chamada direta a `assets/js/driver-pairing.js` em `operador-conectar-app.html`, porque `public/js/modules/legacy.js` já carrega esse arquivo especificamente nessa página. Adicionar novamente poderia duplicar listeners e requisições.

## Auditoria executada
- `php -l` em todos os arquivos PHP: OK.
- `node --check` em todos os arquivos JS públicos: OK.
- Busca por `.env`, `env`, `*.log`, ZIP interno e backup SQL em storage: OK, não encontrados.
- Busca por `package.json`, `package-lock.json`, `node_modules`, `yarn.lock`, `pnpm-lock.yaml`: OK, não encontrados.
- Busca por fallback de token em `localStorage` usando a chave `painel-logistico-auth`: OK, não encontrado.
- Arquivos de fonte `.otf`, `.ttf`, `.woff`, `.woff2`: não incluídos.

## Ação operacional obrigatória
Se alguma versão anterior foi enviada com credenciais reais por engano, troque imediatamente:
- Senha do banco MySQL.
- `JWT_SECRET`.
- Chave Gemini/API de IA.

O pacote H548 não inclui `.env` real. O `.env` deve existir somente no servidor.
