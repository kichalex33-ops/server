import { dbConfig } from './dbConfig.js';
import { testConnection } from './mysqlPool.js';
export async function checkDatabaseHealth() {
    const driver = dbConfig.driver;
    if (driver === 'json') {
        return {
            status: 'ok',
            driver: 'json',
            connection: 'disabled'
        };
    }
    const isConnected = await testConnection();
    return {
        status: isConnected ? 'ok' : 'error',
        driver: 'mysql',
        connection: isConnected ? 'ok' : 'unavailable'
    };
}
