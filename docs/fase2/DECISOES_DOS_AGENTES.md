# Decisoes dos Agentes - Fase 2

## Leitura obrigatoria realizada

Foram consultados:

- `AGENTS.md`
- `.agents/AGENTE_ARQUITETO.md`
- `.agents/AGENTE_BACKEND_NODE.md`
- `.agents/AGENTE_API_APP_MOTORISTA.md`
- `.agents/AGENTE_SEGURANCA.md`
- `.agents/AGENTE_TESTES.md`
- `.agents/AGENTE_DOCUMENTACAO.md`
- `docs/fase1/*`

O caminho `docs/fase11/*` foi solicitado, mas nao existe no projeto no momento da execucao. Nenhuma pasta paralela foi criada para simular essa fase.

## AGENTE_ARQUITETO

- Usar a raiz atual como servidor oficial Node.js.
- Nao criar `servidor_novo`, `servidor_corrigido2` ou estrutura paralela.
- Reaproveitar a pagina visual existente em `painel-logistico/public_html/`.
- Manter `painel-logistico/` e `DEMO/` como referencia legada, sem apagar.

## AGENTE_BACKEND_NODE

- Implementar Express em `server.js` e `src/app.js`.
- Usar persistencia local JSON em `data/painel-logistico.json`.
- Separar rotas, servico, repositorio, middlewares e utilitarios.
- Servir `public/` como interface do painel.

## AGENTE_API_APP_MOTORISTA

- Criar endpoints `/api/driver/*` usando as mesmas collections do JSON.
- Nao criar mock separado para o app motorista.
- Aceitar GPS, eventos e status de viagem por API.
- Manter app motorista como cliente futuro; nenhum APK ou app foi alterado.

## AGENTE_SEGURANCA

- `.env` permanece fora do git.
- `.env.example` inclui `PORT`, `NODE_ENV`, `API_TOKEN` e `CORS_ORIGIN`.
- Escritas exigem token quando `API_TOKEN` estiver definido.
- `data/`, `logs/` e backups nao sao servidos publicamente.
- Acesso externo por 3G/4G deve usar futuramente Cloudflare Tunnel ou HTTPS equivalente.

## AGENTE_TESTES

- Criados testes automatizados com `node --test`.
- Testes cobrem repositorio JSON, status, GPS valido, GPS invalido e endpoints driver.
- Testes curl foram executados contra servidor local.

## AGENTE_DOCUMENTACAO

- Criados documentos de implementacao, API, persistencia, testes, rede e pendencias.
- README da raiz atualizado com instalacao, inicio, acesso na rede e BASE_URL do app.

## Decisoes fora de escopo

- Nao implementar WebSocket.
- Nao implementar MySQL.
- Nao implementar HostGator.
- Nao implementar PDF.
- Nao implementar IA.
- Nao implementar WhatsApp.
- Nao implementar login complexo.
- Nao implementar app motorista.
- Nao implementar mapa premium.
