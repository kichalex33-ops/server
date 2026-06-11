# Alertas

## Regras implementadas

- `GPS_SEM_ATUALIZACAO`: viagem ativa sem ponto GPS ou com ponto antigo.
- `VELOCIDADE_ACIMA_LIMITE`: velocidade acima de 80 km/h.
- `VEICULO_PARADO`: pontos consecutivos com velocidade zero por periodo prolongado.
- `ESPERA_PROLONGADA`: viagem em espera por mais de 30 minutos.
- Ocorrencias abertas entram no mapa como alerta ativo.

## Registro

Cada alerta criado gera:

- item em `alertas`
- evento na timeline
- registro em `syncLogs`

## Duplicidade

O sistema nao cria novo alerta do mesmo tipo para a mesma viagem enquanto houver alerta aberto equivalente.
