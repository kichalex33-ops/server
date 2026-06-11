# Testes do Pareamento por QR Code

## Validacao automatizada

Rodar:

```bash
npm install
node --test tests/faseAPairingQr.test.js
npm test
```

Cobertura criada:

- gerar QR para motorista;
- nao expor hash no payload do QR;
- salvar hash do token no servidor;
- confirmar pareamento;
- salvar dispositivo;
- alterar status para `CONFIRMADO`;
- impedir confirmacao duplicada;
- cancelar pareamento;
- impedir confirmacao cancelada;
- impedir token expirado;
- registrar auditoria.

## Teste manual no painel

1. Iniciar o servidor:

```bash
npm start
```

2. Abrir:

```text
http://localhost:3000/painel-logistico/operador
```

3. Ir ate `Cadastros -> Motoristas`.
4. Clicar em `Gerar QR do App`.
5. Conferir se o modal abre com:

- nome do motorista;
- QR/payload;
- expiracao;
- status `Aguardando leitura do app`.

## Simular confirmacao do app por curl

Copiar `pairing_id` e `pairing_token` exibidos no modal e executar:

```bash
curl -X POST http://localhost:3000/api/driver/pairing/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "pairing_id": "ID_GERADO",
    "pairing_token": "TOKEN_GERADO",
    "device": {
      "device_id": "teste-device-001",
      "device_name": "Celular Teste",
      "platform": "android",
      "app_version": "1.0.0"
    }
  }'
```

Resultado esperado:

```json
{
  "ok": true,
  "message": "Dispositivo pareado com sucesso"
}
```

No painel, o polling deve atualizar o status para:

```text
App pareado com sucesso
```

## Teste de cancelamento

1. Gerar novo QR.
2. Clicar em `Cancelar pareamento`.
3. Tentar confirmar com curl.
4. Esperado: HTTP `409`.

## Teste de expiracao

1. Gerar QR.
2. Aguardar 10 minutos.
3. Tentar confirmar com curl.
4. Esperado: HTTP `410`.

## APIs antigas

Apos os testes de pareamento, validar que as rotas antigas continuam respondendo:

```bash
curl http://localhost:3000/api/status
curl http://localhost:3000/api/driver/trips?motorista_id=mot-001
curl http://localhost:3000/api/driver/notices
```
