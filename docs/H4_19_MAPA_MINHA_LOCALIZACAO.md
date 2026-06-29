# H4.19 - Mapa com minha localização

## Objetivo

Adicionar ao mapa operacional um botão de localização do operador e abrir o mapa por padrão na cidade/região do operador.

## Arquivos alterados

- `public/assets/js/live-map.js`
- `public/assets/css/mapas.css`

## Alterações

- O mapa agora abre por padrão em São José do Sul / região de Montenegro - RS.
- O mapa tenta obter a localização real do operador via API de geolocalização do navegador.
- Foi adicionado botão `⌖` no mapa para centralizar em "minha localização".
- A localização autorizada fica salva temporariamente no navegador por até 12 horas.
- O mapa não desloca automaticamente para a frota quando a localização do operador está disponível.
- Foram adicionados `invalidateSize()` em eventos de tela/resize para reduzir mapa branco ou cortado quando carregado em aba oculta.

## Observações

A localização do operador depende de HTTPS e permissão do navegador. Em caso de bloqueio da permissão, o mapa usa o centro operacional padrão.
