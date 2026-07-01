# Plataforma Logística — LogiSaúde (Server PHP/HostGator)

Servidor **PHP 8 + MySQL** para hospedagem compartilhada (HostGator), sem bundler
e sem etapa de build. Frontend estático + backend PHP puro.

> 📐 **Novo no projeto? Comece por [`ARCHITECTURE.md`](ARCHITECTURE.md).**
> Ele explica os dois frontends (painéis modulares × app do motorista), a ordem
> da cascata de CSS, o fluxo de requisição e as pegadinhas não óbvias.

## Estrutura do repositório

```
api/            Backend PHP (entrada: api/index.php) — router, auth/JWT, serviços
db/migrations/  Migrações MySQL versionadas (001 → 015), aplicar em ordem
public/         Frontend estático
  ├── *.html            Páginas dos painéis (gestor, operador, sala, etc.)
  ├── js/               App modular (loader app.js + core/ + modules/)
  ├── assets/           css/, js/, img/ (inclui camada legada usada pelo motorista)
  └── motorista/        PWA do motorista (loader próprio, legado)
storage/        cache/ logs/ backups/ uploads/ (conteúdo ignorado pelo Git)
scripts/        Utilitários (ex.: validação de migrações)
docs/           Documentação; docs/auditorias/ = histórico de auditorias H3–H549
```

## Rotas dos painéis

- `/painel-logistico`
- `/painel-logistico/operador`
- `/painel-logistico/gestao`

## Configuração obrigatória

1. Definir `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e `JWT_SECRET`
   (ver `.env.example` / `.env.homologacao.modelo`).
2. Importar as migrações `db/migrations/001..015` **em ordem** no MySQL.
3. Criar usuários reais na tabela `usuarios` — **não há dados de demonstração
   nem senhas fixas no código**.
4. Criar motoristas reais pelo painel do operador (senha usada no app do motorista).

## Homologação

A validação final deve ocorrer em **PHP 8 + MySQL** na HostGator ou ambiente
equivalente. O histórico de homologação está em `docs/auditorias/`.
</content>
