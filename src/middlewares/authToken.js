function authToken(req, res, next) {
  const token = process.env.API_TOKEN || "";
  const writeMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (!writeMethods.includes(req.method) || token === "") {
    return next();
  }

  const authorization = req.get("authorization") || "";
  const apiToken = req.get("x-api-token") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (bearer === token || apiToken === token) {
    return next();
  }

  return res.status(401).json({ ok: false, error: "Token de API invalido ou ausente." });
}

module.exports = authToken;
