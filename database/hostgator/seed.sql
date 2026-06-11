-- Seed Mínimo para Painel Logístico (Fase H1)
-- IMPORTANTE: Não contém motoristas, veículos, viagens ou usuários operacionais.
-- Objetivo: Apenas popular as tabelas de referência e configurações globais.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Popular Perfis do Sistema
INSERT INTO `perfis` (`id`, `slug`, `nome`) VALUES
(1, 'super_admin', 'SUPER_ADMIN'),
(2, 'admin', 'ADMIN'),
(3, 'gestor', 'GESTOR'),
(4, 'operador', 'OPERADOR'),
(5, 'motorista', 'MOTORISTA');

-- 2. Configurações Iniciais
INSERT INTO `configuracoes` (`chave`, `valor`) VALUES
('app_nome', 'Painel Logistico'),
('empresa_nome', 'Andrade Gestao em Saude'),
('versao_schema', '1.0.0'),
('ambiente', 'producao'),
('timezone', 'America/Sao_Paulo');

SET FOREIGN_KEY_CHECKS = 1;
