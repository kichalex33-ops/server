# H4.3 - Mapas Leaflet e OpenStreetMap

## Implementacao

- Criado componente reutilizavel `public/assets/js/live-map.js`.
- Criado estilo compartilhado `public/assets/css/mapas.css`.
- Adicionado Mapa Operacional ao Painel Operador.
- Adicionado Mapa Gerencial da Frota ao Painel Gestor.
- Preservado o mapa existente da Sala de Situacao.
- O componente aceita o formato atual `data.veiculos` e tambem o formato futuro `data.items`.
- Removido telefone do popup da Sala de Situacao.

## Comportamento

- Atualizacao automatica a cada 5 segundos.
- Multiplos veiculos podem ser exibidos simultaneamente.
- Marcadores informam veiculo, motorista, status, viagem e horario do GPS.
- Resumos exibem veiculos localizados, motoristas, alertas e ultima atualizacao.
- Falha de API gera mensagem de erro sem interromper as demais funcoes da tela.
- Ausencia de coordenadas gera estado vazio, sem simulacao.

## Checklist HostGator

- [ ] `/homologacao/painel-logistico/operador` carrega o mapa embutido.
- [ ] `/homologacao/painel-logistico/gestao` carrega o mapa embutido.
- [ ] `/homologacao/painel-logistico/sala-situacao` continua carregando o mapa.
- [ ] `/homologacao/api/live-map` responde JSON com `data.veiculos` ou `data.items`.
- [ ] Sem localizacoes, a lista retornada e vazia e a tela mostra estado vazio.
- [ ] Com localizacoes, os marcadores aparecem nas coordenadas reais.
- [ ] Os contadores refletem os dados retornados pela API.
- [ ] Popups nao exibem CPF, CNS, telefone, endereco ou dados clinicos.
- [ ] A atribuicao `© OpenStreetMap contributors` esta visivel.
- [ ] Nenhum tile foi incluido no pacote para uso offline.

## Status

**MAPAS EMBUTIDOS PRONTOS PARA TESTE NA HOSTGATOR**

O status nao significa homologacao em producao. Os itens acima precisam ser executados depois do upload para o Apache/PHP real da HostGator.
