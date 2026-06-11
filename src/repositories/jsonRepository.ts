import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSchema, Viagem, Motorista, Passageiro, GpsData } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..', '..');
const defaultDataFile = path.join(rootDir, 'data', 'painel-logistico.json');
const defaultBackupDir = path.join(rootDir, 'data', 'backups');

const collectionPrefixes: Record<string, string> = {
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
  private dataFile: string;
  private backupDir: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(options: { dataFile?: string; backupDir?: string } = {}) {
    this.dataFile = options.dataFile || defaultDataFile;
    this.backupDir = options.backupDir || defaultBackupDir;
  }

  public ensureDataFile(): void {
    fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
    fs.mkdirSync(this.backupDir, { recursive: true });

    if (!fs.existsSync(this.dataFile)) {
      this.writeDataSync(this.createSeedData());
      return;
    }

    const data = this.loadData();
    const hasSeed = Object.keys(collectionPrefixes).some(
      (collection) => Array.isArray((data as any)[collection]) && (data as any)[collection].length > 0
    );
    if (!hasSeed) {
      this.writeDataSync(this.createSeedData());
    }
  }

  public loadData(): DatabaseSchema {
    this.ensureParent();
    if (!fs.existsSync(this.dataFile)) return this.createSeedData() as unknown as DatabaseSchema;

    const raw = fs.readFileSync(this.dataFile, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : this.createEmptyData();
    return { ...this.createEmptyData(), ...parsed } as unknown as DatabaseSchema;
  }

  public async saveData(data: DatabaseSchema): Promise<DatabaseSchema> {
    await this.enqueueWrite(data);
    return data;
  }

  private async enqueueWrite(data: DatabaseSchema): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      this.writeDataSync(data);
    }).catch(err => {
      console.error('[Repository] Erro na fila de escrita:', err);
    });
    return this.writeQueue;
  }

  private writeDataSync(data: any): void {
    this.ensureParent();
    const tempFile = `${this.dataFile}.tmp`;
    fs.writeFileSync(tempFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    fs.renameSync(tempFile, this.dataFile);
  }

  public getCollection<K extends keyof DatabaseSchema>(collection: K): DatabaseSchema[K] {
    const data = this.loadData();
    return data[collection] || [];
  }

  public async addItem<K extends keyof DatabaseSchema>(collection: K, item: any): Promise<any> {
    const data = this.loadData();
    const timestamp = nowIso();
    const record = {
      id: item.id || this.nextId(data[collection] as any[], collection as string),
      ...item,
      criadoEm: item.criadoEm || timestamp,
      atualizadoEm: timestamp
    };
    (data[collection] as any[]).push(record);
    await this.saveData(data);
    return record;
  }

  public async updateItem<K extends keyof DatabaseSchema>(collection: K, id: string, patch: any): Promise<any | null> {
    const data = this.loadData();
    const items = data[collection] as any[];
    const index = items.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return null;

    items[index] = {
      ...items[index],
      ...patch,
      id: items[index].id,
      atualizadoEm: nowIso()
    };
    await this.saveData(data);
    return items[index];
  }

  public findById<K extends keyof DatabaseSchema>(collection: K, id: string): any | null {
    const items = this.getCollection(collection) as any[];
    return items.find((item) => String(item.id) === String(id)) || null;
  }

  private nextId(items: any[], collection: string): string {
    const prefix = collectionPrefixes[collection] || 'item';
    const number = String(items.length + 1).padStart(4, '0');
    return `${prefix}-${number}-${Date.now()}`;
  }

  private ensureParent(): void {
    fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
  }

  private createEmptyData(): any {
    const empty: any = { config: { app: 'Painel Logistico', empresa: 'Andrade Gestao em Saude', ambiente: 'local' } };
    Object.keys(collectionPrefixes).forEach(key => { empty[key] = []; });
    return empty;
  }

  private createSeedData(): any {
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

  public storageInfo() {
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
