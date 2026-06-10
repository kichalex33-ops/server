function requestLogger(req, res, next) {
  const startedAt = new Date().toISOString();
  res.on("finish", () => {
    console.log(`[API] ${startedAt} ${req.method} ${req.originalUrl} ${res.statusCode} ${req.ip}`);
  });
  next();
}

module.exports = requestLogger;
