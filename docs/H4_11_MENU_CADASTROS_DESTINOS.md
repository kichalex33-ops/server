# H4.11 - Menu, layout e cadastro de destinos

## O que mudou

- menu do operador reorganizado por Principal, Cadastros, Consulta e Atalhos;
- atalhos visuais para nova viagem, novo paciente, novo destino e novo veiculo;
- formularios separados em secoes identificadas e responsivas;
- cadastro persistente de destinos;
- destinos cadastrados aparecem como sugestoes nos campos Origem e Destino da viagem;
- menu lateral movel mantido com abertura pelo botao de menu.

## Atualizacao do banco existente

Antes de usar o cadastro de destinos, execute no MySQL:

`db/migrations/002_destinos.sql`

Em uma instalacao nova, execute primeiro `001_php_hostgator_core.sql` e depois `002_destinos.sql`.

## Arquivos principais alterados

- `public/operador.html`
- `public/assets/css/painel-acesso.css`
- `public/assets/js/operador-dashboard.js`
- `api/index.php`
- `api/src/ApiService.php`
- `api/src/Rbac.php`
- `db/migrations/002_destinos.sql`

## Validacao esperada

1. Executar `001_php_hostgator_core.sql` e depois `002_destinos.sql`.
2. Entrar com perfil OPERADOR.
3. Confirmar que o menu mostra viagem, paciente, destino, veiculo e passageiro.
4. Cadastrar um destino e confirmar que ele aparece em Destinos cadastrados.
5. Tentar cadastrar novamente o mesmo nome e endereco e confirmar a mensagem de duplicidade.
6. Criar uma viagem usando o destino salvo na lista de sugestoes.
7. Confirmar que os cadastros anteriores de motorista, veiculo, paciente e passageiro continuam funcionando.
8. Repetir a navegacao em tela de celular e confirmar abertura e fechamento do menu lateral.
