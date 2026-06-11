# App Motorista PWA

## Objetivo

Entregar uma primeira versao web mobile do App Motorista, instalavel como PWA e capaz de operar com internet instavel.

## Acesso

Rotas:

- `GET /motorista`
- `GET /app-motorista`

URL local:

```text
http://localhost:3000/motorista
```

Na rede do notebook/servidor:

```text
http://10.0.0.4:3000/motorista
```

## Estrutura criada

```text
public/motorista/
  index.html
  manifest.json
  offline.html
  service-worker.js
  assets/css/app-motorista.css
  assets/icons/icon.svg
  assets/js/app-motorista.js
  assets/js/offline-store.js
```

## Funcionalidades

- pareamento manual por payload JSON do QR Code;
- armazenamento local da configuracao do aparelho;
- painel inicial do motorista;
- indicador online/offline/sincronizando;
- viagens do dia;
- detalhes da viagem;
- checklist de saida;
- KM inicial e final;
- passageiros com acoes de embarque, desembarque, ausente e desistiu;
- GPS via `navigator.geolocation`;
- ocorrencias;
- botao de panico MVP;
- mensagens simples;
- fila offline e sincronizacao manual/automatica.

## Pareamento temporario

Nesta fase ainda nao ha leitura por camera. O operador gera o QR no Painel Operador e o motorista cola o payload JSON no campo de pareamento.

Fluxo:

1. Operador gera QR no painel.
2. Copia o payload JSON.
3. Motorista abre `/motorista`.
4. Cola o payload.
5. Clica em `Confirmar Pareamento`.
6. O PWA chama `POST /api/driver/pairing/confirm`.
7. O PWA salva a configuracao local e busca viagens.

## Limitacoes

- Leitura por camera ainda nao foi implementada.
- Push notification nao foi implementado.
- Biometria nao foi implementada.
- Dados sensiveis devem continuar fora do armazenamento local sempre que possivel.
