# Arquitetura do Servidor - Fase 1

## Objetivo

Definir a estrutura oficial desejada para a plataforma local em Node.js sem mover arquivos nesta fase.

A base atual PHP e a demo estatica devem continuar servindo como referencia visual e funcional ate a migracao planejada.

## Estado atual

- Raiz atual: `C:\dev\plataforma\app\server`.
- Nao existe servidor Node.js na raiz.
- A versao funcional com API esta em `painel-logistico/` usando PHP/MySQL.
- A pagina visual tambem existe em `DEMO/` como HTML/CSS/JS estatico.

## Estrutura oficial proposta

```text
servidor/
|-- server.js
|-- package.json
|-- .env.example
|-- data/
|-- public/
|   |-- index.html
|   `-- assets/
|       |-- css/
|       |-- js/
|       `-- img/
|-- src/
|   |-- routes/
|   |-- controllers/
|   |-- services/
|   |-- repositories/
|   |-- middlewares/
|   `-- utils/
|-- docs/
`-- README.md
```

## Responsabilidade de cada pasta futura

- `server.js`: ponto de entrada Express, leitura de `.env`, porta, CORS, JSON parser e arquivos estaticos.
- `package.json`: scripts, dependencias e metadados Node.js.
- `data/`: persistencia local inicial em JSON ou SQLite, fora de `public/`.
- `public/`: interface web reaproveitada da pagina aprovada.
- `public/assets/css/`: estilos da interface.
- `public/assets/js/`: JavaScript do painel.
- `public/assets/img/`: logos, brasao e imagens institucionais.
- `src/routes/`: definicao das rotas Express.
- `src/controllers/`: entrada HTTP e montagem de resposta.
- `src/services/`: regras de negocio e orquestracao.
- `src/repositories/`: leitura e escrita em JSON, SQLite ou banco futuro.
- `src/middlewares/`: token, CORS, logs, validacao e tratamento de erro.
- `src/utils/`: funcoes auxiliares.
- `docs/`: inventarios, arquitetura, rede, seguranca e roadmap.

## Plano de organizacao sem mover agora

1. Manter `DEMO/` como referencia visual estatica.
2. Manter `painel-logistico/` como referencia de API PHP e schema.
3. Criar a documentacao da Fase 1.
4. Na Fase 1.1, eleger a pagina-base oficial para `public/`.
5. Na Fase 2, criar o servidor Node.js com Express e persistencia local.
6. Migrar endpoints por prioridade, comparando cada rota Node.js com a rota PHP existente.
7. Somente apos validacao, decidir se `painel-logistico/` vira legado documentado, backup ou referencia removivel.

## Padrao inicial recomendado para Node.js

- JavaScript sem transpilacao na primeira versao.
- Express como framework HTTP.
- `dotenv` para configuracao.
- `cors` configurado por ambiente.
- `helmet` avaliado quando houver exposicao externa.
- Persistencia inicial em SQLite se houver muitas consultas e relatorios.
- Persistencia inicial em JSON apenas para prototipo rapido e baixo volume.

## Escolha preliminar de persistencia

SQLite e a opcao mais indicada para a Fase 2 porque:

- Suporta multiplas entidades relacionadas.
- Ajuda a migrar conceitos do schema MySQL existente.
- Evita varios arquivos JSON concorrentes.
- Facilita consultas para dashboards e relatorios.

JSON ainda pode ser usado para logs simples, fila de sincronizacao local ou configuracoes.

## Politicas de fronteira

- `public/` nunca deve conter `data/`, `logs/`, `.env` ou arquivos de backup.
- Endpoints de escrita devem passar por middleware de token.
- O painel deve consumir apenas `/api/*`.
- Contratos do app motorista devem ficar em `/api/driver/*`.
- A interface aprovada deve ser migrada, nao redesenhada do zero.

## Riscos arquiteturais

- Migrar tudo de uma vez e quebrar a interface.
- Manter PHP e Node.js ativos com dados divergentes.
- Criar estrutura grande demais antes dos endpoints essenciais.
- Expor arquivos locais por engano ao servir estaticos.

## Criterio para avancar para Fase 2

- Inventario concluido.
- Estrutura oficial documentada.
- Endpoints planejados comparados com os existentes.
- Regras minimas de seguranca documentadas.
- `.env.example` e `.gitignore` preparados.
