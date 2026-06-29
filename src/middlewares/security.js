// configureSecurity: apply helmet/cors/compression when available
module.exports = function configureSecurity(app) {
  try {
    const helmet = require('helmet');
    app.use(helmet());
  } catch (e) {
    // helmet not available; skip
  }
  try {
    const cors = require('cors');
    // in production set origin explicitly
    app.use(cors());
  } catch (e) {
    // skip
  }
  try {
    const compression = require('compression');
    app.use(compression());
  } catch (e) {
    // skip
  }
};
