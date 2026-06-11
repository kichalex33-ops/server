require("dotenv").config();

const createRepository = require("../src/repositories/jsonRepository");

const repository = createRepository();
repository.ensureDataFile();

const reason = process.argv.slice(2).join("-") || "manual-cli";
const backup = repository.createBackup(reason);

console.log(`Backup criado: ${backup.path}`);
