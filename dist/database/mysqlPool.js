import mysql from 'mysql2/promise';
import { dbConfig } from './dbConfig.js';
let pool = null;
export function getMysqlPool() {
    if (dbConfig.driver !== 'mysql') {
        throw new Error('MySQL Pool solicitado mas DB_DRIVER nao e mysql.');
    }
    if (!pool) {
        console.log(`[Database] Inicializando Pool MySQL em ${dbConfig.mysql.host}`);
        pool = mysql.createPool({
            ...dbConfig.mysql,
            waitForConnections: true,
            queueLimit: 0
        });
    }
    return pool;
}
export async function testConnection() {
    if (dbConfig.driver !== 'mysql')
        return false;
    try {
        const p = getMysqlPool();
        const [rows] = await p.query('SELECT 1 as ok');
        console.log('[Database] Conexao MySQL estabelecida com sucesso.');
        return true;
    }
    catch (error) {
        console.error('[Database] Erro ao conectar no MySQL:', error);
        return false;
    }
}
