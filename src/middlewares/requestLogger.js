const fs = require('fs');

// requestLogger middleware: try to use morgan if available, otherwise basic console logger
module.exports = function requestLogger(req, res, next) {
  try {
    // morgan integrates as middleware; if installed, prefer it (attempt dynamic require)
    if (!module.requestLoggerInitialized) {
      try {
        const morgan = require('morgan');
        module.requestLoggerInitialized = true;
        module.requestLogger = morgan('combined');
      } catch (e) {
        module.requestLoggerInitialized = true;
        module.requestLogger = null;
      }
    }
    if (module.requestLogger) return module.requestLogger(req, res, next);
  } catch (e) {
    // fallthrough to simple logger
  }
  console.log(`${req.method} ${req.originalUrl}`);
  next();
};
