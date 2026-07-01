-- 009 - Operador pode excluir pacientes/acompanhantes; seed de homologacao
-- Rode no phpMyAdmin depois de subir o pacote. Nao use em producao com dados reais sem revisar.

SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'status');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE pacientes ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT ''ativo'' AFTER telefone', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE pacientes SET status = 'ativo' WHERE status IS NULL OR status = '';

CREATE TABLE IF NOT EXISTS destinos (
  id VARCHAR(64) PRIMARY KEY,
  nome VARCHAR(180) NOT NULL,
  tipo VARCHAR(40) NOT NULL DEFAULT 'outro',
  endereco VARCHAR(255) NOT NULL,
  cidade VARCHAR(120) NULL,
  telefone VARCHAR(40) NULL,
  observacoes TEXT NULL,
  metadados TEXT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_destinos_nome (nome),
  INDEX idx_destinos_cidade (cidade)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO pacientes (id, nome, tipo, cpf, telefone, status, metadados, criado_em, atualizado_em) VALUES
  ('seed-pac-001', 'João Klein', 'paciente', '900.000.000-00', '(51) 98000-1000', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-002', 'Maria Schneider', 'paciente', '900.000.001-07', '(51) 98001-1001', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-003', 'Pedro Müller', 'paciente', '900.000.002-14', '(51) 98002-1002', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-004', 'Ana Silva', 'paciente', '900.000.003-21', '(51) 98003-1003', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-005', 'Carlos Santos', 'paciente', '900.000.004-28', '(51) 98004-1004', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-006', 'Lucia Oliveira', 'paciente', '900.000.005-35', '(51) 98005-1005', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-007', 'Paulo Souza', 'paciente', '900.000.006-42', '(51) 98006-1006', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-008', 'Marcia Lima', 'paciente', '900.000.007-49', '(51) 98007-1007', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-009', 'José Costa', 'paciente', '900.000.008-56', '(51) 98008-1008', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-010', 'Helena Ferreira', 'paciente', '900.000.009-63', '(51) 98009-1009', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-011', 'Roberto Pereira', 'paciente', '900.000.010-70', '(51) 98010-1010', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-012', 'Claudia Alves', 'paciente', '900.000.011-77', '(51) 98011-1011', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-013', 'Fernando Weber', 'paciente', '900.000.012-84', '(51) 98012-1012', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-014', 'Rosa Hoffmann', 'paciente', '900.000.013-91', '(51) 98013-1013', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-015', 'Marcos Kich', 'paciente', '900.000.014-98', '(51) 98014-1014', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-016', 'Sandra Schmitz', 'paciente', '900.000.015-05', '(51) 98015-1015', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-017', 'Luiz Borges', 'paciente', '900.000.016-12', '(51) 98016-1016', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-018', 'Tania Teixeira', 'paciente', '900.000.017-19', '(51) 98017-1017', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-019', 'Ricardo Moreira', 'paciente', '900.000.018-26', '(51) 98018-1018', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-020', 'Beatriz Ribeiro', 'paciente', '900.000.019-33', '(51) 98019-1019', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-021', 'Nelson Fischer', 'paciente', '900.000.020-40', '(51) 98020-1020', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-022', 'Patricia Rocha', 'paciente', '900.000.021-47', '(51) 98021-1021', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-023', 'Antonio Barbosa', 'paciente', '900.000.022-54', '(51) 98022-1022', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-024', 'Sonia Cardoso', 'paciente', '900.000.023-61', '(51) 98023-1023', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-025', 'Gustavo Martins', 'paciente', '900.000.024-68', '(51) 98024-1024', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-026', 'Elisa Moraes', 'paciente', '900.000.025-75', '(51) 98025-1025', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-027', 'Eduardo Campos', 'paciente', '900.000.026-82', '(51) 98026-1026', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-028', 'Marta Freitas', 'paciente', '900.000.027-89', '(51) 98027-1027', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-029', 'Sergio Azevedo', 'paciente', '900.000.028-96', '(51) 98028-1028', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-030', 'Camila Machado', 'paciente', '900.000.029-03', '(51) 98029-1029', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-031', 'Vitor Correia', 'paciente', '900.000.030-10', '(51) 98030-1030', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-032', 'Aline Gomes', 'paciente', '900.000.031-17', '(51) 98031-1031', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-033', 'Felipe Dias', 'paciente', '900.000.032-24', '(51) 98032-1032', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-034', 'Renata Nunes', 'paciente', '900.000.033-31', '(51) 98033-1033', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-035', 'Bruno Vieira', 'paciente', '900.000.034-38', '(51) 98034-1034', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-036', 'Leticia Fonseca', 'acompanhante', '900.000.035-45', '(51) 98035-1035', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-037', 'Daniel Ramos', 'acompanhante', '900.000.036-52', '(51) 98036-1036', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-038', 'Carolina Mendes', 'acompanhante', '900.000.037-59', '(51) 98037-1037', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-039', 'André Cunha', 'acompanhante', '900.000.038-66', '(51) 98038-1038', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-040', 'Bianca Melo', 'acompanhante', '900.000.039-73', '(51) 98039-1039', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-041', 'Rafael Castro', 'acompanhante', '900.000.040-80', '(51) 98040-1040', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-042', 'Juliana Pinto', 'acompanhante', '900.000.041-87', '(51) 98041-1041', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-043', 'Mauricio Franco', 'acompanhante', '900.000.042-94', '(51) 98042-1042', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-044', 'Débora Leite', 'acompanhante', '900.000.043-01', '(51) 98043-1043', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-045', 'Tiago Araújo', 'acompanhante', '900.000.044-08', '(51) 98044-1044', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-046', 'Vanessa Rezende', 'acompanhante', '900.000.045-15', '(51) 98045-1045', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-047', 'Marcelo Farias', 'acompanhante', '900.000.046-22', '(51) 98046-1046', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-048', 'Priscila Duarte', 'acompanhante', '900.000.047-29', '(51) 98047-1047', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-049', 'Adriano Macedo', 'acompanhante', '900.000.048-36', '(51) 98048-1048', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW()),
  ('seed-pac-050', 'Larissa Monteiro', 'acompanhante', '900.000.049-43', '(51) 98049-1049', 'ativo', '{"seed": true, "ficticio": true, "observacao": "Cadastro ficticio para teste de homologacao."}', NOW(), NOW())
ON DUPLICATE KEY UPDATE nome = VALUES(nome), tipo = VALUES(tipo), cpf = VALUES(cpf), telefone = VALUES(telefone), status = 'ativo', metadados = VALUES(metadados), atualizado_em = NOW();

INSERT INTO destinos (id, nome, tipo, endereco, cidade, telefone, observacoes, metadados, criado_em, atualizado_em) VALUES
  ('dst-hosp-montenegro', 'Hospital Montenegro', 'hospital', 'Montenegro/RS - endereço operacional a confirmar no cadastro', 'Montenegro', NULL, 'Destino real próximo; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-tacchini', 'Hospital Tacchini', 'hospital', 'Bento Gonçalves/RS - endereço operacional a confirmar no cadastro', 'Bento Gonçalves', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-pompeia', 'Hospital Pompéia', 'hospital', 'Caxias do Sul/RS - endereço operacional a confirmar no cadastro', 'Caxias do Sul', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-geral-caxias', 'Hospital Geral de Caxias do Sul', 'hospital', 'Caxias do Sul/RS - endereço operacional a confirmar no cadastro', 'Caxias do Sul', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-virvi-ramos', 'Hospital Virvi Ramos', 'hospital', 'Caxias do Sul/RS - endereço operacional a confirmar no cadastro', 'Caxias do Sul', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-sao-carlos-farroupilha', 'Hospital São Carlos', 'hospital', 'Farroupilha/RS - endereço operacional a confirmar no cadastro', 'Farroupilha', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-regina', 'Hospital Regina', 'hospital', 'Novo Hamburgo/RS - endereço operacional a confirmar no cadastro', 'Novo Hamburgo', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-unimed-vale-sinos', 'Hospital Unimed Vale do Sinos', 'hospital', 'Novo Hamburgo/RS - endereço operacional a confirmar no cadastro', 'Novo Hamburgo', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-centenario', 'Hospital Centenário', 'hospital', 'São Leopoldo/RS - endereço operacional a confirmar no cadastro', 'São Leopoldo', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-sao-camilo-esteio', 'Hospital São Camilo', 'hospital', 'Esteio/RS - endereço operacional a confirmar no cadastro', 'Esteio', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-bom-pastor', 'Hospital Bom Pastor', 'hospital', 'Igrejinha/RS - endereço operacional a confirmar no cadastro', 'Igrejinha', NULL, 'Destino real próximo; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-arcanjo-sao-miguel', 'Hospital Arcanjo São Miguel', 'hospital', 'Gramado/RS - endereço operacional a confirmar no cadastro', 'Gramado', NULL, 'Destino real próximo; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-dom-joao-becker', 'Hospital Dom João Becker', 'hospital', 'Gravataí/RS - endereço operacional a confirmar no cadastro', 'Gravataí', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-conceicao-poa', 'Hospital Nossa Senhora da Conceição', 'hospital', 'Porto Alegre/RS - endereço operacional a confirmar no cadastro', 'Porto Alegre', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-cristo-redentor-poa', 'Hospital Cristo Redentor', 'hospital', 'Porto Alegre/RS - endereço operacional a confirmar no cadastro', 'Porto Alegre', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-santa-casa-poa', 'Santa Casa de Misericórdia de Porto Alegre', 'hospital', 'Porto Alegre/RS - endereço operacional a confirmar no cadastro', 'Porto Alegre', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-clinicas-poa', 'Hospital de Clínicas de Porto Alegre', 'hospital', 'Porto Alegre/RS - endereço operacional a confirmar no cadastro', 'Porto Alegre', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW()),
  ('dst-hosp-sao-lucas-pucrs', 'Hospital São Lucas da PUCRS', 'hospital', 'Porto Alegre/RS - endereço operacional a confirmar no cadastro', 'Porto Alegre', NULL, 'Destino real regional; confirmar endereço exato antes da rota.', '{"seed": true, "real": true, "raio_referencia_km": 100, "base": "São José do Sul/RS", "confirmar_endereco_antes_da_rota": true}', NOW(), NOW())
ON DUPLICATE KEY UPDATE nome = VALUES(nome), tipo = VALUES(tipo), endereco = VALUES(endereco), cidade = VALUES(cidade), telefone = VALUES(telefone), observacoes = VALUES(observacoes), metadados = VALUES(metadados), atualizado_em = NOW();
