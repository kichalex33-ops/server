import { dbConfig } from '../database/dbConfig.js';
import createJsonRepository from './jsonRepository.js';
import { MotoristaMysqlRepository } from './mysql/MotoristaMysqlRepository.js';
import { VeiculoMysqlRepository } from './mysql/VeiculoMysqlRepository.js';
import { PacienteMysqlRepository } from './mysql/PacienteMysqlRepository.js';
import { ViagemMysqlRepository } from './mysql/ViagemMysqlRepository.js';

export function repositoryFactory() {
  const driver = dbConfig.driver;
  const jsonRepo = createJsonRepository();

  if (driver === 'mysql') {
    console.log('[Factory] Utilizando driver MySQL para modulos principais.');
    return {
      driver: 'mysql',
      motoristas: new MotoristaMysqlRepository(),
      veiculos: new VeiculoMysqlRepository(),
      pacientes: new PacienteMysqlRepository(),
      viagens: new ViagemMysqlRepository(),
      // Fallback para modulos ainda nao migrados para MySQL
      json: jsonRepo
    };
  }

  console.log('[Factory] Utilizando driver JSON para todos os modulos.');
  return {
    driver: 'json',
    motoristas: jsonRepo,
    veiculos: jsonRepo,
    pacientes: jsonRepo,
    viagens: jsonRepo,
    json: jsonRepo
  };
}
