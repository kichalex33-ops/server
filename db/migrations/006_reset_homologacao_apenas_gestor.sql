-- ATENCAO: esta migration limpa os dados operacionais da homologacao.
-- Use somente na base de homologacao. Nao rode em producao.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE operador_app_credenciais;
TRUNCATE TABLE refresh_tokens;
TRUNCATE TABLE motorista_activation_codes;
TRUNCATE TABLE motorista_qr_tokens;
TRUNCATE TABLE qr_tokens;
TRUNCATE TABLE lgpd_consents;
TRUNCATE TABLE data_access_logs;
TRUNCATE TABLE data_privacy_requests;
TRUNCATE TABLE operational_logs;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE localizacoes;
TRUNCATE TABLE checklists;
TRUNCATE TABLE comprovantes;
TRUNCATE TABLE avisos;
TRUNCATE TABLE mensagens;
TRUNCATE TABLE ocorrencias;
TRUNCATE TABLE alertas;
TRUNCATE TABLE eventos;
TRUNCATE TABLE despesas;
TRUNCATE TABLE passageiros;
TRUNCATE TABLE viagens;
TRUNCATE TABLE pacientes;
TRUNCATE TABLE veiculos;
TRUNCATE TABLE motoristas;
TRUNCATE TABLE destinos;
TRUNCATE TABLE usuarios;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO usuarios (id, nome, login, email, senha_hash, perfil, status, criado_em, atualizado_em)
VALUES (
  'usr-gestor-inicial',
  'Gestor Inicial',
  'gestor',
  NULL,
  -- Login inicial: GESTOR  /  Senha inicial: AG2026  (troque no primeiro acesso, em Configuracoes)
  '$2y$12$3UIgdrJjS3dHfftMYlcRXOwSjuT9.N8I30VVnc0L02.0S9/FxeOGG',
  'GESTOR',
  'ativo',
  NOW(),
  NOW()
);
