# H4.22 - IA em chat, viagens no dashboard e layout claro

## Objetivo

Consolidar a IA nos painéis Operador e Gestor como assistente útil de operação, corrigir o erro HTTP 404 nas chamadas de IA e aproximar o layout do padrão visual de referência: menu claro, topo azul/cinza, cards brancos e lista operacional limpa.

## Ajustes principais

- Nova rota `POST /api/ai/chat` para pergunta livre e análises operacionais.
- Alias `POST /api/ai/question` e `POST /api/ai/ask`.
- Chat flutuante no canto inferior direito nos painéis Operador e Gestor.
- Botões de IA continuam existindo na tela, mas agora usam o endpoint consolidado quando possível.
- Dados das viagens aparecem na Visão Geral e na tela Viagens do Dia.
- Horário da consulta adicionado ao formulário de criação de viagem e exibido a partir dos metadados.
- Resumo de rotas e atenção aparece no dashboard.
- Tema claro passa a ser o padrão ao abrir o painel.
- Cache atualizado para `v=h422`.

## Observação sobre trânsito

A plataforma não possui API externa de tráfego em tempo real, como Google Maps/Waze. A análise de lentidão é inferida por sinais de GPS, velocidade, ausência de atualização e clima operacional.

## Teste esperado

1. Entrar no Operador.
2. Ver layout claro, com menu lateral branco e topo azul/cinza.
3. Ver dados de viagens na Visão Geral.
4. Abrir Viagens do Dia e ver horário de consulta.
5. Abrir o chat no canto inferior direito e perguntar algo.
6. Confirmar que a resposta da IA não retorna HTTP 404.
7. Repetir no painel Gestor.
