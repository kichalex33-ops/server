# H5.36 — Checklist de teste de migrations em staging

## Antes de rodar

1. Criar uma base MySQL separada para staging.
2. Nunca apontar `.env.staging` para o banco real em uso.
3. Preencher `.env.staging` usando `.env.staging.example` como modelo.
4. Fazer backup do banco atual antes de qualquer teste sobre cópia.

## Teste 1 — Base vazia

```bash
php scripts/validate-migrations-staging.php --env=.env.staging
```

Objetivo: confirmar que todas as migrations criam a estrutura do zero sem erro.

## Teste 2 — Cópia do banco atual

1. Restaurar uma cópia recente do banco real em uma base staging.
2. Apontar `.env.staging` para essa base.
3. Executar:

```bash
php scripts/validate-migrations-staging.php --env=.env.staging
```

Objetivo: confirmar que as migrations novas não quebram dados existentes.

## O que observar

- Nenhuma migration deve falhar.
- Arquivos de reset como `006_reset_homologacao_apenas_gestor.sql` são ignorados pelo validador por segurança, salvo uso explícito de `--allow-destructive` em staging descartável.
- Scripts destrutivos devem ficar isolados e documentados.
- Após rodar, testar no navegador:
  - login;
  - Painel Operador;
  - Painel Gestor;
  - cadastro de motorista;
  - geração de código do app;
  - criação/cancelamento de viagem;
  - vínculo de passageiro;
  - LGPD;
  - Segurança Operacional.

## Resultado esperado

Ao final, gerar uma nota no arquivo de auditoria da versão informando:

- banco usado: staging vazio ou cópia;
- data/hora do teste;
- migrations executadas;
- falhas encontradas;
- correções aplicadas;
- decisão: aprovado ou bloqueado.
