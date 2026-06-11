-- Painel Logístico - Schema para HostGator (MySQL)
-- UTF-8 mb4 para suporte completo a caracteres e emojis

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------
-- Tabelas de Autenticação e Perfis
-- ---------------------------------------------------------

CREATE TABLE `perfis` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(50) NOT NULL UNIQUE,
  `nome` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `usuarios` (
  `id` CHAR(36) PRIMARY KEY,
  `login` VARCHAR(100) NOT NULL UNIQUE,
  `senha_hash` VARCHAR(255) NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255),
  `status` ENUM('ativo', 'inativo') DEFAULT 'ativo',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `usuario_perfis` (
  `usuario_id` CHAR(36) NOT NULL,
  `perfil_id` INT NOT NULL,
  PRIMARY KEY (`usuario_id`, `perfil_id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`perfil_id`) REFERENCES `perfis`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Tabelas de Cadastro Base
-- ---------------------------------------------------------

CREATE TABLE `motoristas` (
  `id` VARCHAR(50) PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `cpf` VARCHAR(14) UNIQUE,
  `telefone` VARCHAR(20),
  `cnh` VARCHAR(20),
  `categoria_cnh` VARCHAR(5),
  `validade_cnh` DATE,
  `app_login` VARCHAR(100) UNIQUE,
  `senha_app` VARCHAR(255),
  `status` VARCHAR(50) DEFAULT 'ativo',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `veiculos` (
  `id` VARCHAR(50) PRIMARY KEY,
  `prefixo` VARCHAR(50),
  `placa` VARCHAR(10) UNIQUE,
  `nome` VARCHAR(255),
  `tipo` VARCHAR(100),
  `capacidade` INT,
  `status` VARCHAR(50) DEFAULT 'operacional',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pacientes` (
  `id` VARCHAR(50) PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `cpf` VARCHAR(14),
  `tipo` ENUM('paciente', 'acompanhante') DEFAULT 'paciente',
  `acompanhante_de` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`acompanhante_de`) REFERENCES `pacientes`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `estabelecimentos` (
  `id` VARCHAR(50) PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `tipo` VARCHAR(100),
  `endereco` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Tabelas Operacionais
-- ---------------------------------------------------------

CREATE TABLE `viagens` (
  `id` VARCHAR(50) PRIMARY KEY,
  `codigo` VARCHAR(50) UNIQUE,
  `motorista_id` VARCHAR(50),
  `veiculo_id` VARCHAR(50),
  `status` VARCHAR(50) NOT NULL,
  `prioridade` VARCHAR(20) DEFAULT 'NORMAL',
  `data_viagem` DATE,
  `origem` VARCHAR(255),
  `destino` VARCHAR(255),
  `km_saida` DECIMAL(10,2),
  `km_retorno` DECIMAL(10,2),
  `hora_saida` DATETIME,
  `hora_retorno` DATETIME,
  `hora_finalizacao` DATETIME,
  `observacoes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`motorista_id`) REFERENCES `motoristas`(`id`),
  FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `passageiros` (
  `id` VARCHAR(50) PRIMARY KEY,
  `viagem_id` VARCHAR(50) NOT NULL,
  `paciente_id` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'AGUARDANDO',
  `hora_embarque` DATETIME,
  `hora_desembarque` DATETIME,
  `observacoes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`viagem_id`) REFERENCES `viagens`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `eventos` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `viagem_id` VARCHAR(50),
  `tipo` VARCHAR(50) NOT NULL,
  `categoria` VARCHAR(50),
  `descricao` TEXT,
  `motorista_id` VARCHAR(50),
  `veiculo_id` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`viagem_id`) REFERENCES `viagens`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `localizacoes` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `viagem_id` VARCHAR(50) NOT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `velocidade` DECIMAL(5, 2),
  `precisao` DECIMAL(5, 2),
  `bateria` INT,
  `timestamp_dispositivo` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`viagem_id`) REFERENCES `viagens`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `alertas` (
  `id` VARCHAR(50) PRIMARY KEY,
  `viagem_id` VARCHAR(50),
  `tipo` VARCHAR(50) NOT NULL,
  `descricao` TEXT,
  `severidade` VARCHAR(20),
  `status` VARCHAR(20) DEFAULT 'ABERTO',
  `resolvido_em` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`viagem_id`) REFERENCES `viagens`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mensagens` (
  `id` VARCHAR(50) PRIMARY KEY,
  `viagem_id` VARCHAR(50),
  `origem` VARCHAR(50),
  `destino` VARCHAR(50),
  `mensagem` TEXT NOT NULL,
  `status` VARCHAR(20),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`viagem_id`) REFERENCES `viagens`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `checklists` (
  `id` VARCHAR(50) PRIMARY KEY,
  `viagem_id` VARCHAR(50) NOT NULL,
  `tipo` VARCHAR(50),
  `itens` JSON,
  `observacoes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`viagem_id`) REFERENCES `viagens`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ocorrencias` (
  `id` VARCHAR(50) PRIMARY KEY,
  `viagem_id` VARCHAR(50),
  `tipo` VARCHAR(50) NOT NULL,
  `descricao` TEXT,
  `severidade` VARCHAR(20),
  `status` VARCHAR(20) DEFAULT 'ABERTA',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`viagem_id`) REFERENCES `viagens`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `despesas` (
  `id` VARCHAR(50) PRIMARY KEY,
  `viagem_id` VARCHAR(50),
  `tipo` VARCHAR(50) NOT NULL,
  `valor` DECIMAL(10,2),
  `litros` DECIMAL(10,2),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`viagem_id`) REFERENCES `viagens`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Tabelas de Dispositivos e Pareamento
-- ---------------------------------------------------------

CREATE TABLE `driver_pairings` (
  `id` VARCHAR(50) PRIMARY KEY,
  `motorista_id` VARCHAR(50) NOT NULL,
  `pairing_token_hash` VARCHAR(255) NOT NULL,
  `status` VARCHAR(20) DEFAULT 'PENDENTE',
  `expires_at` DATETIME,
  `confirmed_at` DATETIME,
  `device_id` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`motorista_id`) REFERENCES `motoristas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `driver_devices` (
  `id` VARCHAR(255) PRIMARY KEY,
  `motorista_id` VARCHAR(50) NOT NULL,
  `device_name` VARCHAR(255),
  `platform` VARCHAR(50),
  `app_version` VARCHAR(50),
  `last_seen_at` DATETIME,
  `status` VARCHAR(20) DEFAULT 'ATIVO',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`motorista_id`) REFERENCES `motoristas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Tabelas de Sistema e Auditoria
-- ---------------------------------------------------------

CREATE TABLE `sync_queue` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tipo` VARCHAR(50) NOT NULL,
  `payload` JSON,
  `status` VARCHAR(20) DEFAULT 'PENDENTE',
  `tentativas` INT DEFAULT 0,
  `created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `arquivos` (
  `id` VARCHAR(50) PRIMARY KEY,
  `nome_original` VARCHAR(255),
  `nome_servidor` VARCHAR(255) NOT NULL,
  `path` TEXT NOT NULL,
  `mime` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tipo` VARCHAR(100) NOT NULL,
  `origem` VARCHAR(50),
  `usuario` VARCHAR(100),
  `detalhes` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `configuracoes` (
  `chave` VARCHAR(100) PRIMARY KEY,
  `valor` TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
