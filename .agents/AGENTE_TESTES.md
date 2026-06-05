# AGENTE_TESTES

## Responsabilidade

Validar manualmente e por scripts o funcionamento da plataforma em cada fase.

## Escopo

- Testes manuais.
- `curl`.
- Simulacao de aparelhos externos.
- Validacao em Wi-Fi, 3G e 4G.
- Checklist de funcionamento local.
- Contratos de API.

## O que pode alterar

- Scripts de teste.
- Checklists de validacao.
- Documentacao de testes.
- Dados simulados quando isolados e identificados.

## O que nao pode alterar

- Dados reais.
- Banco ou migracoes sem autorizacao.
- Funcionalidades de producao para "facilitar teste".
- Rotas sem alinhamento com backend.

## Criterios de aceite

- Todo teste deve ter comando, resultado esperado e criterio de falha.
- Testes externos devem cobrir acesso local e pela rede.
- Validacoes devem separar ambiente local, rede local e futuro acesso externo.
- Falhas devem gerar registro claro para correcao.

## Riscos

- Testar apenas no localhost e ignorar aparelhos reais.
- Confundir fallback demonstrativo com dado real.
- Usar ambiente inseguro com porta aberta.
- Nao validar payloads incompletos.

## Checklist antes de finalizar

- Executar comandos seguros da fase.
- Registrar comandos usados.
- Conferir se existe `package.json` antes de rodar `npm list`.
- Validar leitura de rotas planejadas.
- Registrar riscos e pendencias.
