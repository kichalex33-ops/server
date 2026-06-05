# Rede Linux, Wi-Fi e 4G - Fase 1

## Objetivo

Documentar como o servidor local Node.js devera ser acessado no notebook Linux pela propria maquina, pela rede Wi-Fi e futuramente pela internet.

## Decisao registrada para fases futuras

O projeto devera receber dados de aparelhos fora da rede local, incluindo aparelhos em 3G/4G na rua.

Para esse cenario, sera necessario publicar o servidor por um caminho externo seguro. A opcao preferencial para teste e evolucao inicial e Cloudflare Tunnel, evitando expor diretamente a porta `3000` do notebook na internet.

## Porta padrao

- Porta: `3000`.
- Acesso local: `http://localhost:3000`.
- Acesso pela rede: `http://IP_DO_NOTEBOOK:3000`.

## Descobrir o IP do notebook Linux

Comandos:

```bash
hostname -I
```

```bash
ip addr
```

O IP local normalmente aparece como algo parecido com:

```text
192.168.0.25
192.168.1.34
10.0.0.12
```

## Testar o servidor local

No notebook:

```bash
curl http://localhost:3000/api/status
```

Em outro aparelho na mesma rede Wi-Fi:

```bash
curl http://IP_DO_NOTEBOOK:3000/api/status
```

## Acesso via Wi-Fi local

Para aparelhos na mesma rede:

1. Notebook e aparelho precisam estar conectados ao mesmo Wi-Fi.
2. O servidor Node.js deve escutar em `0.0.0.0`, nao apenas em `localhost`.
3. O firewall do Linux deve permitir a porta `3000`.
4. O app motorista deve apontar para `http://IP_DO_NOTEBOOK:3000`.

## Acesso via cabo e internet

O cabo de internet do notebook nao garante acesso externo automatico. Ele apenas conecta o notebook a uma rede.

Para receber dados de aparelhos fora da rede local, sera necessario uma destas opcoes futuras:

- Cloudflare Tunnel.
- Ngrok.
- Dominio com servidor publicado.
- Redirecionamento de porta no roteador.
- VPN privada.

## IP local x IP publico

- IP local: usado dentro da rede Wi-Fi ou cabo local. Exemplo: `192.168.0.25`.
- IP publico: endereco visto na internet. Pode mudar e pode estar bloqueado pelo provedor.

Um aparelho em 3G/4G nao consegue acessar diretamente `192.168.x.x`, porque esse IP existe apenas dentro da rede local.

## Riscos de expor a porta 3000

- A API pode receber chamadas de desconhecidos.
- Dados pessoais podem ser expostos.
- Token fraco pode ser descoberto.
- Falhas de validacao podem permitir carga indevida.
- Trafego HTTP sem HTTPS pode ser interceptado.

## Recomendacao de seguranca para acesso externo

Antes de publicar para internet:

- Usar HTTPS.
- Configurar `API_TOKEN`.
- Limitar CORS.
- Validar payloads.
- Limitar tamanho de JSON.
- Registrar logs sem dados sensiveis.
- Preferir tunel seguro em vez de abrir porta do roteador.

## Como o app deve apontar para o servidor

Ambiente local no proprio notebook:

```text
http://localhost:3000
```

Aparelho no mesmo Wi-Fi:

```text
http://IP_DO_NOTEBOOK:3000
```

Aparelho em 3G/4G:

```text
https://dominio-ou-tunel-seguro
```

## Checklist de validacao de rede

- Servidor responde em `localhost`.
- Servidor responde no IP local do notebook.
- Aparelho na mesma rede acessa `/api/status`.
- Firewall libera porta `3000`.
- App motorista usa a URL correta do ambiente.
- Acesso externo so e habilitado com token e HTTPS.
