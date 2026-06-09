# Sincronizacao do App Motorista

## Funcao principal

A sincronizacao e coordenada pela funcao:

```text
syncNow()
```

Arquivo:

`public/motorista/assets/js/app-motorista.js`

## Filas sincronizadas

- `eventosPendentes`
- `localizacoesPendentes`

Eventos pendentes podem representar:

- checklist;
- KM inicial;
- fluxo da viagem;
- finalizacao;
- passageiro embarcado;
- passageiro desembarcado;
- passageiro ausente;
- ocorrencia;
- panico;
- mensagem.

## Estados

Cada item da fila possui:

- `pendente`;
- `enviando`;
- `confirmado` indiretamente por remocao da fila;
- `erro`.

## Regras

- O item e salvo localmente antes de qualquer tentativa de envio.
- Se o envio falhar, o item permanece local com status `erro`.
- Ao reconectar, o app tenta sincronizar novamente.
- O service worker nao cacheia respostas das APIs.

## Endpoints usados

- `POST /api/driver/trips/:id/checklist`
- `POST /api/driver/trips/:id/km-inicial`
- `POST /api/driver/trips/:id/flow`
- `POST /api/driver/trips/:id/finalizar`
- `POST /api/driver/passengers/:id/boarding`
- `POST /api/driver/passengers/:id/dropoff`
- `POST /api/driver/passengers/:id/absent`
- `POST /api/driver/locations`
- `POST /api/driver/occurrences`
- `POST /api/driver/panic`
- `POST /api/mensagens`

## Limitacoes

- Ainda nao ha backoff progressivo.
- Ainda nao ha idempotencia forte por `client_event_id` no backend.
- Ainda nao ha tela administrativa para ver pendencias do aparelho.
