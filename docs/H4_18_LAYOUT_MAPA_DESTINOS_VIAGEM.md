# H4.18 - Layout, mapa, destinos e horário da consulta

## Correções aplicadas

- Aplicado tema visual inspirado no layout Andrade/AGS: topbar azul-cinza, menu lateral claro, cartões compactos e tabelas mais limpas.
- Corrigido cadastro de destinos na API: `destinos` agora é coleção permitida e possui criação própria.
- API cria a tabela `destinos` automaticamente se ela ainda não existir na homologação.
- Tela de criar viagem agora possui campo **Horário da consulta**.
- Listas de viagens e agenda exibem data + horário da consulta quando informado.
- Mapa Leaflet revalida tamanho ao trocar de aba/tela, corrigindo o mapa branco/cortado quando inicializado em área oculta.
- Centro padrão do mapa ajustado para região de São José do Sul/RS quando ainda não há GPS dos veículos.

## Arquivos alterados

- `public/assets/css/painel-acesso.css`
- `public/assets/css/mapas.css`
- `public/assets/js/live-map.js`
- `public/assets/js/operador-dashboard.js`
- `public/operador.html`
- `api/src/ApiService.php`
- `docs/H4_18_LAYOUT_MAPA_DESTINOS_VIAGEM.md`

## Validação esperada

1. Entrar no painel operador.
2. Menu lateral deve ficar claro, topbar azul-cinza e cards compactos.
3. Abrir **Mapa / Rastreamento** e confirmar que o mapa aparece mesmo sem GPS.
4. Cadastrar destino em **Cadastros > Novo destino**.
5. Criar viagem preenchendo data e horário da consulta.
6. Confirmar que a agenda mostra a data e o horário da consulta.
