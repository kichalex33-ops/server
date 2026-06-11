import express from 'express';
import createDriverPairingRoutes from './driverPairingRoutes.js';
import { createLogisticService } from '../services/logisticService.js';
import asyncHandler from '../utils/asyncHandler.js';
function createApiRoutes({ repository }) {
    const router = express.Router();
    const service = createLogisticService(repository);
    router.get('/status', (req, res) => res.json(service.status()));
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
    router.use(createDriverPairingRoutes({ repository }));
    router.use((req, res) => res.status(404).json({ ok: false, error: 'Endpoint nao encontrado.' }));
    return router;
}
export default createApiRoutes;
