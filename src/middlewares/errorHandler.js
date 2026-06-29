// errorHandler middleware
module.exports = function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err && (err.stack || err));
  if (res.headersSent) return next(err);
  res.status(err && err.status ? err.status : 500).json({ erro: err && err.message ? err.message : 'Internal Server Error' });
};
