# Estrutura do Banco de Dados (HostGator)

O banco de dados foi projetado para suportar a operação logística completa com integridade referencial.

## Tabelas e Propósitos

### 1. Núcleo (Core)
- `usuarios`: Cadastro de usuários administrativos para o Painel Web.
- `perfis`: Níveis de acesso (Super Admin, Gestor, Operador, Motorista).
- `usuario_perfis`: Vínculo N:N para permissões granulares.

### 2. Cadastros Base
- `motoristas`: Dados dos colaboradores e credenciais para o Aplicativo.
- `veiculos`: Frota gerenciada (prefixos, placas, capacidades).
- `pacientes`: Cadastro de cidadãos transportados (pacientes e acompanhantes).
- `estabelecimentos`: Destinos frequentes (Hospitais, UBS, Clínicas).

### 3. Operação (Logistic)
- `viagens`: O registro mestre de cada missão.
- `passageiros`: Vínculo detalhado de quem está em cada viagem.
- `localizacoes`: Histórico de trilha GPS.
- `eventos`: Log cronológico de ações (Timeline).
- `alertas`: Notificações em tempo real.

### 4. Gestão e Suporte
- `ocorrencias`: Panicos e incidentes em rota.
- `checklists`: Vistorias obrigatórias.
- `despesas`: Lançamentos financeiros em viagem.
- `driver_pairings`: Gestão de QR Code e pareamento inicial.
- `driver_devices`: Controle de hardware conectado.

### 5. Sistema
- `sync_queue`: Fila para processamento assíncrono.
- `audit_logs`: Rastro de auditoria para conformidade.
- `configuracoes`: Chave/Valor para parâmetros do sistema.

## Decisões Técnicas
- **Engine:** InnoDB (Suporte a transações e foreign keys).
- **Charset:** `utf8mb4_unicode_ci` (Suporte a nomes complexos e emojis).
- **Decimal:** Utilizado para KM e Valores Financeiros para evitar erros de ponto flutuante.
