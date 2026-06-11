import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import createApiRoutes from './routes/apiRoutes.js';
import authToken from './middlewares/authToken.js';
import errorHandler from './middlewares/errorHandler.js';
import requestLogger from './middlewares/requestLogger.js';
import configureSecurity from './middlewares/security.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function createApp({ repository }) {
    const app = express();
    configureSecurity(app);
    app.use(express.json({ limit: '1mb' }));
    app.use(requestLogger);
    app.use(authToken);
    const publicPath = path.join(__dirname, '..', 'public');
    app.get('/painel-logistico', (req, res) => {
        res.sendFile(path.join(publicPath, 'portal.html'));
    });
    app.get('/painel-logistico/operador', (req, res) => {
        res.sendFile(path.join(publicPath, 'operador.html'));
    });
    app.get('/painel-logistico/gestao', (req, res) => {
        res.sendFile(path.join(publicPath, 'gestao.html'));
    });
    app.get('/painel-logistico/sala-situacao', (req, res) => {
        res.sendFile(path.join(publicPath, 'sala-situacao.html'));
    });
    app.get('/painel-logistico/emergencias', (req, res) => {
        res.sendFile(path.join(publicPath, 'emergencias.html'));
    });
    app.get('/painel-logistico/admin/infra', (req, res) => {
        res.sendFile(path.join(publicPath, 'admin-infra.html'));
    });
    app.get('/sistema/saude', (req, res) => {
        res.sendFile(path.join(publicPath, 'sistema-saude.html'));
    });
    app.get('/operador/sincronizacao', (req, res) => {
        res.sendFile(path.join(publicPath, 'operador-sincronizacao.html'));
    });
    app.get(['/motorista', '/app-motorista'], (req, res) => {
        res.sendFile(path.join(publicPath, 'motorista', 'index.html'));
    });
    app.use(express.static(publicPath));
    app.use('/api', createApiRoutes({ repository }));
    app.use(errorHandler);
    return app;
}
export default createApp;
