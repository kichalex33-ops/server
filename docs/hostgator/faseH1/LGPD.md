# Privacidade e Proteção de Dados (LGPD)

O Painel Logístico lida com dados sensíveis de pacientes e cidadãos. A migração para MySQL na HostGator deve seguir diretrizes rígidas de segurança.

## Princípios Aplicados

### 1. Minimização de Dados
- Armazenar apenas o necessário para a operação logística.
- Dados de saúde detalhados (diagnósticos, prontuários) **não devem** ser migrados para este banco; apenas informações de deslocamento e necessidade especial (ex: cadeirante).

### 2. Controle de Acesso
- O uso de tabelas de `perfis` e `usuario_perfis` garante que apenas operadores autorizados vejam dados de pacientes.
- Motoristas têm acesso restrito via aplicativo apenas aos pacientes da sua viagem atual.

### 3. Mascaramento e Anonimização
- Recomenda-se que, em futuras fases, relatórios públicos ou dashboards de gestão utilizem nomes mascarados (ex: `João S***`).

### 4. Rastro de Auditoria
- A tabela `audit_logs` registrará quem acessou ou modificou dados sensíveis, garantindo a rastreabilidade exigida pela LGPD.

### 5. Segurança na HostGator
- O banco de dados MySQL deve ser configurado para **não aceitar conexões externas** (Remote MySQL), permitindo apenas conexões vindas do próprio servidor (localhost).
- Senhas de usuários do banco devem ser trocadas periodicamente.
