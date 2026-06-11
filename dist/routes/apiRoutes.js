import express from 'express';
import createDriverPairingRoutes from './driverPairingRoutes.js';
import { createLogisticService } from '../services/logisticService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { checkDatabaseHealth } from '../database/health.js';
function createApiRoutes({ factory }) {
    const router = express.Router();
    const service = createLogisticService(factory);
    router.get('/status', (req, res) => res.json(service.status()));
    router.get('/system/health', asyncHandler(async (req, res) => {
        const health = await checkDatabaseHealth();
        res.json({
            status: health.status,
            db_driver: health.driver,
            database: health.connection,
            uptime: Math.round(process.uptime()),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        });
    }));
    router.get('/dashboard/resumo-dia', (req, res) => res.json({ ok: true, data: service.dashboardSummary() }));
    // Viagens
    router.get('/viagens', (req, res) => res.json({ ok: true, data: service.list('viagens') }));
    router.post('/viagens', asyncHandler(async (req, res) => {
        const created = await service.create('viagens', req.body);
        res.status(201).json({ ok: true, data: { viagem: created } });
    }));
    router.get('/viagens/:id', (req, res) => res.json({ ok: true, data: service.find('viagens', req.params.id) }));
    // Motoristas
    router.get('/motoristas', (req, res) => res.json({ ok: true, data: service.list('motoristas') }));
    router.post('/motoristas', asyncHandler(async (req, res) => {
        const result = await service.create('motoristas', req.body);
        res.status(201).json({ ok: true, data: result });
    }));
    // GPS
    router.post('/gps', asyncHandler(async (req, res) => {
        const gps = await service.addGps(req.body);
        res.status(201).json({ ok: true, message: 'GPS recebido', data: gps });
    }));
    router.get('/live-map', (req, res) => res.json({ ok: true, data: service.liveMap() }));
    // Driver Login
    router.post('/driver/login', asyncHandler(async (req, res) => {
        res.json({ ok: true, data: service.driverLogin(req.body) });
    }));
    router.use(createDriverPairingRoutes({ factory }));
    router.use((req, res) => res.status(404).json({ ok: false, error: 'Endpoint nao encontrado.' }));
    return router;
}
export default createApiRoutes;
