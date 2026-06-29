# H4.28 - Rastreamento de motoristas no painel web

Implementado:

- Leaflet/OpenStreetMap mantido.
- Painel consome `/api/live-map` a cada 20 segundos.
- App motorista envia GPS via `/api/gps` com latitude, longitude, velocidade, precisao, direcao, veiculo, motorista e status da viagem.
- Popups do mapa mostram motorista, viagem, status, estado da rota, velocidade, ultimo GPS e link para abrir no Waze.
- Sala de situacao ganhou filtros por motorista, veiculo, status e viagem/rota.
- Sala de situacao mostra historico por viagem usando `/api/rastreamento?viagem_id=...`.
- A trilha da rota e desenhada com os pontos salvos na tabela `localizacoes`.
- Alertas dinamicos no `/api/live-map`:
  - `GPS_SEM_ATUALIZACAO` quando a ultima leitura tem mais de 10 minutos.
  - `VELOCIDADE_ACIMA_LIMITE` quando a velocidade passa de 80 km/h.
- Relatorio CSV da rota percorrida no painel.

Observacao:

O rastreamento e quase em tempo real. O app motorista coleta GPS em intervalo normal de 30 segundos e o painel web le a API a cada 20 segundos. Em espera, o app reduz o intervalo para 2 minutos.
