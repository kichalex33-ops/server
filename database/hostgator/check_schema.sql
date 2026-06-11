-- Script de Verificação de Integridade do Banco (HostGator)
-- Objetivo: Confirmar se a estrutura foi criada corretamente após importação via phpMyAdmin.

-- 1. Listar todas as tabelas criadas
SHOW TABLES;

-- 2. Verificar se as tabelas principais possuem os campos corretos
DESCRIBE `usuarios`;
DESCRIBE `viagens`;
DESCRIBE `localizacoes`;
DESCRIBE `driver_pairings`;

-- 3. Validar se os perfis de base foram inseridos
SELECT * FROM `perfis`;

-- 4. Verificar foreign keys (opcional, para garantia extra)
SELECT 
    TABLE_NAME, 
    COLUMN_NAME, 
    CONSTRAINT_NAME, 
    REFERENCED_TABLE_NAME, 
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    REFERENCED_TABLE_SCHEMA = (SELECT DATABASE()) 
    AND REFERENCED_TABLE_NAME IS NOT NULL;
