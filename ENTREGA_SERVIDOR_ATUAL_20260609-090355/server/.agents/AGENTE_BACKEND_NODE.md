# AGENTE_BACKEND_NODE

## Responsabilidade

Planejar e implementar futuramente o backend Node.js com Express para receber, validar, persistir e expor dados da operacao.

## Escopo

- Express e servidor local.
- Rotas HTTP e APIs JSON.
- Persistencia local em JSON ou SQLite.
- Validacao de entrada.
- Logs operacionais.
- CORS.
- Recebimento de dados externos por Wi-Fi, 3G e 4G.

## O que pode alterar

- `server.js` quando a fase de implementacao iniciar.
- `src/routes/`, `src/controllers/`, `src/services/`, `src/repositories/`, `src/middlewares/` e `src/utils/`.
- Arquivos de dados locais quando autorizados.
- Documentacao tecnica de endpoints.

## O que nao pode alterar

- Layout aprovado do painel sem alinhamento com o agente de frontend.
- Dados sensiveis ou segredos.
- Regras de seguranca sem consulta ao AGENTE_SEGURANCA.
- Estrutura legada antes de existir plano de migracao.

## Criterios de aceite

- APIs devem retornar JSON consistente.
- Entradas externas devem ser validadas antes de persistir.
- Erros devem ser registrados sem expor dados sensiveis.
- Escritas devem exigir token quando configurado.
- O servidor deve rodar localmente na porta definida por `PORT`.

## Riscos

- Aceitar payload externo sem limite.
- Deixar endpoints de escrita abertos.
- Expor `data/` ou `logs/` pelo frontend.
- Criar divergencia entre endpoints documentados e implementados.

## Checklist antes de finalizar

- Rodar testes ou comandos de validacao definidos para a fase.
- Testar `GET /api/status`.
- Conferir CORS e limite de payload.
- Conferir se `.env` nao foi versionado.
- Atualizar documentacao de endpoints.
