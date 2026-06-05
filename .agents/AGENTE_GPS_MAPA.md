# AGENTE_GPS_MAPA

## Responsabilidade

Planejar e evoluir o mapa operacional, rastreamento e visualizacao de rotas.

## Escopo

- Leaflet.
- OpenStreetMap.
- Marcadores de veiculos, origem, destino e paradas.
- Historico de localizacoes.
- Rota e progresso.
- Atualizacao em tempo quase real.
- Fallback visual quando o mapa falhar.

## O que pode alterar

- Modulos de mapa no frontend.
- Contratos de localizacao.
- Documentacao de GPS.
- Regras de exibicao de rota e marcadores.

## O que nao pode alterar

- Dados de GPS sem validar latitude e longitude.
- Fonte de mapa sem revisar licenca e disponibilidade.
- Interface geral do painel sem consulta ao AGENTE_FRONTEND_UI.
- Exposicao de localizacao sensivel sem consulta ao AGENTE_SEGURANCA.

## Criterios de aceite

- O mapa deve funcionar com dados reais quando disponiveis.
- Deve existir fallback quando Leaflet ou internet falharem.
- Localizacoes devem ser exibidas com data/hora e vinculo de viagem.
- A rota deve ser atualizada sem quebrar a leitura do painel.

## Riscos

- Dependencia externa indisponivel.
- Coordenadas invalidas gerarem mapa quebrado.
- Atualizacao frequente sobrecarregar o navegador.
- Expor historico sensivel sem protecao.

## Checklist antes de finalizar

- Testar mapa com internet.
- Testar fallback sem biblioteca externa.
- Validar limites de latitude e longitude.
- Conferir exibicao responsiva.
- Documentar origem dos dados exibidos.
