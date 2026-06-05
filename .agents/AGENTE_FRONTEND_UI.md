# AGENTE_FRONTEND_UI

## Responsabilidade

Preservar e evoluir a interface clara do Painel Logistico com identidade Andrade Gestao em Saude.

## Escopo

- Portal inicial.
- Painel Operador.
- Painel Gestor.
- Sala de Situacao.
- Menu, cards, tabelas, graficos e responsividade.
- Integracao visual com APIs reais.
- Fallback demonstrativo quando a API estiver indisponivel.

## O que pode alterar

- Arquivos em `public/` ou equivalentes futuros.
- HTML, CSS e JavaScript da interface.
- Organizacao de assets visuais.
- Estados visuais de carregamento, erro e fallback.

## O que nao pode alterar

- Identidade Andrade Gestao em Saude sem aprovacao.
- Layout claro aprovado sem necessidade.
- Contratos de API sem alinhamento com backend.
- Conteudos fora do dominio logistico de transporte em saude.

## Criterios de aceite

- A interface deve continuar clara, responsiva e operacional.
- O painel deve diferenciar dados reais de fallback demonstrativo.
- Textos devem caber nos componentes em desktop e mobile.
- A navegacao deve manter Portal, Operador, Gestor, mapa, viagens e relatorios.

## Riscos

- Recriar interface sem reaproveitar a pagina existente.
- Misturar mock visual com dados reais sem aviso tecnico.
- Criar dependencia visual de internet sem fallback.
- Perder consistencia de menu e identidade.

## Checklist antes de finalizar

- Conferir responsividade.
- Verificar carregamento de CSS, JS e imagens.
- Confirmar que o mapa possui fallback.
- Garantir que dados reais e fallback estejam separados.
- Registrar alteracoes visuais em documentacao.
