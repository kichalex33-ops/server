# Sincronizacao em Campo - Fase 7

## Principio

O app motorista continua offline-first. Toda operacao deve poder ser salva localmente e enviada quando houver conexao.

## Status esperados

- Pendente
- Enviado
- Confirmado
- Erro

## Contratos da plataforma

- Eventos: `POST /api/driver/events`
- GPS: `POST /api/gps`
- Sync: `POST /api/driver/sync`
- Fluxo: `POST /api/driver/trips/:id/flow`

## Botao de sincronizacao

O app ja possui painel de sincronizacao. O incremento da Fase 7 prepara o cliente para enviar tambem os novos contratos operacionais.
