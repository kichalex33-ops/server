# H4.11 - Correcoes da revisao de homologacao

Correcoes aplicadas apos a revisao:

- prefixo de destino alterado de `des-` para `dst-`, evitando ambiguidade com despesas;
- validacao de tipo e tamanho dos campos no frontend e na API;
- normalizacao de cidade, telefone e observacoes vazias;
- bloqueio de destino duplicado pelo mesmo nome e endereco;
- lista e contador de destinos adicionados ao Painel Operador;
- guias principais atualizados com a migration `002_destinos.sql`;
- tipo de `metadados` alinhado ao restante do banco (`TEXT`);
- checklist de homologacao adicionado ao documento H4.11.

Os endpoints de edicao e exclusao continuam fora deste pacote. O escopo corrigido permite cadastrar, consultar e usar destinos nas viagens sem duplicacao acidental.
