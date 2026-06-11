# Teste de Conectividade Real

## Wi-Fi local

```bash
curl http://IP_DO_SERVIDOR:3000/api/status
```

## Dominio externo

```bash
curl https://painellogistico.seudominio.com.br/api/status
```

## Envio de GPS

```bash
curl -X POST https://painellogistico.seudominio.com.br/api/gps \
  -H "Content-Type: application/json" \
  -d "{\"viagem_id\":\"VIA-SJS-0001\",\"latitude\":-29.5448,\"longitude\":-51.4827,\"velocidade\":42}"
```

## Envio de evento

```bash
curl -X POST https://painellogistico.seudominio.com.br/api/driver/events \
  -H "Content-Type: application/json" \
  -d "{\"viagem_id\":\"VIA-SJS-0001\",\"tipo\":\"TESTE\",\"descricao\":\"Evento real de conectividade\"}"
```

## Criterio

O teste so e valido se for feito fora da rede local, usando 3G/4G/5G.
