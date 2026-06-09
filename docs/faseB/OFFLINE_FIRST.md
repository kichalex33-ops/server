# Offline-first do App Motorista

## Estrategia

O PWA salva localmente configuracoes, viagens, passageiros e eventos operacionais antes de tentar enviar ao servidor.

Tecnologias:

- Service Worker para cache da shell do app.
- IndexedDB para dados operacionais.
- `navigator.onLine` para estado basico de conexao.

## Service Worker

Arquivo:

`public/motorista/service-worker.js`

Cacheia:

- `/motorista`;
- `/motorista/offline.html`;
- `/motorista/manifest.json`;
- CSS;
- JS;
- icone.

Nao cacheia:

- endpoints `/api/*`;
- dados sensiveis;
- respostas dinamicas de operacao.

## IndexedDB

Arquivo:

`public/motorista/assets/js/offline-store.js`

Collections:

- `deviceConfig`;
- `viagens`;
- `passageiros`;
- `eventosPendentes`;
- `localizacoesPendentes`;
- `mensagens`;
- `checklists`;
- `ocorrencias`;
- `despesas`;
- `statusViagem`.

## Comportamento sem internet

- Mostra status `Offline`.
- Usa viagens e passageiros salvos localmente.
- Salva novas acoes em filas pendentes.
- Mantem GPS e ocorrencias pendentes.
- Sincroniza quando a conexao retorna ou quando o motorista toca em `Sincronizar agora`.

## Cuidados

- Nao armazenar senhas.
- Nao armazenar CPF/CNS sem necessidade.
- Remover pendencias confirmadas apos envio.
- Em producao, preferir HTTPS para geolocalizacao e instalacao PWA confiavel.
