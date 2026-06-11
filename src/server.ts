import 'dotenv/config';
import createApp from './app.js';
import { repositoryFactory } from './repositories/repositoryFactory.js';
import { testConnection } from './database/mysqlPool.js';

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

const factory = repositoryFactory();
const repository = factory.json; // Garante persistencia JSON base

// Inicializacao assincrona opcional para MySQL
if (factory.driver === 'mysql') {
  await testConnection();
}

repository.ensureDataFile();

const app = createApp({ factory });

app.listen(port, host, () => {
  console.log(`[API] Painel Logistico rodando em http://localhost:${port}`);
  console.log(`[API] Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[API] Banco de Dados: ${factory.driver.toUpperCase()}`);
  console.log(`[API] Acesso na rede: ${process.env.PUBLIC_URL || `http://IP_DO_SERVIDOR:${port}`}`);
});
