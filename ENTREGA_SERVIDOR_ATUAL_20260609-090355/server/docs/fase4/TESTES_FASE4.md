# Testes da Fase 4

## Automatizados

Arquivo:

`tests/fase4GpsMap.test.js`

Cobertura:

- GPS recebido com sucesso.
- Validacao de coordenadas.
- Validacao de viagem existente.
- Persistencia de historico.
- Registro de evento e sync log.
- Geracao de alerta de velocidade.
- Retorno de `/api/live-map`.
- Retorno de `/api/viagens/:id/trajeto`.
- Entrega da pagina `/painel-logistico/sala-situacao`.

## Comando

```bash
npm test
```

## Validacao manual recomendada

1. Iniciar o servidor com `npm start`.
2. Abrir `http://localhost:3000/painel-logistico/sala-situacao`.
3. Enviar um `POST /api/gps`.
4. Confirmar marcador no mapa, feed, alerta e atualizacao em ate 5 segundos.
