# Testes da Fase B

## Testes automatizados

Rodar:

```bash
node --test tests/faseBDriverPwa.test.js
npm test
```

Valida:

- `/motorista` responde HTML;
- manifest PWA esta disponivel;
- service worker esta disponivel;
- helper IndexedDB esta disponivel;
- funcoes de pareamento, GPS e sync existem no JS.

## Teste manual em desktop

1. Rodar:

```bash
npm start
```

2. Abrir:

```text
http://localhost:3000/motorista
```

3. Confirmar que aparece a tela de pareamento.

## Teste manual em celular

1. Certificar que celular e servidor estao na mesma rede.
2. Abrir:

```text
http://10.0.0.4:3000/motorista
```

3. No Chrome Android, usar `Adicionar a tela inicial`.
4. Abrir o PWA instalado.

## Pareamento manual

1. Abrir o Painel Operador:

```text
http://10.0.0.4:3000/painel-logistico/operador
```

2. Ir em Motoristas.
3. Clicar em `Gerar QR do App`.
4. Copiar o payload JSON exibido.
5. Colar em `/motorista`.
6. Clicar em `Confirmar Pareamento`.

Resultado esperado:

- motorista aparece no dashboard;
- viagens sao buscadas;
- configuracao fica salva no dispositivo.

## Teste offline

1. Parear o PWA.
2. Abrir uma viagem.
3. Desativar internet.
4. Registrar checklist, KM, passageiro, ocorrencia e panico.
5. Confirmar que pendencias aumentam.
6. Reativar internet.
7. Clicar em `Sincronizar agora`.
8. Confirmar que pendencias reduzem.

## Teste de GPS

1. Permitir localizacao no navegador.
2. Abrir uma viagem.
3. Aguardar envio automatico.
4. Conferir no painel ou API:

```bash
curl http://localhost:3000/api/driver/locations
```

## Pontos de falha esperados

- GPS bloqueado pelo navegador.
- PWA sem HTTPS em ambiente externo.
- Payload de QR expirado.
- Servidor inacessivel por IP errado.
- Pendencias mantidas em `erro` ate nova sincronizacao.
