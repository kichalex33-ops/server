# H4.9 - Restauração Operador, CSS e CRUD

## Objetivo
Corrigir regressão do pacote atual em que:
- o CSS principal foi substituído por um remendo parcial;
- o portal ficou sem aparência;
- o painel operador ficou sem menu adequado;
- o operador perdeu telas de cadastro de veículo, paciente, viagem e passageiro;
- o JavaScript travava quando a sessão/API falhava;
- o perfil gestor usava `GESTAO` no HTML em vez de `GESTOR`.

## Arquivos incluídos no patch
- `public/portal.html`
- `public/operador.html`
- `public/assets/css/painel-acesso.css`
- `public/assets/js/operador-dashboard.js`
- `public/assets/js/charts/dashboard-charts.js`
- `public/assets/js/portal.js`
- `public/assets/js/auth-client.js`
- `api/index.php`
- `api/src/ApiService.php`
- `api/src/Rbac.php`

## Validação esperada
Após extrair este patch dentro de `/public_html/homologacao`:

1. `https://agsap.com.br/homologacao/`
   - deve carregar com layout visual correto;
   - cards de operador e gestão devem aparecer estilizados.

2. `https://agsap.com.br/homologacao/painel-logistico/operador`
   - deve mostrar menu lateral;
   - deve mostrar Mapa Operacional;
   - deve permitir cadastrar motorista;
   - deve gerar QR Code;
   - deve permitir cadastrar veículo;
   - deve permitir cadastrar paciente;
   - deve permitir criar viagem;
   - deve permitir adicionar passageiro à viagem.

3. `https://agsap.com.br/homologacao/api/status`
   - deve responder JSON com `ok: true`.

## Observação
Este patch não contém `.env` e não altera credenciais do banco.
