require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

const createRepository = require("../src/repositories/jsonRepository");

const repository = createRepository();
repository.ensureDataFile();

const reason = process.argv.slice(2).join("-") || "manual-cli";
const backup = repository.createBackup(reason);
const backupRoot = process.env.BACKUP_DIR || path.join("data", "backups");
const dailyDir = path.join(backupRoot, "diario");
const weeklyDir = path.join(backupRoot, "semanal");
fs.mkdirSync(dailyDir, { recursive: true });
fs.mkdirSync(weeklyDir, { recursive: true });

const dailyPath = path.join(dailyDir, path.basename(backup.path));
fs.copyFileSync(backup.path, dailyPath);

if (new Date().getDay() === 0 || reason.includes("semanal")) {
  fs.copyFileSync(backup.path, path.join(weeklyDir, path.basename(backup.path)));
}

console.log(`Backup criado: ${backup.path}`);
console.log(`Copia diaria: ${dailyPath}`);
