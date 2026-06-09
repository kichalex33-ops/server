# Homologação Fase C

## Testes automatizados

```bash
npm test
```

Inclui validação de:

- health check;
- páginas de saúde e sincronização;
- fila de sincronização;
- reenvio manual;
- watchdog;
- middleware de segurança;
- backup diário/semanal.

## Testes manuais obrigatórios

- Instalação do PWA em Android.
- QR Code em câmera real.
- GPS em Wi-Fi.
- GPS em 4G.
- Queda e retorno de internet.
- Acesso externo seguro ao servidor.

## Bloqueadores para piloto aberto

- Ausência de HTTPS público.
- CORS e token precisam estar definidos no `.env`.
- Teste 4G depende de rede externa real.
