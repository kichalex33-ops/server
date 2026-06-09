# Decisões dos Agentes - Fase C

## Escopo confirmado

A Fase C fica restrita ao servidor e ao PWA de logística já existentes. O objetivo é estabilizar piloto real, sincronização, saúde operacional, segurança básica, backup e documentação.

## Agentes consultados

- AGENTE_ARQUITETO: preservar arquitetura atual, sem reescrita.
- AGENTE_BACKEND_NODE: ampliar rotas e serviços Express/JSON.
- AGENTE_API_APP_MOTORISTA: manter contratos do PWA e sync offline-first.
- AGENTE_SEGURANCA: aplicar Helmet, compression, rate limit e CORS configurável.
- AGENTE_TESTES: validar health, watchdog, sync e páginas.
- AGENTE_DOCUMENTACAO: criar documentação da Fase C.

## Agente de infraestrutura

O pedido cita AGENTE_INFRAESTRUTURA, mas ele ainda não existe em `.agents/`. Nesta fase, suas responsabilidades foram cobertas por Backend, Segurança, Testes e Documentação.

## Decisões técnicas

- Manter persistência JSON e não introduzir banco novo.
- Preservar `/api/system/health` criado na Fase B.1, ampliando campos para a Fase C.
- Criar `watchdogService.js` como camada isolada de análise operacional.
- Criar páginas simples `/sistema/saude` e `/operador/sincronizacao`.
- Não implementar WebSocket; sincronização permanece baseada em HTTP.
- Não implementar IA, WhatsApp, SUS ou seguradora real.

## Riscos

- Teste 4G real depende de URL pública/HTTPS, VPN ou túnel seguro.
- GPS real depende de aparelho Android em campo.
- PM2 e backup precisam ser validados no Linux final.
