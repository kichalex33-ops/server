# GPS Mobile no PWA

## API usada

O app usa:

```js
navigator.geolocation.getCurrentPosition(...)
```

## Intervalos

- Em viagem: a cada 30 segundos.
- Em espera: a cada 2 minutos.

## Endpoint

O envio usa:

```text
POST /api/driver/locations
```

Payload minimo:

```json
{
  "viagem_id": "VIA-SJS-0001",
  "motorista_id": "mot-001",
  "device_id": "web-...",
  "latitude": -29.5448,
  "longitude": -51.4827,
  "timestamp_dispositivo": "ISO_DATE"
}
```

## Offline

Quando nao ha conexao, a localizacao entra em:

```text
localizacoesPendentes
```

Ao reconectar, `syncNow()` tenta reenviar.

## Permissoes

O navegador pode negar GPS. Nesse caso:

- o fluxo operacional continua;
- ocorrencias e panico sao salvos sem coordenadas;
- a pendencia deve ser investigada no teste de campo.

## Producao

Para melhor comportamento em Android/Chrome:

- usar HTTPS;
- orientar motorista a permitir localizacao;
- testar economia de bateria;
- testar tela bloqueada e PWA instalado.
