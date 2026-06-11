import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createRepository from '../src/repositories/jsonRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repository = createRepository();
repository.ensureDataFile();

const reason = process.argv.slice(2).join('-') || 'manual-cli';
const backup = (repository as any).createBackup(reason);
const backupRoot = process.env.BACKUP_DIR || path.join('data', 'backups');
const dailyDir = path.join(backupRoot, 'diario');
const weeklyDir = path.join(backupRoot, 'semanal');

fs.mkdirSync(dailyDir, { recursive: true });
fs.mkdirSync(weeklyDir, { recursive: true });

const dailyPath = path.join(dailyDir, path.basename(backup.path));
fs.copyFileSync(backup.path, dailyPath);

if (new Date().getDay() === 0 || reason.includes('semanal')) {
  fs.copyFileSync(backup.path, path.join(weeklyDir, path.basename(backup.path)));
}

console.log(`Backup criado: ${backup.path}`);
console.log(`Copia diaria: ${dailyPath}`);
