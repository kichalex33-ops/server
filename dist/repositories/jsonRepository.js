import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');
const defaultDataFile = path.join(rootDir, 'data', 'painel-logistico.json');
const defaultBackupDir = path.join(rootDir, 'data', 'backups');
const collectionPrefixes = {
    usuarios: 'usr',
    motoristas: 'mot',
    veiculos: 'vei',
    pacientes: 'pac',
    passageiros: 'pas',
    viagens: 'via',
    localizacoes: 'loc',
    eventos: 'evt',
    alertas: 'alt',
    mensagens: 'msg',
    checklists: 'chk',
    avisos: 'avs',
    comprovantes: 'cmp',
    emergencias: 'emg',
    auditLogs: 'aud',
    insurance_events: 'ins',
    assistance_events: 'ast',
    giroflexEventos: 'gir',
    motoristaHistorico: 'mh',
    lgpdConsents: 'lgp',
    ocorrencias: 'oco',
    despesas: 'des',
    syncLogs: 'syn',
    driverPairings: 'pair',
    driverDevices: 'dev'
};
const tripDefaultStatus = 'AGUARDANDO';
function today() {
    return new Date().toISOString().slice(0, 10);
}
function nowIso() {
    return new Date().toISOString();
}
class JsonRepository {
    dataFile;
    backupDir;
    writeQueue = Promise.resolve();
    constructor(options = {}) {
        this.dataFile = options.dataFile || defaultDataFile;
        this.backupDir = options.backupDir || defaultBackupDir;
    }
    ensureDataFile() {
        fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
        fs.mkdirSync(this.backupDir, { recursive: true });
        if (!fs.existsSync(this.dataFile)) {
            this.writeDataSync(this.createSeedData());
            return;
        }
        const data = this.loadData();
        const hasSeed = Object.keys(collectionPrefixes).some((collection) => Array.isArray(data[collection]) && data[collection].length > 0);
        if (!hasSeed) {
            this.writeDataSync(this.createSeedData());
        }
    }
    loadData() {
        this.ensureParent();
        if (!fs.existsSync(this.dataFile))
            return this.createSeedData();
        const raw = fs.readFileSync(this.dataFile, 'utf8');
        const parsed = raw.trim() ? JSON.parse(raw) : this.createEmptyData();
        return { ...this.createEmptyData(), ...parsed };
    }
    async saveData(data) {
        await this.enqueueWrite(data);
        return data;
    }
    async enqueueWrite(data) {
        this.writeQueue = this.writeQueue.then(async () => {
            this.writeDataSync(data);
        }).catch(err => {
            console.error('[Repository] Erro na fila de escrita:', err);
        });
        return this.writeQueue;
    }
    writeDataSync(data) {
        this.ensureParent();
        const tempFile = `${this.dataFile}.tmp`;
        fs.writeFileSync(tempFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
        fs.renameSync(tempFile, this.dataFile);
    }
    getCollection(collection) {
        const data = this.loadData();
        return data[collection] || [];
    }
    async addItem(collection, item) {
        const data = this.loadData();
        const timestamp = nowIso();
        const record = {
            id: item.id || this.nextId(data[collection], collection),
            ...item,
            criadoEm: item.criadoEm || timestamp,
            atualizadoEm: timestamp
        };
        data[collection].push(record);
        await this.saveData(data);
        return record;
    }
    async updateItem(collection, id, patch) {
        const data = this.loadData();
        const items = data[collection];
        const index = items.findIndex((item) => String(item.id) === String(id));
        if (index === -1)
            return null;
        items[index] = {
            ...items[index],
            ...patch,
            id: items[index].id,
            atualizadoEm: nowIso()
        };
        await this.saveData(data);
        return items[index];
    }
    findById(collection, id) {
        const items = this.getCollection(collection);
        return items.find((item) => String(item.id) === String(id)) || null;
    }
    nextId(items, collection) {
        const prefix = collectionPrefixes[collection] || 'item';
        const number = String(items.length + 1).padStart(4, '0');
        return `${prefix}-${number}-${Date.now()}`;
    }
    ensureParent() {
        fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
    }
    createEmptyData() {
        const empty = { config: { app: 'Painel Logistico', empresa: 'Andrade Gestao em Saude', ambiente: 'local' } };
        Object.keys(collectionPrefixes).forEach(key => { empty[key] = []; });
        return empty;
    }
    createSeedData() {
        const data = this.createEmptyData();
        const createdAt = nowIso();
        data.motoristas.push({
            id: 'mot-001',
            nome: 'Joao Santos',
            telefone: '(00) 90000-0000',
            status: 'ativo',
            criadoEm: createdAt,
            atualizadoEm: createdAt
        });
        data.veiculos.push({
            id: 'vei-001',
            tipo: 'Van Saude',
            nome: 'Van Saude 01',
            prefixo: 'SMS-01',
            placa: 'LOG-2045',
            capacidade: 7,
            status: 'operacional',
            criadoEm: createdAt,
            atualizadoEm: createdAt
        });
        return data;
    }
    storageInfo() {
        const dataStat = fs.existsSync(this.dataFile) ? fs.statSync(this.dataFile) : null;
        return {
            dataFile: this.dataFile,
            dataSizeBytes: dataStat ? dataStat.size : 0,
            dataUpdatedAt: dataStat ? dataStat.mtime.toISOString() : null
        };
    }
}
export default function createRepository(options = {}) {
    return new JsonRepository(options);
}
