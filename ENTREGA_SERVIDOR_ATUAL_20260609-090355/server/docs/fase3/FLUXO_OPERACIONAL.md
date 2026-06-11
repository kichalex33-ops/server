# Fluxo Operacional - Fase 3

## Fluxo base

1. Viagem inicia em `AGUARDANDO`.
2. Operador chama `iniciar-preparacao`.
3. Motorista ou operador confirma saida.
4. Passageiros sao embarcados, marcados ausentes ou desistentes.
5. Viagem entra em espera quando necessario.
6. Retorno e iniciado.
7. Passageiros desembarcam.
8. Viagem e finalizada ou cancelada.

## Efeitos operacionais

Cada acao relevante cria:

- evento operacional;
- syncLog;
- atualizacao do registro principal.

## Preparacao para fases futuras

A Fase 3 prepara a base para GPS, mapa operacional e Sala de Situacao, mas nao implementa esses recursos.
