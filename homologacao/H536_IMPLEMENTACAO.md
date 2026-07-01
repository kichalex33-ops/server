# H5.36 — Complementos de escopo e gate de banco

## Escopo desta versão

A H5.36 é uma versão incremental sobre a H5.35. Ela não altera interface pública nem banco por padrão. O objetivo é fechar duas lacunas de governança técnica detectadas após a análise funcional:

1. Registrar formalmente a confirmação prévia ao paciente por WhatsApp/SMS como backlog futuro.
2. Criar um gate obrigatório de teste de migrations em staging antes de qualquer ZIP final que altere schema.

## Arquivos adicionados

- `BACKLOG_H536_COMPLEMENTOS.md`
- `MIGRATION_STAGING_CHECKLIST_H536.md`
- `.env.staging.example`
- `scripts/validate-migrations-staging.php`
- `H536_IMPLEMENTACAO.md`
- `H536_AUDITORIA_FINAL.md`

## Segurança adicional

O `.htaccess` da raiz foi reforçado para bloquear acesso direto a arquivos `.md`, evitando exposição pública dos documentos técnicos se a pasta raiz for servida pelo Apache.

## O que não foi implementado nesta versão

- Envio real de WhatsApp/SMS.
- Integração com provedor externo.
- Nova migration para comunicação com paciente.
- Mudança em telas, endpoints ou banco.

Essa decisão é intencional: a confirmação por mensagem depende de provedor, custo, consentimento LGPD e política municipal de comunicação. Colocar envio real sem essas decisões seria criar risco operacional e jurídico.

## Uso do validador de migrations

Copie `.env.staging.example` para `.env.staging`, preencha com banco de teste e execute:

```bash
php scripts/validate-migrations-staging.php --env=.env.staging
```

O script se recusa a rodar se `APP_ENV=production` ou se não houver confirmação clara de ambiente de teste.
