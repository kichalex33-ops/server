# Plataforma Logística H5.34 — Implementação direta

Correções aplicadas sobre H5.33:

- Senha/código de motorista não é mais revelado; o endpoint antigo agora rotaciona e gera novo código expirável.
- Código de ativação do motorista passa a ser de uso único, com expiração e revogação dos demais códigos pendentes após ativação.
- Tela de Segurança Operacional mostra tentativas de login, falhas recentes, bloqueios por força bruta e botão de backup protegido.
- Endpoint de backup protegido por perfil Gestor/Admin com retenção de 30 dias.
- Tela Privacidade/LGPD adicionada ao menu gestor, com consentimentos, solicitações e logs de acesso.
- Cancelamento de viagem com motivo obrigatório.
- Reatribuição backend de motorista/veículo em viagem ativa.
- Validação de capacidade do veículo ao vincular passageiro.
- Colunas e alertas de validade da CNH do motorista.
- Correção visual H5.34 para textos escuros em áreas claras no modo escuro.

Atenção: preservar o `.env` real do servidor ao substituir a pasta.

## Migration incluída

Arquivo: `db/migrations/011_h534_seguranca_lgpd_operacao.sql`

Use no banco real se alguma coluna/tabela não for criada automaticamente pelo backend.
