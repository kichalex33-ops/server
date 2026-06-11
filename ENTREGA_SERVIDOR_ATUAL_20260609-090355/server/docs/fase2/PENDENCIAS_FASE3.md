# Pendencias para Fase 3

## Sala de Situacao

- Consolidar tela operacional com dados reais em primeiro plano.
- Separar melhor estados reais e simulados.
- Criar visao de alertas ativos por prioridade.

## GPS e mapa

- Melhorar historico de rota real.
- Diferenciar ultima localizacao real da rota demonstrativa.
- Criar filtros por viagem e veiculo.
- Manter fallback quando Leaflet ou internet falharem.

## Atualizacao operacional

- Avaliar WebSocket apenas em fase futura, nao nesta.
- Por enquanto, polling de 5 segundos atende teste local.

## App motorista

- Definir contrato completo do app.
- Implementar idempotencia com `clientEventId`.
- Registrar fila offline-first.
- Testar aparelho real em Wi-Fi e 3G/4G.

## Seguranca

- Configurar `API_TOKEN` para testes externos.
- Preparar Cloudflare Tunnel.
- Revisar CORS fora do ambiente local.
- Planejar HTTPS real.

## Persistencia

- JSON atende teste local.
- Fase futura deve avaliar SQLite ou banco real.
