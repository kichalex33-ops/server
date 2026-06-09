# Teste de Rede Externa 4G

## Cenario previsto

```text
Servidor Linux
-> Internet cabeada
-> Celular usando apenas 4G
```

## IP utilizado

Ambiente local informado:

```text
10.0.0.4:3000
```

Observacao: `10.0.0.4` e IP de rede local. Para teste 4G real fora do Wi-Fi sera necessario IP publico, VPN, tunel seguro ou dominio apontando para o servidor.

## Itens

| Item | Status | Observacao |
|---|---|---|
| Acesso ao sistema por Wi-Fi local | PARCIAL | URL prevista: `http://10.0.0.4:3000`. |
| Acesso ao sistema por 4G externo | REPROVADO | Nao ha evidencia de IP publico/roteamento externo nesta maquina. |
| Pareamento por 4G | PARCIAL | Depende do acesso externo ao servidor. |
| Sincronizacao por 4G | PARCIAL | Depende do acesso externo ao servidor. |
| GPS por 4G | PARCIAL | Depende do teste em aparelho real. |
| APIs por 4G | PARCIAL | Depende do acesso externo ao servidor. |

## Latencia

Nao medida nesta execucao. Medir no ambiente real:

```bash
ping DOMINIO_OU_IP_PUBLICO
curl -w "%{time_total}\n" http://DOMINIO_OU_IP_PUBLICO:3000/api/system/health
```

## Problemas encontrados

- IP atual `10.0.0.4` nao e roteavel pela internet publica.
- Exposicao direta da porta 3000 sem HTTPS nao e recomendada.
- Antes do piloto 4G, configurar HTTPS, firewall e origem CORS.

## Resultado geral

**REPROVADO para 4G externo ate existir URL publica segura.**
