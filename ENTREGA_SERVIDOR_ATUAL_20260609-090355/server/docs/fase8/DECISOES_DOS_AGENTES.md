# Decisoes dos Agentes - Fase 8

## Regra global

A Fase 8 foi implementada somente no servidor, conforme regra do projeto nesta etapa.

Foi analisada a pasta do app Flutter em:

```text
C:\dev\plataforma\app\plataforma teste
```

Nenhum arquivo do app foi alterado.

## Agentes consultados

- AGENTE_ARQUITETO
- AGENTE_BACKEND_NODE
- AGENTE_FRONTEND_UI
- AGENTE_SEGURANCA
- AGENTE_API_APP_MOTORISTA
- AGENTE_TESTES
- AGENTE_DOCUMENTACAO

Tambem foram lidos os documentos das fases anteriores disponiveis em `docs/`.

## Decisoes

- Manter compatibilidade com `/api/driver/panic`.
- Criar o endpoint completo `POST /api/panico`.
- Criar Central de Emergencia em `/painel-logistico/emergencias`.
- Preparar estrutura de seguradora e assistencia tecnica sem integrar APIs externas reais.
- Registrar auditoria operacional para pânico, emergencia, giroflex, watchdog, antifraude, mensagens e LGPD.
- Nao implementar WhatsApp real, SUS real, IA, BI externo ou API real de seguradora.

## Impacto no app

O app atual consegue continuar acionando pânico pelo endpoint existente. Para aproveitar 100% da Fase 8, ele pode ser incrementado futuramente com tipo de pânico, tela de avisos/mensagens e leitura de emergencia.
