# App Motorista - Fase 7

## Local do app

O app motorista esta no projeto Flutter:

```text
C:\dev\plataforma\app\plataforma teste
```

Modulo logistico:

```text
C:\dev\plataforma\app\plataforma teste\modules\logistica
```

## Contratos conectados

O cliente `DriverApiClient` foi preparado para conversar com:

- `POST /api/driver/login`
- `GET /api/driver/trips?motorista_id=...`
- `GET /api/driver/notices`
- `POST /api/driver/trips/:id/checklist`
- `POST /api/driver/trips/:id/km-inicial`
- `POST /api/driver/trips/:id/flow`
- `POST /api/driver/trips/:id/finalizar`
- `POST /api/driver/panic`
- `POST /api/driver/proofs`

## Estado atual

O app ja possui fluxo operacional local/offline-first no modulo Logistica. A Fase 7 adiciona o cliente de comunicacao com a plataforma Node.

## Incrementos futuros

Quando necessario, o app deve evoluir para ligar cada tela existente diretamente aos novos metodos do `DriverApiClient`.
