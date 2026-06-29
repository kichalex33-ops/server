# OpenStreetMap nos paineis

A plataforma usa Leaflet 1.9.4 com os tiles publicos do OpenStreetMap. Nao utiliza Google Maps, nao exige chave de mapa e nao armazena tiles offline.

## Telas com mapa

- Operador: `/homologacao/painel-logistico/operador`
- Gestao: `/homologacao/painel-logistico/gestao`
- Sala de Situacao: `/homologacao/painel-logistico/sala-situacao`

Operador e Gestao compartilham `public/assets/js/live-map.js`. A Sala de Situacao preserva seu mapa especializado e continua usando o mesmo endpoint PHP.

## Fonte dos dados

Os mapas consultam `GET /homologacao/api/live-map`. O componente aceita o retorno atual em `data.veiculos` e tambem esta preparado para um formato futuro em `data.items`.

Quando nenhuma localizacao real existir, a lista sera vazia e o mapa exibira um estado vazio. Nenhum dado de demonstracao e criado.

## Privacidade

Os popups nao exibem CPF, CNS, telefone, endereco, informacoes clinicas nem dados de pacientes. A interface mostra somente informacoes necessarias ao acompanhamento da frota.

## Tiles e atribuicao

Os tiles sao carregados em tempo real de `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`. A atribuicao `© OpenStreetMap contributors` permanece visivel no mapa. O projeto nao baixa nem empacota tiles para uso offline.
