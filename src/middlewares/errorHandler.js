function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const status = error.statusCode || error.status || 500;
  const message = status >= 500 ? "Erro ao processar requisicao." : error.message;

  if (status >= 500) {
    console.error("[API] Erro interno", error);
  }

  return res.status(status).json({
    ok: false,
    error: message
  });
}

module.exports = errorHandler;
