# H4.20 - IA nos painéis e ajuste visual

## Objetivo
Ativar uso visível da IA Gemini nos painéis Operador e Gestor e reforçar o layout no estilo administrativo de referência.

## Alterações
- Adicionado menu `IA Operacional` no Painel Operador.
- Adicionado bloco `IA Gerencial` no Painel Gestor.
- Operador pode gerar resumo operacional, análise de riscos e análise de viagem selecionada.
- Gestor pode gerar relatório gerencial, resumo operacional e pendências de homologação.
- CSS atualizado para menu lateral claro, topbar azul/cinza e cards administrativos.
- Adicionado cache busting `?v=h420` em CSS/JS dos painéis principais.

## Pré-requisito
O `.env` real deve conter `GEMINI_API_KEY` válida.

## Validação
1. Login como operador.
2. Abrir `/homologacao/painel-logistico/operador`.
3. Clicar em `IA Operacional`.
4. Clicar em `Resumo operacional`.
5. Login como gestor.
6. Abrir `/homologacao/painel-logistico/gestao`.
7. Clicar em `IA Gerencial > Relatório gerencial`.
