# Emergencias - Fase 8

## Tela

```text
/painel-logistico/emergencias
```

## APIs

- `GET /api/emergencias`
- `POST /api/emergencias/:id/atender`
- `POST /api/emergencias/:id/finalizar`

## Central

A central mostra:

- alerta vermelho
- som configuravel
- cronometro
- veiculo
- motorista
- telefone
- GPS
- tipo
- status
- responsavel

## Protocolo

O operador pode registrar:

- motorista contatado
- suporte acionado
- ambulancia reserva
- veiculo reserva
- ocorrencia resolvida
- encerramento

Cada acao gera auditoria.
