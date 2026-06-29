// authToken middleware stub
// In production this should validate a session cookie or a token. For now, it allows requests
// and exposes req.user when present. If header x-comando-senha is present, it maps to a basic user.

module.exports = function authToken(req, res, next) {
  try {
    const token = req.headers['x-comando-senha'] || req.headers['authorization'];
    if (token) {
      // Minimal mapping for local/dev usage
      req.user = {
        id: req.headers['x-usuario-id'] || 'local-admin',
        perfil: req.headers['x-perfil-usuario'] || 'administrador',
        token: String(token),
      };
    }
  } catch (e) {
    // ignore
  }
  return next();
};
