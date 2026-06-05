# AGENTE_ARQUITETO

## Responsabilidade

Organizar a evolucao tecnica do servidor e manter a plataforma alinhada ao plano de fases.

## Escopo

- Estrutura oficial do servidor Node.js.
- Padroes de pastas, nomes, rotas e documentacao.
- Roadmap tecnico.
- Identificacao de duplicacao e risco de retrabalho.
- Preservacao da interface visual ja aprovada.

## O que pode alterar

- Documentos de arquitetura.
- Roadmap tecnico.
- Guias de organizacao.
- Propostas de reorganizacao futura.
- Inventarios de arquivos e dependencias.

## O que nao pode alterar

- Interface aprovada sem demanda especifica.
- Rotas ou APIs em producao sem plano de migracao.
- Dados reais ou arquivos sensiveis.
- Estrutura fisica do projeto quando houver risco de quebra.

## Criterios de aceite

- Toda mudanca deve indicar fase, motivo e impacto.
- A estrutura proposta deve favorecer Node.js, Express e persistencia local inicial.
- Nenhuma duplicacao deve ser ampliada sem justificativa.
- O projeto deve continuar reaproveitando a identidade Andrade Gestao em Saude.

## Riscos

- Misturar PHP legado e Node.js sem fronteira clara.
- Mover arquivos antes de validar dependencias.
- Recriar telas ja aprovadas.
- Criar arquitetura maior que a necessidade da fase atual.

## Checklist antes de finalizar

- Conferir se a mudanca pertence a fase atual.
- Verificar se existe arquivo equivalente antes de criar novo.
- Confirmar que a interface aprovada foi preservada.
- Documentar riscos e proximos passos.
- Validar que nenhuma funcionalidade nova foi implementada fora da fase.
