# Cadastro de Motoristas no Painel Operador

## Objetivo

Permitir que o operador logístico cadastre e edite motoristas diretamente no Painel Operador, preservando o pareamento QR do App Motorista.

## Tela

Arquivo principal:

- `public/operador.html`

Na seção `#motoristas`, o painel exibe:

- botão `Novo Motorista`;
- tabela com nome, telefone, CNH, categoria, validade, status, app pareado e ações;
- ação `Gerar QR do App`;
- ação `Editar`.

## Campos do formulário

- nome;
- CPF;
- telefone;
- CNH;
- categoria CNH;
- validade CNH;
- status;
- observações.

## Validações

Obrigatórios:

- nome;
- telefone;
- status.

Opcionais:

- CPF;
- CNH;
- categoria CNH;
- validade CNH;
- observações.

## Endpoints

### Listar

`GET /api/motoristas`

Retorna `data.motoristas`, incluindo `app_pareado` e `dispositivo_app` quando houver dispositivo vinculado.

### Criar

`POST /api/motoristas`

Payload:

```json
{
  "nome": "",
  "cpf": "",
  "telefone": "",
  "cnh": "",
  "categoria_cnh": "",
  "validade_cnh": "",
  "status": "ativo",
  "observacoes": ""
}
```

### Editar

`PUT /api/motoristas/:id`

Usa o mesmo payload do cadastro.

## Pareamento QR

O botão `Gerar QR do App` continua usando:

- `POST /api/operator/drivers/:id/pairing`
- `GET /api/operator/pairings/:id/status`
- `POST /api/operator/pairings/:id/cancel`

O cadastro de motoristas não remove nem altera o fluxo de pareamento existente.

## Teste manual recomendado

1. Abrir `/painel-logistico/operador`.
2. Ir até `Cadastros -> Motoristas`.
3. Clicar em `Novo Motorista`.
4. Preencher nome, telefone e status.
5. Salvar.
6. Confirmar mensagem de sucesso.
7. Confirmar novo motorista na tabela.
8. Clicar em `Gerar QR do App`.
9. Editar o motorista.
10. Confirmar atualização na tabela.
