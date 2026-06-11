import express from 'express';
import { createDriverPairingService } from '../services/driverPairingService.js';
import asyncHandler from '../utils/asyncHandler.js';

function createDriverPairingRoutes({ repository }: { repository: any }) {
  const router = express.Router();
  const service = createDriverPairingService(repository);

  router.post('/operator/drivers/:motoristaId/pairing', asyncHandler(async (req, res) => {
    const result = service.createPairing({
      motoristaId: req.params.motoristaId,
      serverUrl: req.body.server_url || req.body.serverUrl
    });
    res.status(201).json({ ok: true, data: result });
  }));

  router.post('/driver/pairing/confirm', asyncHandler(async (req, res) => {
    const result = service.confirmPairing({
      pairingId: req.body.pairing_id || req.body.pairingId || req.body.id,
      pairingToken: req.body.token || req.body.pairing_token || req.body.pairingToken || req.body.pareamento,
      device: req.body.device || req.body.dispositivo,
      platform: req.body.platform,
      appVersion: req.body.app_version || req.body.appVersion
    });
    res.json(result);
  }));

  return router;
}

export default createDriverPairingRoutes;
