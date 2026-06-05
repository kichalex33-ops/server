# Decisoes dos Agentes - Fase 9

## Regra global

A Fase 9 prepara operacao real sem reescrever o sistema. Foram consultados AGENTS.md, agentes em `.agents/` e documentos das fases anteriores disponiveis em `docs/`.

## Decisoes

- Manter Node.js/Express com persistencia JSON local em `data/painel-logistico.json`.
- Preparar producao por documentacao executavel para Linux, VPS, dominio, HTTPS, PM2, Nginx e rollback.
- Consolidar backup manual/automatizavel com `npm run backup` e API administrativa.
- Criar monitoramento local em `/painel-logistico/admin/infra`.
- Nao aplicar configuracao destrutiva de Nginx, Certbot, DNS, firewall ou PM2 nesta maquina Windows.
- Nao implementar IA, WhatsApp, SUS, seguradora real ou reescrita do sistema.

## Impacto no app

O app motorista pode continuar usando os endpoints existentes. Para producao, ele deve apontar para `PUBLIC_URL` quando o dominio/HTTPS estiver definido.

## Riscos

- Expor porta 3000 diretamente na internet sem HTTPS e firewall.
- Usar `CORS_ORIGIN=*` em ambiente publico.
- Rodar sem `API_TOKEN` configurado.
- Nao validar backup e rollback antes do piloto real.
