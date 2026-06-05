# Recebimento Wi-Fi, 3G e 4G - Fase 2

## Servidor local

O servidor escuta em:

```text
0.0.0.0:3000
```

Isso permite acesso pelo proprio notebook e por aparelhos na mesma rede.

## Acesso local

```text
http://localhost:3000
```

## Acesso Wi-Fi

Descobrir IP do notebook Linux:

```bash
hostname -I
ip addr
```

Configurar app ou aparelho de teste:

```text
BASE_URL=http://IP_DO_NOTEBOOK:3000
```

Testar:

```bash
curl http://IP_DO_NOTEBOOK:3000/api/status
```

## Acesso 3G/4G

Um aparelho em 3G/4G nao acessa diretamente IP local `192.168.x.x`.

Para receber dados externos na rua, sera necessario publicar a API por HTTPS. A opcao preferencial registrada e Cloudflare Tunnel.

Exemplo futuro:

```text
BASE_URL=https://painel-logistico.seudominio.com.br
```

## Seguranca antes de expor

- Definir `API_TOKEN`.
- Usar HTTPS.
- Restringir CORS quando houver dominio real.
- Nao abrir porta 3000 diretamente sem necessidade.
- Validar payloads.
- Evitar logs com dados sensiveis.

## Nesta fase

Implementado:

- API preparada para receber chamadas externas.
- Servidor escutando em `0.0.0.0`.
- CORS por `CORS_ORIGIN`.
- Token opcional por `API_TOKEN`.

Nao implementado:

- Cloudflare Tunnel configurado.
- HTTPS real.
- Dominio publico.
