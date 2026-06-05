# Decisoes dos Agentes - Fase 4

## Escopo aplicado

- Implementar sala de situacao em `/painel-logistico/sala-situacao`.
- Usar Leaflet com OpenStreetMap, sem chave paga e sem Google Maps.
- Criar GPS real por `POST /api/gps`, com validacao de coordenadas e viagem existente.
- Criar mapa operacional em `GET /api/live-map`.
- Criar historico de trajetos em `GET /api/viagens/:id/trajeto`.
- Manter polling de 5 segundos, sem WebSocket.
- Manter modo demonstrativo na tela para treino e fallback visual.

## Decisoes tecnicas

- O recebimento GPS grava historico em `localizacoes` e tambem registra evento e sync log.
- A ultima posicao operacional usa `created_at`, isto e, o horario em que o servidor recebeu o ponto. O horario do dispositivo segue preservado em `timestamp_dispositivo`.
- Alertas sao criados sem duplicar alertas abertos do mesmo tipo por viagem.
- A cor operacional segue regra simples: laranja para velocidade acima do limite, vermelho para alerta/ocorrencia aberta, cinza para GPS ausente/antigo, amarelo para parado/espera, verde para concluido/desembarque e azul para deslocamento normal.
- A pagina usa `/api/live-map` como fonte real e alterna para demo quando o operador ativa o controle.

## Decisao de infraestrutura

O uso de Cloudflare Tunnel, Ngrok, dominio ou redirecionamento de porta sera necessario quando a plataforma precisar receber dados de aparelhos fora da rede local, por exemplo em 3G/4G na rua. Essa decisao fica registrada para as fases futuras.

## Fora do escopo

- WebSocket.
- Integracoes externas de mensagens.
- Seguradora.
- Botao de panico completo.
- PDF.
- BI avancado.
- IA.
- Integracao SUS.
