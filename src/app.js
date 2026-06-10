require("dotenv").config();

const path = require("node:path");
const express = require("express");

const createApiRoutes = require("./routes/apiRoutes");
const authToken = require("./middlewares/authToken");
const errorHandler = require("./middlewares/errorHandler");
const requestLogger = require("./middlewares/requestLogger");
const configureSecurity = require("./middlewares/security");

function createApp({ repository }) {
  const app = express();

  configureSecurity(app);
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);
  app.use(authToken);
  app.get("/painel-logistico", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "portal.html"));
  });
  app.get("/painel-logistico/operador", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "operador.html"));
  });
  app.get("/painel-logistico/gestao", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "gestao.html"));
  });
  app.get("/painel-logistico/sala-situacao", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "sala-situacao.html"));
  });
  app.get("/painel-logistico/emergencias", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "emergencias.html"));
  });
  app.get("/painel-logistico/admin/infra", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "admin-infra.html"));
  });
  app.get("/sistema/saude", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "sistema-saude.html"));
  });
  app.get("/operador/sincronizacao", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "operador-sincronizacao.html"));
  });
  app.get(["/motorista", "/app-motorista"], (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "motorista", "index.html"));
  });
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use("/api", createApiRoutes({ repository }));
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
