# Monitoramento de Recursos

## Endpoint criado

`GET /api/infra/resources`

## Retorno

- Uptime.
- Ambiente.
- Versao Node.js.
- Memoria usada.
- Tamanho aproximado do JSON.
- Numero de viagens.
- Numero de localizacoes GPS.
- Alertas abertos.
- Falhas de sincronizacao.
- Ultimo backup.
- Status de IA opcional.

## Privacidade

O endpoint nao retorna pacientes, CPFs, telefones, coordenadas individuais ou tokens.

## Uso

```bash
curl http://10.0.0.4:3000/api/infra/resources
```
