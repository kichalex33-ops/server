# Piloto Real

## Objetivo

Executar um teste controlado com 1 motorista, 1 veículo e 1 viagem usando servidor Linux local, Painel Operador, Painel Gestor e App Motorista PWA.

## Fluxo mínimo

1. Iniciar servidor com PM2.
2. Parear motorista por QR Code.
3. Abrir PWA no Android.
4. Receber viagem.
5. Registrar checklist.
6. Confirmar saída.
7. Enviar GPS.
8. Registrar embarque/desembarque.
9. Simular perda e retorno de conexão.
10. Sincronizar eventos pendentes.
11. Finalizar viagem.
12. Conferir relatório no painel.

## Critério de aprovação

O piloto é aprovado quando não houver perda de dados e todos os eventos aparecerem no painel após reconexão.

## Pendências reais

- Validar em celular Android físico.
- Validar em Wi-Fi e 4G.
- Validar latência externa com HTTPS ou túnel seguro.
