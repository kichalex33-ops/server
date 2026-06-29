# H4.21 - IA operacional/gerencial, rotas, clima e exclusão de motorista

## Alterações

- Adicionado botão **Enviar pergunta** nos painéis Operador e Gestor.
- Adicionadas ações de IA para estatísticas, rotas, clima e sinais de lentidão.
- A análise de rotas usa dados internos de viagens/localizações e previsão do tempo por Open-Meteo quando cURL estiver disponível.
- A IA não inventa trânsito em tempo real; lentidão é inferida por GPS/velocidade quando disponível.
- Adicionada exclusão lógica de motorista no painel operador.
- Motorista excluído deixa de aparecer, não gera QR e não acessa o app.
- Bloqueio de exclusão quando o motorista tem viagem ativa/pendente.
- Cache busting atualizado para `v=h421`.

## Arquivos alterados

- `public/portal.html`
- `public/operador.html`
- `public/gestao.html`
- `public/assets/css/painel-acesso.css`
- `public/assets/js/operador-dashboard.js`
- `public/assets/js/gestao.js`
- `api/index.php`
- `api/src/AiService.php`
- `api/src/ApiService.php`

## Validação

1. Entrar no operador e abrir IA Operacional.
2. Digitar pergunta e clicar em Enviar pergunta.
3. Testar Estatísticas, Rotas/Trânsito/Lentidão e Previsão do tempo.
4. Abrir gestor e testar IA Gerencial.
5. Excluir motorista sem viagem ativa.
6. Confirmar que motorista excluído não aparece nem gera QR.
