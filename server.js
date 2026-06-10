const createApp = require("./src/app");
const createRepository = require("./src/repositories/jsonRepository");

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const repository = createRepository();

repository.ensureDataFile();

const app = createApp({ repository });

app.listen(port, host, () => {
  console.log(`[API] Painel Logistico rodando em http://localhost:${port}`);
  console.log(`[API] Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log(`[API] Acesso na rede: ${process.env.PUBLIC_URL || `http://IP_DO_SERVIDOR:${port}`}`);
});
