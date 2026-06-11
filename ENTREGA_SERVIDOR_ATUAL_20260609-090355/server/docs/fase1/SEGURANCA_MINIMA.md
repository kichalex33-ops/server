# Seguranca Minima - Fase 1

## Objetivo

Definir a seguranca minima desde o inicio da plataforma local.

Nesta fase, as regras sao documentadas e os arquivos base sao preparados. Middlewares Node.js serao implementados em fase posterior.

## `.env`

O arquivo `.env` deve guardar configuracoes locais e segredos. Ele nao deve ser versionado.

Variaveis iniciais:

```env
PORT=3000
NODE_ENV=development
API_TOKEN=
```

## `API_TOKEN`

Quando configurado, o token deve ser exigido em endpoints de escrita e endpoints do app motorista.

Formas planejadas de envio:

```http
Authorization: Bearer TOKEN
```

ou:

```http
X-API-Token: TOKEN
```

## CORS

Em desenvolvimento, CORS pode ser mais permissivo.

Em acesso externo, deve ser limitado aos dominios realmente usados pelo painel e pelo app.

## Limite de payload

O servidor Node.js deve configurar limite de JSON. Recomendacao inicial:

```js
express.json({ limit: "1mb" })
```

Payloads maiores devem ser rejeitados e registrados em log tecnico.

## Logs

Logs devem registrar:

- Data/hora.
- Metodo.
- Endpoint.
- Status HTTP.
- Origem da chamada quando disponivel.
- Erros tecnicos.

Logs nao devem registrar:

- Token completo.
- Senhas.
- Dados pessoais sem necessidade.
- Conteudo integral de payload sensivel.

## Validacao de entrada

Todo payload externo deve validar:

- Campos obrigatorios.
- Tipos.
- Tamanho de texto.
- Latitude e longitude.
- Vinculo com viagem.
- Status permitido.
- Identificador unico para evitar duplicidade.

## Dados sensiveis e LGPD

A plataforma lida com informacoes de transporte em saude. Deve minimizar dados armazenados e proteger acesso.

Regras iniciais:

- Coletar somente dados necessarios para operacao.
- Evitar documento pessoal quando nao for indispensavel.
- Proteger historico de localizacao.
- Restringir acesso por perfil em fase futura.
- Registrar auditoria de operacoes criticas em fase futura.

## Pastas que nao podem ser publicas

- `.env`.
- `data/`.
- `logs/`.
- `database/`.
- Backups.
- Arquivos de configuracao com segredos.

## `.gitignore`

O `.gitignore` deve conter:

```gitignore
.env
node_modules/
logs/
data/backups/
```

## HTTPS

Para uso local em teste, HTTP pode ser aceito temporariamente.

Para acesso externo por 3G/4G, a recomendacao e HTTPS obrigatorio.

Opcoes futuras:

- Cloudflare Tunnel com HTTPS.
- Ngrok com HTTPS.
- Dominio com proxy HTTPS.
- Servidor publicado com certificado.

## Riscos minimos a monitorar

- Porta 3000 exposta sem protecao.
- Token fraco ou reaproveitado.
- CORS aberto em ambiente publico.
- Logs contendo dados sensiveis.
- Backups dentro da pasta publica.
- Dados de GPS acessiveis sem autenticacao.

## Checklist antes de publicar fora da rede local

- `.env` fora do git.
- `API_TOKEN` definido.
- CORS restrito.
- HTTPS ativo.
- Limite de payload configurado.
- Logs revisados.
- `data/` e `logs/` fora da pasta publica.
- Teste de `/api/status` executado.
