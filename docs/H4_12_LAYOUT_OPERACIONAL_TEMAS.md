# H4.12 - Layout operacional, telas e temas

## Painel Operador

- novo layout inspirado nas referencias fornecidas;
- modo Normal claro e modo Escuro com preferencia salva no navegador;
- navegacao interna em Visao Geral, Viagens, Cadastros e Motoristas/Frota;
- Painel Gestor removido do menu do Operador;
- validacao de perfil no frontend e RBAC preservado na API;
- tela de Viagens reune motorista, veiculo, origem, destino, paciente e acompanhante;
- tela Cadastros concentra pacientes e destinos;
- Motoristas e Frota possui abas separadas;
- frota exige placa, modelo e quantidade de lugares e lista os veiculos cadastrados;
- layout responsivo para computador, tablet e celular.
- tela inicial simplificada com apenas Viagens de hoje e Viagens da semana ja marcadas;
- mapa, monitoramento e indicadores abrem em tela propria pelo menu.

## Separacao de acesso

- OPERADOR acessa somente o Painel Operador;
- GESTOR acessa somente o Painel Gestor;
- o login continua separado por perfil no portal;
- tentativas de abrir o painel incorreto redirecionam para a tela de acesso.
