import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import createJsonRepository from '../src/repositories/jsonRepository.js';
import { repositoryFactory } from '../src/repositories/repositoryFactory.js';

async function migrate() {
  console.log('--- Iniciando Migracao JSON -> MySQL ---');
  
  if (process.env.DB_DRIVER !== 'mysql') {
    console.error('ERRO: DB_DRIVER deve ser mysql para executar a migracao.');
    process.exit(1);
  }

  const jsonRepo = createJsonRepository();
  const factory = repositoryFactory();
  
  const stats = {
    motoristas: { total: 0, migrados: 0, erros: 0 },
    veiculos: { total: 0, migrados: 0, erros: 0 },
    pacientes: { total: 0, migrados: 0, erros: 0 },
    viagens: { total: 0, migrados: 0, erros: 0 }
  };

  try {
    // 1. Motoristas
    const motoristas = jsonRepo.getCollection('motoristas');
    stats.motoristas.total = motoristas.length;
    for (const m of motoristas) {
      try {
        const exists = await factory.motoristas.findById(m.id);
        if (!exists) {
          await factory.motoristas.create(m);
          stats.motoristas.migrados++;
        }
      } catch (err) {
        console.error(`Erro ao migrar motorista ${m.id}:`, err);
        stats.motoristas.erros++;
      }
    }

    // 2. Veiculos
    const veiculos = jsonRepo.getCollection('veiculos');
    stats.veiculos.total = veiculos.length;
    for (const v of veiculos) {
      try {
        const exists = await factory.veiculos.findById(v.id);
        if (!exists) {
          await factory.veiculos.create(v);
          stats.veiculos.migrados++;
        }
      } catch (err) {
        console.error(`Erro ao migrar veiculo ${v.id}:`, err);
        stats.veiculos.erros++;
      }
    }

    // 3. Pacientes
    const pacientes = jsonRepo.getCollection('pacientes');
    stats.pacientes.total = pacientes.length;
    for (const p of pacientes) {
      try {
        const exists = await factory.pacientes.findById(p.id);
        if (!exists) {
          await factory.pacientes.create(p);
          stats.pacientes.migrados++;
        }
      } catch (err) {
        console.error(`Erro ao migrar paciente ${p.id}:`, err);
        stats.pacientes.erros++;
      }
    }

    // 4. Viagens
    const viagens = jsonRepo.getCollection('viagens');
    stats.viagens.total = viagens.length;
    for (const v of viagens) {
      try {
        const exists = await factory.viagens.findById(v.id);
        if (!exists) {
          await factory.viagens.create(v);
          stats.viagens.migrados++;
        }
      } catch (err) {
        console.error(`Erro ao migrar viagem ${v.id}:`, err);
        stats.viagens.erros++;
      }
    }

    // Gerar Relatorio
    const reportDate = new Date().toISOString().split('T')[0];
    const reportPath = path.join('migration', 'reports', `json-to-mysql-${reportDate}.md`);
    const reportContent = `
# Relatorio de Migracao JSON -> MySQL
**Data:** ${new Date().toLocaleString()}

## Resultados
| Modulo | Total JSON | Migrados | Erros |
| :--- | :--- | :--- | :--- |
| Motoristas | ${stats.motoristas.total} | ${stats.motoristas.migrados} | ${stats.motoristas.erros} |
| Veiculos | ${stats.veiculos.total} | ${stats.veiculos.migrados} | ${stats.veiculos.erros} |
| Pacientes | ${stats.pacientes.total} | ${stats.pacientes.migrados} | ${stats.pacientes.erros} |
| Viagens | ${stats.viagens.total} | ${stats.viagens.migrados} | ${stats.viagens.erros} |

---
*Nota: Registros com IDs ja existentes no MySQL foram ignorados para evitar duplicidade.*
`;
    fs.writeFileSync(reportPath, reportContent);
    console.log(`Migracao concluida! Relatorio salvo em: ${reportPath}`);

  } catch (globalError) {
    console.error('Erro fatal na migracao:', globalError);
  } finally {
    process.exit(0);
  }
}

migrate();
