# Teste Offline-first

## Roteiro

1. Internet ligada.
2. Parear PWA.
3. Receber viagens.
4. Desligar internet.
5. Registrar checklist.
6. Registrar KM.
7. Registrar passageiro.
8. Registrar ocorrencia.
9. Acionar panico MVP.
10. Ligar internet.
11. Tocar em `Sincronizar agora`.

## Validacoes

| Validacao | Status | Observacao |
|---|---|---|
| Viagens salvas localmente | APROVADO | IndexedDB `viagens`. |
| Passageiros salvos localmente | APROVADO | IndexedDB `passageiros`. |
| Eventos pendentes | APROVADO | IndexedDB `eventosPendentes`. |
| GPS pendente | APROVADO | IndexedDB `localizacoesPendentes`. |
| Nenhuma perda de dados | PARCIAL | Requer teste manual desligando internet no aparelho. |
| Ordem correta dos eventos | PARCIAL | Requer validacao operacional com eventos reais. |

## Resultado geral

**PARCIAL**

Motivo: a estrutura tecnica esta implementada, mas o roteiro completo precisa ser executado em celular real antes do piloto.
