const store = require('../lib/logisaude-store');
const views = require('../views/logisaude-views');

function flashRedirect(res, path, msg) {
  const q = msg ? `?ok=${encodeURIComponent(msg)}` : '';
  res.redirect(302, path + q);
}

function lerFlash(req) {
  return req.query.ok ? String(req.query.ok) : null;
}

module.exports = function registerLogisaude(app) {
  // ─── LogiSaúde API ───────────────────────────────────────────────
  app.get('/api/logisaude/status', (req, res) => {
    res.json(store.statusApi());
  });

  app.get('/api/logisaude/dashboard', (req, res) => {
    res.json(store.dashboard());
  });

  app.get('/api/logisaude/viagens', (req, res) => {
    const dados = store.carregar();
    res.json({ total: dados.viagens.length, data: store.enriquecerViagens(dados) });
  });

  app.post('/api/logisaude/viagens', (req, res) => {
    const registro = store.criarViagem(req.body || {});
    res.status(201).json({ sucesso: true, dados: registro });
  });

  app.get('/api/logisaude/motoristas', (req, res) => {
    const dados = store.carregar();
    res.json({ total: dados.motoristas.length, data: dados.motoristas });
  });

  app.post('/api/logisaude/motoristas', (req, res) => {
    const registro = store.criarMotorista(req.body || {});
    res.status(201).json({ sucesso: true, dados: registro });
  });

  app.get('/api/logisaude/veiculos', (req, res) => {
    const dados = store.carregar();
    res.json({ total: dados.veiculos.length, data: dados.veiculos });
  });

  app.post('/api/logisaude/veiculos', (req, res) => {
    const registro = store.criarVeiculo(req.body || {});
    res.status(201).json({ sucesso: true, dados: registro });
  });

  app.get('/api/logisaude/pacientes', (req, res) => {
    const dados = store.carregar();
    res.json({ total: dados.pacientes.length, data: dados.pacientes });
  });

  app.post('/api/logisaude/pacientes', (req, res) => {
    const registro = store.criarPaciente(req.body || {});
    res.status(201).json({ sucesso: true, dados: registro });
  });

  app.get('/api/logisaude/passageiros', (req, res) => {
    const dados = store.carregar();
    res.json({ total: dados.passageiros.length, data: dados.passageiros });
  });

  app.post('/api/logisaude/passageiros', (req, res) => {
    const registro = store.criarPassageiro(req.body || {});
    res.status(201).json({ sucesso: true, dados: registro });
  });

  // ─── Driver App API ──────────────────────────────────────────────
  app.get('/api/driver/events', (req, res) => {
    const dados = store.carregar();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json({ total: dados.driver_events.length, data: dados.driver_events.slice(0, limit) });
  });

  app.post('/api/driver/events', (req, res) => {
    const evento = store.registrarEvento(req.body || {});
    res.status(201).json({ sucesso: true, dados: evento });
  });

  app.get('/api/driver/locations', (req, res) => {
    const dados = store.carregar();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json({ total: dados.driver_locations.length, data: dados.driver_locations.slice(0, limit) });
  });

  app.post('/api/driver/locations', (req, res) => {
    const loc = store.registrarLocalizacao(req.body || {});
    res.status(201).json({ sucesso: true, dados: loc });
  });

  app.get('/api/driver/trips', (req, res) => {
    const dados = store.carregar();
    res.json({ total: dados.viagens.length, data: store.enriquecerViagens(dados) });
  });

  app.get('/api/driver/trips/status', (req, res) => {
    const dados = store.carregar();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json({ total: dados.trip_status.length, data: dados.trip_status.slice(0, limit) });
  });

  app.post('/api/driver/trips/status', (req, res) => {
    const registro = store.registrarTripStatus(req.body || {});
    res.status(201).json({ sucesso: true, dados: registro });
  });

  // ─── LogiSaúde Web ───────────────────────────────────────────────
  app.get('/logisaude', (req, res) => {
    res.type('html').send(views.pageDashboard(lerFlash(req)));
  });

  app.get('/logisaude/operacao', (req, res) => {
    res.type('html').send(views.pageOperacao(lerFlash(req)));
  });

  app.post('/logisaude/operacao/acoes', (req, res) => {
    const { viagem_id, acao } = req.body || {};
    const mapa = { despachar: 'em_andamento', concluir: 'concluida', cancelar: 'cancelada' };
    const status = mapa[acao];
    if (!status || !viagem_id) {
      return flashRedirect(res, '/logisaude/operacao', 'Ação inválida');
    }
    const atualizada = store.atualizarStatusViagem(viagem_id, status);
    if (!atualizada) return flashRedirect(res, '/logisaude/operacao', 'Viagem não encontrada');
    flashRedirect(res, '/logisaude/operacao', `Viagem ${status.replace('_', ' ')}`);
  });

  app.get('/logisaude/viagens', (req, res) => {
    res.type('html').send(views.pageViagens(lerFlash(req)));
  });

  app.post('/logisaude/viagens', (req, res) => {
    store.criarViagem(req.body || {});
    flashRedirect(res, '/logisaude/viagens', 'Viagem criada');
  });

  app.get('/logisaude/motoristas', (req, res) => {
    res.type('html').send(views.pageMotoristas(lerFlash(req)));
  });

  app.post('/logisaude/motoristas', (req, res) => {
    store.criarMotorista(req.body || {});
    flashRedirect(res, '/logisaude/motoristas', 'Motorista cadastrado');
  });

  app.get('/logisaude/veiculos', (req, res) => {
    res.type('html').send(views.pageVeiculos(lerFlash(req)));
  });

  app.post('/logisaude/veiculos', (req, res) => {
    store.criarVeiculo(req.body || {});
    flashRedirect(res, '/logisaude/veiculos', 'Veículo cadastrado');
  });

  app.get('/logisaude/pacientes', (req, res) => {
    res.type('html').send(views.pagePacientes(lerFlash(req)));
  });

  app.post('/logisaude/pacientes', (req, res) => {
    const body = req.body || {};
    const pac = store.criarPaciente(body);
    store.criarPassageiro({ ...body, paciente_id: pac.id });
    flashRedirect(res, '/logisaude/pacientes', 'Paciente cadastrado');
  });

  app.get('/logisaude/rastreamento', (req, res) => {
    res.type('html').send(views.pageRastreamento(lerFlash(req)));
  });

  app.get('/logisaude/sync', (req, res) => {
    res.type('html').send(views.pageSync(lerFlash(req)));
  });

  app.get('/logisaude/debug', (req, res) => {
    res.type('html').send(views.pageDebug());
  });
};
