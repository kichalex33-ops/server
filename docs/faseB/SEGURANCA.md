# Seguranca Basica

## Classificacao geral

**MEDIO**

Motivo: a plataforma esta adequada para teste local controlado, mas ainda precisa endurecimento antes de exposicao publica/4G externo.

## Itens

| Item | Status | Risco | Observacao |
|---|---|---|---|
| Helmet | AUSENTE | MEDIO | Nao instalado nesta fase para evitar mudanca funcional sem teste de navegador. |
| Rate limit | AUSENTE | MEDIO | Recomendado antes de expor porta 3000. |
| CORS | PARCIAL | MEDIO | `CORS_ORIGIN` deve ser definido em producao. |
| API_TOKEN | PARCIAL | ALTO se vazio | Escritas exigem token quando `API_TOKEN` esta configurado. |
| Payload limit | APROVADO | BAIXO | `express.json({ limit: "1mb" })`. |
| QR token hash | APROVADO | BAIXO | Fase A salva apenas hash SHA-256. |
| Service worker | APROVADO | BAIXO | Nao cacheia `/api/*`. |
| Dados sensiveis no PWA | PARCIAL | MEDIO | Nao salva senha/CPF/CNS, mas dados operacionais ficam no IndexedDB. |
| HTTPS | AUSENTE | ALTO para internet | Obrigatorio antes de piloto 4G externo. |

## Endpoints criticos

- `POST /api/operator/drivers/:motoristaId/pairing`
- `POST /api/driver/pairing/confirm`
- `POST /api/driver/panic`
- `POST /api/driver/locations`
- `POST /api/driver/sync`
- `POST /api/panico`

## Recomendacoes antes do piloto real

1. Configurar `API_TOKEN`.
2. Definir `CORS_ORIGIN`.
3. Publicar via HTTPS.
4. Adicionar Helmet.
5. Adicionar rate limit.
6. Validar firewall e porta 3000.
7. Evitar console/log com dados pessoais.
