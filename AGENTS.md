# Agentes do Projeto

Este projeto deve evoluir por fases. Cada agente representa uma responsabilidade tecnica e deve ser consultado antes de alteracoes no seu escopo.

## Como os agentes trabalham juntos

1. O AGENTE_ARQUITETO define a fronteira da fase, evita duplicacao e valida se a mudanca pertence ao momento atual.
2. O AGENTE_BACKEND_NODE define rotas, persistencia, validacao e recebimento externo quando a fase permitir implementacao.
3. O AGENTE_FRONTEND_UI preserva a pagina visual aprovada e adapta telas sem recriar a interface sem necessidade.
4. O AGENTE_API_APP_MOTORISTA define contratos para app, GPS, eventos, mensagens, alertas, checklists e sincronizacao.
5. O AGENTE_GPS_MAPA cuida de mapa, rastreamento, marcadores, rota e fallback.
6. O AGENTE_SEGURANCA revisa token, `.env`, CORS, logs, dados sensiveis, LGPD e preparo para HTTPS.
7. O AGENTE_TESTES valida comandos, contratos e acesso local ou pela rede.
8. O AGENTE_DOCUMENTACAO registra inventarios, roadmap, instalacao e operacao.

## Consulta por tipo de alteracao

- Estrutura de pastas, roadmap ou migracao: AGENTE_ARQUITETO.
- Servidor Node.js, Express, API, persistencia e logs: AGENTE_BACKEND_NODE.
- Telas, layout, identidade visual, cards, menu e responsividade: AGENTE_FRONTEND_UI.
- App motorista, offline-first e sincronizacao do aparelho: AGENTE_API_APP_MOTORISTA.
- Mapa, GPS, Leaflet, OpenStreetMap, marcadores e rotas: AGENTE_GPS_MAPA.
- Token, `.env`, CORS, logs, dados sensiveis e acesso externo: AGENTE_SEGURANCA.
- Testes manuais, `curl`, simulacao de aparelho e validacao de rede: AGENTE_TESTES.
- README, docs, inventarios e instrucoes Linux: AGENTE_DOCUMENTACAO.

## Regras de colaboracao

- Nao mover arquivos existentes sem plano documentado.
- Nao recriar interface aprovada sem necessidade clara.
- Nao implementar funcionalidades fora da fase atual.
- Separar estado atual, proposta futura e riscos.
- Preservar o dominio logistico de transporte em saude.
- Manter segredos fora do repositorio.
- Registrar comandos de verificacao executados.

## Regra da Fase 1

Na Fase 1, os agentes apenas auditam, organizam e documentam. Implementacao de API Node.js, banco novo, login, GPS real, WebSocket, app motorista, relatorios novos e integracoes externas ficam para fases posteriores.
