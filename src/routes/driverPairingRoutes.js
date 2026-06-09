const express = require("express");
const createDriverPairingService = require("../services/driverPairingService");
const asyncHandler = require("../utils/asyncHandler");

function createDriverPairingRoutes({ repository }) {
  const router = express.Router();
  const service = createDriverPairingService(repository);

  router.post("/operator/drivers/:motoristaId/pairing", asyncHandler((req, res) => {
    const result = service.createPairing({
      motoristaId: req.params.motoristaId,
      serverUrl: req.body.server_url || req.body.serverUrl
    });
    res.status(201).json({ ok: true, data: result });
  }));

  router.get("/operator/pairings/:pairingId/status", asyncHandler((req, res) => {
    res.json({ ok: true, data: service.getPairingStatus(req.params.pairingId) });
  }));

  router.post("/operator/pairings/:pairingId/cancel", asyncHandler((req, res) => {
    res.json({ ok: true, data: service.cancelPairing(req.params.pairingId) });
  }));

  router.post("/driver/pairing/confirm", asyncHandler((req, res) => {
    const result = service.confirmPairing({
      pairingId: req.body.pairing_id || req.body.pairingId,
      pairingToken: req.body.pairing_token || req.body.pairingToken,
      device: req.body.device
    });
    res.json(result);
  }));

  return router;
}

module.exports = createDriverPairingRoutes;
