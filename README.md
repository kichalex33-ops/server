# Plataforma Territorial Epidemiologica - Servidor Local

Servidor Node.js/Express para receber dados dos apps dos ACEs e expor dois ambientes web:

- `/painel`: Painel Operacional somente leitura.
- `/comando`: Comando Central administrativo com edicao auditada.

## Modo local

Os dados ficam em `data/server-data.json`, com escrita atomica.

Para proteger o Comando Central, crie um arquivo `.env`:

```env
COMANDO_SENHA=troque-esta-senha
PORT=3000
```

Se `COMANDO_SENHA` nao existir, a senha local temporaria sera `admin123`.

## Executar

```bash
npm install
node server.js
```

## Rotas principais

- `GET /api/status`
- `GET /api/dashboard`
- `GET /api/painel/dashboard`
- `GET /api/comando/dashboard`
- `GET /api/comando/auditoria`

Todo `PATCH /api/comando/*/:id` exige `usuario_id`, `justificativa` e senha local.
