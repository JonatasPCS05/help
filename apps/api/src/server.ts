import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./lib/env";
import { authRouter } from "./routes/auth";
import { usuariosRouter } from "./routes/usuarios";
import { categoriasRouter } from "./routes/categorias";
import { solicitacoesRouter } from "./routes/solicitacoes";
import { orcamentosRouter } from "./routes/orcamentos";
import { pagamentosRouter } from "./routes/pagamentos";
import { avaliacoesRouter } from "./routes/avaliacoes";
import { cancelamentosRouter } from "./routes/cancelamentos";
import { notificacoesRouter } from "./routes/notificacoes";
import { chatRouter } from "./routes/chat";
import { adminRouter } from "./routes/admin";
import { stoneWebhookRouter } from "./webhooks/stone";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(cors());

// Webhooks precisam do corpo bruto/JSON antes de outros parsers específicos.
app.use("/webhooks", express.json(), stoneWebhookRouter);

app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRouter);
app.use("/usuarios", usuariosRouter);
app.use("/categorias", categoriasRouter);
app.use("/solicitacoes", solicitacoesRouter);
app.use("/orcamentos", orcamentosRouter);
app.use("/pagamentos", pagamentosRouter);
app.use("/avaliacoes", avaliacoesRouter);
app.use("/cancelamentos", cancelamentosRouter);
app.use("/notificacoes", notificacoesRouter);
app.use("/chat", chatRouter);
app.use("/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.API_PORT, () => {
  console.log(`Help API rodando em http://localhost:${env.API_PORT}`);
});
