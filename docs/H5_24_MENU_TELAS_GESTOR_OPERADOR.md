# H5.24 - Menu com telas reais para Gestor e Operador

Correções aplicadas:

- Removidos os scripts conflitantes h522/h523 que reconstruíam menus e causavam navegação confusa.
- Criado `public/assets/js/h524-menu-router.js` como controlador único de menus.
- Criado `public/assets/css/h524-menu-router.css` para padronizar ícones e visibilidade.
- Painel Gestor: cada item do menu aponta para uma página HTML própria (`gestao-*.html`).
- Painel Gestor: cada página usa `data-manager-screen` e mostra apenas os blocos da tela correspondente.
- Painel Operador: menu ampliado com Criar Viagem, Pacientes, Destinos e Passageiros.
- Criadas páginas do operador: `operador-criar-viagem.html`, `operador-pacientes.html`, `operador-destinos.html`, `operador-passageiros.html`.
- Mantido padrão de ZIP com pasta raiz `homologacao/`.
