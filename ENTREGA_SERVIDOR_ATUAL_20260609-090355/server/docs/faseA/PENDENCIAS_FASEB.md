# Pendencias para Fase B

## App Motorista/PWA

- Implementar leitura real do QR Code no app.
- Validar `type` e `version` do payload antes de chamar a API.
- Salvar `base_url`, `motorista.id` e `device.id` no armazenamento local seguro do dispositivo.
- Criar fluxo visual de sucesso e falha de pareamento.

## Sessao e seguranca

- Definir se o pareamento gera uma sessao curta ou um token operacional separado.
- Implementar revogacao de dispositivo no painel.
- Implementar listagem de dispositivos por motorista.
- Preparar politica para troca de aparelho.

## QR Code

- Substituir o renderer local simples por uma biblioteca QR Code completa caso a leitura real exija compatibilidade universal de camera.
- Manter a biblioteca local, sem dependencia de servico externo.

## Operacao

- Mostrar no cadastro do motorista se ja existe dispositivo ativo.
- Adicionar botao `Desvincular App`.
- Exibir `last_seen_at` do aparelho no painel.

## Auditoria

- Adicionar filtros no painel para eventos:
  - `DRIVER_APP_PAIRING_CREATED`;
  - `DRIVER_APP_PAIRING_CONFIRMED`;
  - `DRIVER_APP_PAIRING_EXPIRED`;
  - `DRIVER_APP_PAIRING_CANCELLED`.

## Infraestrutura

- Validar acesso pelo IP real do servidor Linux na rede.
- Validar HTTPS antes de expor o pareamento fora da rede local.
- Revisar `API_TOKEN` em ambiente de producao para rotas de escrita.
