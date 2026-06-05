# Testes de Campo - Fase 7

## Teste local

```bash
npm test
```

## Teste focado do servidor

```bash
node --test tests/fase7DriverApp.test.js
```

## Teste focado do app Flutter

Executar no projeto do app:

```powershell
C:\flutter\bin\flutter.bat test .\modules\logistica\test\driver_api_client_fase7_test.dart
```

## Checklist de campo

- Celular acessa a URL do servidor.
- Login do motorista responde.
- Viagens aparecem para o motorista.
- GPS chega na Sala de Situacao.
- Acoes offline entram na fila.
- Sincronizacao envia pendencias.
- Pânico cria ocorrencia.
- Comprovante fica vinculado a paciente e viagem.
