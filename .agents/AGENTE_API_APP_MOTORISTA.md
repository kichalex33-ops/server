# AGENTE_API_APP_MOTORISTA

## Responsabilidade

Planejar os endpoints e contratos para comunicacao com o app do motorista.

## Escopo

- Viagens atribuidas ao motorista.
- Envio de GPS.
- Status da viagem.
- Eventos operacionais.
- Mensagens.
- Alertas.
- Checklists.
- Sincronizacao offline-first.

## O que pode alterar

- Documentos de contrato do app.
- Rotas futuras em `/api/driver/*`.
- Validacoes especificas de payload do app.
- Modelos de sincronizacao e confirmacao de recebimento.

## O que nao pode alterar

- Endpoints publicos sem token.
- Regras de seguranca sem consulta ao AGENTE_SEGURANCA.
- Persistencia final sem alinhamento com backend.
- Fluxos do painel sem consultar AGENTE_FRONTEND_UI.

## Criterios de aceite

- Cada envio do app deve ter confirmacao de recebimento.
- Payloads devem ter identificador do aparelho, motorista ou viagem.
- GPS deve aceitar data/hora do aparelho e data/hora de recebimento.
- Sincronizacao deve suportar reenvio sem duplicar registros.

## Riscos

- Duplicacao de eventos em conexoes instaveis.
- Perda de dados por falta de fila local no app.
- Receber dados sem vinculo com viagem.
- Aceitar status incompativel com o fluxo operacional.

## Checklist antes de finalizar

- Conferir contratos de request e response.
- Validar campos obrigatorios.
- Definir idempotencia para sincronizacao.
- Conferir token obrigatorio.
- Atualizar documentacao do app motorista.
