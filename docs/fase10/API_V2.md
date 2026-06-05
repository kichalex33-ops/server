# API v2

## Objetivo

Planejar API versionada sem quebrar a API atual.

## Padroes futuros

- Prefixo `/api/v2`.
- Resposta padronizada com `ok`, `data`, `meta` e `error`.
- Erros com `code`, `message` e `details`.
- Autenticacao por usuario/token.
- Paginacao.
- Filtros por data, motorista, veiculo, destino e status.
- Ordenacao.
- Auditoria por usuario.
- Compatibilidade com app motorista e painel web.
- Contrato para app supervisor.

## Regra de compatibilidade

Manter `/api/*` atual ate app e painel migrarem com testes.
