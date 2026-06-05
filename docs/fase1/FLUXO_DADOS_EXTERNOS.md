# Fluxo de Dados Externos - Fase 1

## Objetivo

Documentar como aparelhos externos deverao enviar e receber dados quando a plataforma Node.js entrar na fase de implementacao.

Nesta fase, o fluxo e planejamento. Nenhum endpoint novo foi implementado.

## Fluxo principal

```text
App Motorista
-> Wi-Fi / 3G / 4G
-> Servidor Node.js no Linux
-> API Express
-> Persistencia local
-> Painel Operador / Gestor
```

## Entrada de dados esperada

- GPS.
- Status da viagem.
- Eventos.
- Alertas.
- Mensagens.
- Checklists.
- Embarque.
- Desembarque.
- KM inicial.
- KM final.
- Ocorrencia.
- Sincronizacao.

## Saida de dados esperada

- Viagens atribuidas.
- Passageiros.
- Mensagens da central.
- Avisos.
- Alteracoes de rota.
- Status atualizado.
- Confirmacao de recebimento.

## Origem dos dados

Os aparelhos poderao se conectar de tres formas:

- Wi-Fi local, quando estiverem na mesma rede do notebook Linux.
- 3G/4G, quando o servidor tiver acesso externo por tunel, dominio ou redirecionamento seguro.
- Cabo/internet do notebook, quando o notebook estiver servindo como ponto de acesso ou ponte de rede.

## Dados minimos por envio do app

Cada payload enviado pelo app motorista deve conter:

- Identificador do aparelho ou sessao.
- Identificador do motorista, quando disponivel.
- Identificador da viagem.
- Tipo do evento.
- Data/hora gerada no aparelho.
- Data/hora recebida pelo servidor.
- Identificador unico local para evitar duplicidade em reenvios.

## GPS

Payload planejado:

```json
{
  "deviceId": "aparelho-001",
  "driverId": 1,
  "tripId": 1,
  "latitude": -29.5448,
  "longitude": -51.4827,
  "accuracy": 12,
  "speed": 0,
  "recordedAt": "2026-06-03T10:00:00-03:00",
  "clientEventId": "aparelho-001-gps-0001"
}
```

Resposta planejada:

```json
{
  "ok": true,
  "received": true,
  "serverReceivedAt": "2026-06-03T10:00:03-03:00"
}
```

## Status da viagem

Status planejados devem ser controlados para evitar valores soltos. Exemplos:

- programada.
- recebida.
- confirmada.
- checklist_em_andamento.
- checklist_aprovado.
- em_deslocamento.
- no_destino.
- concluida.
- cancelada.

## Eventos, alertas e mensagens

Eventos devem ser registrados como trilha operacional. Alertas devem representar itens que exigem atencao da central. Mensagens devem manter autor, destinatario, texto, viagem e data/hora.

## Checklists

O checklist deve permitir envio parcial e reenvio posterior. Cada item precisa de:

- Codigo do item.
- Status.
- Observacao opcional.
- Data/hora local.
- Identificador unico local.

## Sincronizacao offline-first

Quando o aparelho estiver sem rede:

1. O app grava eventos localmente.
2. O app envia a fila quando a rede voltar.
3. A API responde cada item recebido.
4. O app marca itens confirmados.
5. A API ignora duplicados usando `clientEventId`.

## Consumo pelo painel

O Painel Operador e o Painel Gestor devem consumir dados consolidados por API:

- Resumo do dia.
- Viagens em andamento.
- Ultimas localizacoes.
- Eventos recentes.
- Alertas abertos.
- Mensagens.
- Pendencias de sincronizacao.

## Riscos

- Perda de dados em rede instavel.
- Duplicidade de eventos em reenvio.
- GPS sem viagem associada.
- Aparelho apontando para IP incorreto.
- Exposicao externa sem HTTPS.
- Falta de token em endpoint de escrita.
